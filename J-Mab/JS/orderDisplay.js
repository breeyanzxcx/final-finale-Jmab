document.addEventListener("DOMContentLoaded", function () {
    fetchUserOrders();
});

async function fetchUserOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        window.location.href = "../HTML/sign-in.php";
        return;
    }

    // Get user ID from local storage or session storage
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
        console.error("User ID not found");
        return;
    }

    try {
        // Use the endpoint that works in Postman
        const response = await fetch(`http://localhost/jmab/final-jmab/api/orders/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // Log API response for debugging
        if (data.success) {
            displayUserOrders(data.orders);
        } else {
            console.error("Failed to fetch orders:", data.message);
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function displayUserOrders(orders) {
    // Get current page
    const currentPage = window.location.pathname.split('/').pop();
    const contentArea = document.querySelector('.content-area');
    
    if (!contentArea) {
        console.error("Content area not found");
        return;
    }
    
    // Log all orders for debugging
    console.log("All orders:", orders);

    // Filter orders based on current page
    let filteredOrders = [];
    switch (currentPage) {
        case 'toPay.html':
            filteredOrders = orders.filter(order => order.status.toLowerCase() === 'pending');
            break;
        case 'toShip.html':
            filteredOrders = orders.filter(order => order.status.toLowerCase() === 'processing');
            break;
        case 'toReceive.html':
            filteredOrders = orders.filter(order => order.status.toLowerCase() === 'out for delivery');
            break;
        case 'toRate.html':
            filteredOrders = orders.filter(order => order.status.toLowerCase() === 'delivered');
            break;
        case 'cancelled.html':
            filteredOrders = orders.filter(order => order.status.toLowerCase() === 'cancelled' || order.status.toLowerCase() === 'failed delivery');
            break;
        case 'purchases.html':
            filteredOrders = orders; // All orders
            break;
    }

    // Log filtered orders for debugging
    console.log("Filtered orders for", currentPage, ":", filteredOrders);

    // Group orders by reference number
    const groupedOrders = {};
    filteredOrders.forEach(order => {
        if (!groupedOrders[order.reference_number]) {
            groupedOrders[order.reference_number] = [];
        }
        groupedOrders[order.reference_number].push(order);
    });

    // Clear previous content
    contentArea.innerHTML = '';

    // Display orders or show empty message
    if (Object.keys(groupedOrders).length === 0) {
        contentArea.innerHTML = '<p>No items to display.</p>';
        return;
    }

    // Render orders
    Object.entries(groupedOrders).forEach(([reference, orders]) => {
        const orderCard = createOrderCard(reference, orders);
        contentArea.appendChild(orderCard);
    });

    // Add event listeners for buttons
    addButtonEventListeners();
}

function createOrderCard(reference, orders) {
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    
    // Calculate total items and price
    const totalItems = orders.reduce((sum, order) => sum + parseInt(order.quantity || 1), 0);
    const totalPrice = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
    
    // Get the first order for status reference
    const firstOrder = orders[0];
    
    // Add status class to the order card (replace spaces with hyphens)
    const statusClass = firstOrder.status.toLowerCase().replace(/ /g, '-');
    orderCard.classList.add(statusClass);
    
    // Create the order header
    const orderHeader = document.createElement('div');
    orderHeader.className = 'order-header';
    orderHeader.innerHTML = `
        <div class="order-info">
            <span class="order-reference">Order #${reference}</span>
            <span class="order-status">${firstOrder.status}</span>
        </div>
        <div class="order-date">${formatDate(firstOrder.created_at)}</div>
    `;
    
    // Create the order content
    const orderContent = document.createElement('div');
    orderContent.className = 'order-content';
    
    // Add each product to the order content
    orders.forEach(order => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <div class="product-image">
                <img src="${order.product_image || '../imahe/default-product.png'}" alt="${order.product_name}">
            </div>
            <div class="product-details">
                <h4>${order.product_name}</h4>
                <p>${order.product_brand}</p>
                <p>₱${parseFloat(order.product_price).toFixed(2)} x ${order.quantity || 1}</p>
            </div>
        `;
        orderContent.appendChild(productItem);
    });
    
    // Create order delivery details
    const deliveryDetails = document.createElement('div');
    deliveryDetails.className = 'delivery-details';
    deliveryDetails.innerHTML = `
        <p><strong>Delivery Address:</strong> ${firstOrder.home_address}, ${firstOrder.barangay}, ${firstOrder.city}</p>
        <p><strong>Payment Method:</strong> ${firstOrder.payment_method.toUpperCase()}</p>
    `; // Removed payment status
    orderContent.appendChild(deliveryDetails);
    
    // Create the order footer
    const orderFooter = document.createElement('div');
    orderFooter.className = 'order-footer';
    orderFooter.innerHTML = `
        <div class="order-summary">
            <span>${totalItems} item(s)</span>
            <span>Total: ₱${totalPrice.toFixed(2)}</span>
        </div>
        <div class="order-actions">
            ${getOrderActions(firstOrder.status, firstOrder.order_id, firstOrder.payment_method)}
        </div>
    `;
    
    // Assemble the card
    orderCard.appendChild(orderHeader);
    orderCard.appendChild(orderContent);
    orderCard.appendChild(orderFooter);
    
    return orderCard;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}

