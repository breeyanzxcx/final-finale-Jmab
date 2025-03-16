document.addEventListener("DOMContentLoaded", function () {
    fetchUserOrders();
});

async function fetchUserOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        window.location.href = "../HTML/sign-in.php";
        return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
        console.error("User ID not found");
        return;
    }

    try {
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
        console.log("API Response:", data);
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
    const currentPage = window.location.pathname.split('/').pop();
    const contentArea = document.querySelector('.content-area');
    
    if (!contentArea) {
        console.error("Content area not found");
        return;
    }
    
    console.log("All orders:", orders);

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
            filteredOrders = orders;
            break;
    }

    console.log("Filtered orders for", currentPage, ":", filteredOrders);

    const groupedOrders = {};
    filteredOrders.forEach(order => {
        if (!groupedOrders[order.reference_number]) {
            groupedOrders[order.reference_number] = [];
        }
        groupedOrders[order.reference_number].push(order);
    });

    contentArea.innerHTML = '';

    if (Object.keys(groupedOrders).length === 0) {
        contentArea.innerHTML = '<p>No items to display.</p>';
        return;
    }

    Object.entries(groupedOrders).forEach(([reference, orders]) => {
        const orderCard = createOrderCard(reference, orders);
        contentArea.appendChild(orderCard);
    });

    addButtonEventListeners();
}

function createOrderCard(reference, orders) {
    const firstOrder = orders[0];
    console.log('First order:', firstOrder); // Debugging line

    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    
    const totalItems = orders.reduce((sum, order) => sum + parseInt(order.quantity || 1), 0);
    const totalPrice = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
    
    const statusClass = firstOrder.status.toLowerCase().replace(/ /g, '-');
    orderCard.classList.add(statusClass);
    
    const orderHeader = document.createElement('div');
    orderHeader.className = 'order-header';
    orderHeader.innerHTML = `
        <div class="order-info">
            <span class="order-reference">Order #${reference}</span>
            <span class="order-status">${firstOrder.status}</span>
        </div>
        <div class="order-date">${formatDate(firstOrder.created_at)}</div>
    `;
    
    const orderContent = document.createElement('div');
    orderContent.className = 'order-content';
    
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
    
    const deliveryDetails = document.createElement('div');
    deliveryDetails.className = 'delivery-details';
    deliveryDetails.innerHTML = `
        <p><strong>Delivery Address:</strong> ${firstOrder.home_address}, ${firstOrder.barangay}, ${firstOrder.city}</p>
        <p><strong>Payment Method:</strong> ${firstOrder.payment_method.toUpperCase()}</p>
    `;
    orderContent.appendChild(deliveryDetails);
    
    const orderFooter = document.createElement('div');
    orderFooter.className = 'order-footer';
    orderFooter.innerHTML = `
        <div class="order-summary">
            <span>${totalItems} item(s)</span>
            <span>Total: ₱${totalPrice.toFixed(2)}</span>
        </div>
        <div class="order-actions">
            ${getOrderActions(firstOrder.status, firstOrder.order_id, firstOrder.payment_method, firstOrder.product_id)}
        </div>
    `;
    
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

function getOrderActions(status, orderId, paymentMethod, productId) {
    console.log('getOrderActions:', { status, orderId, paymentMethod, productId }); // Debugging line

    let actions = '';
    switch (status.toLowerCase()) {
        case 'pending':
            if (paymentMethod.toLowerCase() === 'cod') {
                actions = `<button class="action-btn cancel-btn" data-order-id="${orderId}">Cancel Order</button>`;
            } else {
                actions = `<button class="action-btn pay-btn" data-order-id="${orderId}">Pay Now</button>
                           <button class="action-btn cancel-btn" data-order-id="${orderId}">Cancel Order</button>`;
            }
            break;
        case 'processing':
            break;
        case 'out for delivery':
            actions = `<button class="action-btn receive-btn" data-order-id="${orderId}">Confirm Receipt</button>`;
            break;
        case 'delivered':
            actions = `<button class="action-btn rate-btn" data-order-id="${orderId}" data-user-id="${localStorage.getItem('userId')}" data-product-id="${productId}">Rate Product</button>`;
            break;
        case 'failed delivery':
            actions = `<button class="action-btn contact-btn" data-order-id="${orderId}">Contact Seller</button>`;
            break;
    }
    return actions;
}

function addButtonEventListeners() {
    document.querySelectorAll('.pay-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            window.location.href = `../HTML/payment.html?order=${orderId}`;
        });
    });
    
    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            if (confirm('Are you sure you want to cancel this order?')) {
                updateOrderStatus(orderId, 'cancelled');
            }
        });
    });
    
    document.querySelectorAll('.receive-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            if (confirm('Have you received this order?')) {
                updateOrderStatus(orderId, 'delivered');
            }
        });
    });
    
    document.querySelectorAll('.rate-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const userId = this.getAttribute('data-user-id');
            const productId = this.getAttribute('data-product-id');
            console.log('Rate button clicked:', { orderId, userId, productId });
            openRatingModal(orderId, userId, productId);
        });
    });
    
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
            fetchUserOrders();
        } else {
            alert(`Failed to update order: ${data.message}`);
        }
    } catch (error) {
        console.error("Error updating order:", error);
        alert("An error occurred while updating the order.");
    }
}

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

window.addEventListener('storage', function(event) {
    if (event.key === 'orderUpdated' && event.newValue === 'true') {
        fetchUserOrders();
        localStorage.removeItem('orderUpdated');
    }
});

if (!localStorage.getItem("userId")) {
    getUserId();
}