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
    console.log('First order:', firstOrder);

    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    
    const totalItems = orders.reduce((sum, order) => {
        const quantity = parseInt(order.quantity || 1);
        return sum + (isNaN(quantity) ? 1 : quantity);
    }, 0);

    const totalPrice = orders.reduce((sum, order) => {
        const price = parseFloat(order.variant_price || order.product_price || 0); // Support variant_price
        const quantity = parseInt(order.quantity || 1);
        return sum + (isNaN(price) ? 0 : price * (isNaN(quantity) ? 1 : quantity));
    }, 0);

    console.log('Total Items:', totalItems);
    console.log('Total Price:', totalPrice);
    
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
        const price = parseFloat(order.variant_price || order.product_price || 0); // Support variant_price
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <div class="product-image">
                <img src="${order.product_image || '../imahe/default-product.png'}" alt="${order.product_name}">
            </div>
            <div class="product-details">
                <h4>${order.product_name}</h4>
                <p>${order.product_brand}</p>
                <p>₱${price.toFixed(2)} x ${order.quantity || 1}</p>
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

function handleProductVariants(product) {
    const sizeSelect = document.getElementById('size');
    
    // Helper function to safely parse and format prices
    function formatPrice(priceValue) {
        const price = parseFloat(priceValue);
        return isNaN(price) ? '0.00' : price.toFixed(2);
    }
    
    if (product.variants && product.variants.length > 0) {
        sizeSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a variant';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        sizeSelect.appendChild(defaultOption);
        
        // Sort variants by price
        const sortedVariants = [...product.variants].sort((a, b) => {
            const priceA = parseFloat(a.price) || 0;
            const priceB = parseFloat(b.price) || 0;
            return priceA - priceB;
        });
        
        // Create options for each variant
        sortedVariants.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant.variant_id;
            
            // Safely parse price
            const price = parseFloat(variant.price) || 0;
            option.textContent = `${variant.size} - ₱${formatPrice(variant.price)}`;
            
            // Store data for later use
            option.dataset.price = price;
            option.dataset.stock = variant.stock || 0;
            option.dataset.size = variant.size || 'N/A';
            
            // Handle out of stock variants
            const stock = parseInt(variant.stock) || 0;
            option.disabled = stock <= 0;
            if (stock <= 0) option.textContent += ' (Out of Stock)';
            
            sizeSelect.appendChild(option);
        });
        
        // Handle variant selection change
        sizeSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const selectedPrice = parseFloat(selectedOption.dataset.price) || 0;
            const selectedStock = parseInt(selectedOption.dataset.stock) || 0;
            
            // Always use the formatPrice helper to avoid "Pnan"
            document.getElementById('product-price').textContent = `₱${formatPrice(selectedPrice)}`;
            
            // Update stock info
            const stockInfo = document.getElementById('stock-info') || document.createElement('p');
            stockInfo.id = 'stock-info';
            stockInfo.textContent = `Stock: ${selectedStock}`;
            if (!stockInfo.parentElement) {
                document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
            }
            
            // Update quantity input max value
            const qtyInput = document.querySelector('.qty-input');
            qtyInput.setAttribute('max', selectedStock);
            if (parseInt(qtyInput.value) > selectedStock) qtyInput.value = selectedStock;
            
            // Update button states
            const addToCartButton = document.querySelector('.add-to-cart');
            const buyNowButton = document.querySelector('.buy-now');
            
            if (selectedStock <= 0) {
                addToCartButton.disabled = true;
                addToCartButton.textContent = 'OUT OF STOCK';
                buyNowButton.disabled = true;
                buyNowButton.textContent = 'OUT OF STOCK';
            } else {
                addToCartButton.disabled = false;
                addToCartButton.textContent = 'Add to Cart';
                buyNowButton.disabled = false;
                buyNowButton.textContent = 'Buy Now';
            }
        });
        
        // Set initial price and stock from first available variant
        const firstInStock = sortedVariants.find(v => (parseInt(v.stock) || 0) > 0) || sortedVariants[0];
        if (firstInStock) {
            // Use formatPrice helper consistently
            document.getElementById('product-price').textContent = `₱${formatPrice(firstInStock.price)}`;
            
            const stockInfo = document.createElement('p');
            stockInfo.id = 'stock-info';
            stockInfo.textContent = `Stock: ${parseInt(firstInStock.stock) || 0}`;
            document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
        }
    } else {
        // Handle products without variants
        sizeSelect.innerHTML = '<option value="">N/A</option>';
        
        // Use formatPrice helper consistently
        document.getElementById('product-price').textContent = `₱${formatPrice(product.price)}`;
        
        const stockInfo = document.createElement('p');
        stockInfo.id = 'stock-info';
        stockInfo.textContent = `Stock: ${parseInt(product.stock) || 0}`;
        document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
        
        // Update button states
        const addToCartButton = document.querySelector('.add-to-cart');
        const buyNowButton = document.querySelector('.buy-now');
        const stock = parseInt(product.stock) || 0;
        if (stock <= 0) {
            addToCartButton.disabled = true;
            addToCartButton.textContent = 'OUT OF STOCK';
            buyNowButton.disabled = true;
            buyNowButton.textContent = 'OUT OF STOCK';
        }
    }
}