function getOrderActions(status, orderId, paymentMethod) {
    let actions = '';
    
    switch (status.toLowerCase()) {
        case 'pending':
            // Only show Cancel button for COD orders in pending status
            if (paymentMethod.toLowerCase() === 'cod') {
                actions = `<button class="action-btn cancel-btn" data-order-id="${orderId}">Cancel Order</button>`;
            } else {
                actions = `<button class="action-btn pay-btn" data-order-id="${orderId}">Pay Now</button>
                           <button class="action-btn cancel-btn" data-order-id="${orderId}">Cancel Order</button>`;
            }
            break;
        case 'processing':
            // No actions for processing status
            break;
        case 'out for delivery':
            actions = `<button class="action-btn receive-btn" data-order-id="${orderId}">Confirm Receipt</button>`;
            break;
        case 'delivered':
            actions = `<button class="action-btn rate-btn" data-order-id="${orderId}">Rate Product</button>`;
            break;
        case 'failed delivery':
            actions = `<button class="action-btn contact-btn" data-order-id="${orderId}">Contact Seller</button>`;
            break;
    }
    
    return actions;
}

function addButtonEventListeners() {
    // Pay button
    document.querySelectorAll('.pay-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            window.location.href = `../HTML/payment.html?order=${orderId}`;
        });
    });
    
    // Cancel button
    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            if (confirm('Are you sure you want to cancel this order?')) {
                updateOrderStatus(orderId, 'cancelled');
            }
        });
    });
    
    // Receive button
    document.querySelectorAll('.receive-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            if (confirm('Have you received this order?')) {
                updateOrderStatus(orderId, 'delivered');
            }
        });
    });
    
    // Rate button
    document.querySelectorAll('.rate-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            window.location.href = `../HTML/rate-product.html?order=${orderId}`;
        });
    });
    
    // Contact button
    document.querySelectorAll('.contact-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            window.location.href = `../HTML/contact-seller.html?order=${orderId}`;
        });
    });
}

async function updateOrderStatus(orderId, newStatus) {
    const authToken = localStorage.getItem("authToken");

    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            alert(`Order status updated successfully!`);
            fetchUserOrders(); // Refresh the orders
        } else {
            alert(`Failed to update order: ${data.message}`);
        }
    } catch (error) {
        console.error("Error updating order:", error);
        alert("An error occurred while updating the order.");
    }
}

// Add a function to get user ID if it's not already stored
async function getUserId() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) return null;
    
    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/user", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.success && data.user && data.user.id) {
            localStorage.setItem("userId", data.user.id);
            return data.user.id;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

// Listen for order updates from admin panel
window.addEventListener('storage', function(event) {
    if (event.key === 'orderUpdated' && event.newValue === 'true') {
        fetchUserOrders(); // Refresh orders when admin updates status
        localStorage.removeItem('orderUpdated'); // Clear the flag
    }
});

// Check for userId or fetch it if not available
if (!localStorage.getItem("userId")) {
    getUserId();
}