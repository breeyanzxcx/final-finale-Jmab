document.addEventListener("DOMContentLoaded", async function () {
    await fetchUserRatings(); // Load ratings first
    await fetchUserOrders();  // Then load orders
    initializeCustomPopup();  // Initialize custom popup
});

let ratedVariants = new Set();
let userOrders = [];
let userRatings = [];

async function fetchUserRatings() {
    const authToken = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");
    if (!authToken || !userId) return;

    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/ratings/userRated/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            console.error(`Ratings fetch failed. Status: ${response.status}, StatusText: ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log("User Ratings Response:", data);
        
        if (data.success && Array.isArray(data.items)) {
            userRatings = data.items;
            data.items.forEach(rating => {
                if (rating.rating_status === "Rated") {
                    ratedVariants.add(String(rating.variant_id));
                    localStorage.setItem(`rated_order_${rating.order_id}`, 'true');
                } else {
                    localStorage.removeItem(`rated_order_${rating.order_id}`); // Ensure unrated orders are cleared
                }
            });
        }
    } catch (error) {
        console.error("Error fetching user ratings:", error);
    }
}

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
        console.log("API Response (Orders):", data);
        if (data.success) {
            userOrders = data.orders;
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
            filteredOrders = orders.filter(order => {
                const ratingInfo = userRatings.find(r => r.order_id === order.order_id && String(r.variant_id) === String(order.variant_id));
                const isRated = ratingInfo ? ratingInfo.rating_status === "Rated" : false;
                console.log(`Order ${order.order_id} - Status: ${order.status}, Rated: ${isRated}, Rating Info:`, ratingInfo);
                return order.status.toLowerCase() === 'delivered' && !isRated;
            });
            break;
        case 'cancelled.html':
            filteredOrders = orders.filter(order => order.status.toLowerCase() === 'cancelled' || order.status.toLowerCase() === 'failed delivery');
            break;
        case 'purchases.html':
            filteredOrders = orders.filter(order => {
                const ratingInfo = userRatings.find(r => r.order_id === order.order_id && String(r.variant_id) === String(order.variant_id));
                const isRated = ratingInfo ? ratingInfo.rating_status === "Rated" : false;
                return order.status.toLowerCase() !== 'delivered' || isRated;
            });
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
        const price = parseFloat(order.variant_price || order.product_price || 0);
        const quantity = parseInt(order.quantity || 1);
        return sum + (isNaN(price) ? 0 : price * (isNaN(quantity) ? 1 : quantity));
    }, 0);

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
        const price = parseFloat(order.variant_price || order.product_price || 0);
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        
        const ratingInfo = userRatings.find(r => 
            String(r.variant_id) === String(order.variant_id) && 
            r.order_id === order.order_id
        );
        console.log('Checking rating for:', {
            variantId: order.variant_id,
            orderId: order.order_id,
            ratingInfo: ratingInfo
        });

        let ratingStars = '';
        if (window.location.pathname.split('/').pop() === 'purchases.html' && ratingInfo && ratingInfo.rating_status === "Rated") {
            ratingStars = `<div class="user-rating">${generateStars(ratingInfo.rating)}</div>`;
        }
        
        productItem.innerHTML = `
            <div class="product-image">
                <img src="${order.product_image || '../imahe/default-product.png'}" alt="${order.product_name}">
            </div>
            <div class="product-details">
                <h4>${order.product_name}</h4>
                <p>${order.product_brand}</p>
                <p>₱${price.toFixed(2)} x ${order.quantity || 1}</p>
                ${ratingStars}
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
            ${getOrderActions(firstOrder.status, firstOrder.order_id, firstOrder.payment_method, firstOrder.variant_id || firstOrder.product_id, reference)}
        </div>
    `;
    
    orderCard.appendChild(orderHeader);
    orderCard.appendChild(orderContent);
    orderCard.appendChild(orderFooter);
    
    return orderCard;
}

function generateStars(rating) {
    const maxStars = 5;
    let stars = '';
    for (let i = 1; i <= maxStars; i++) {
        stars += `<span class="star ${i <= rating ? 'selected' : ''}">★</span>`;
    }
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}

function getOrderActions(status, orderId, paymentMethod, id, referenceNumber) {
    console.log('getOrderActions:', { status, orderId, paymentMethod, id, referenceNumber });
    let actions = '';
    const userId = localStorage.getItem("userId");
    const ratingInfo = userRatings.find(r => r.order_id === orderId && String(r.variant_id) === String(id));
    const isRated = ratingInfo ? ratingInfo.rating_status === "Rated" : false;
    console.log(`Order ${orderId} - isRated: ${isRated}, Rating Info:`, ratingInfo);

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
            actions = `<button class="action-btn view-receipt-btn" data-reference="${referenceNumber}">View Receipt</button>`;
            if (!isRated && id && id !== 'undefined') {
                actions += `<button class="action-btn rate-btn" data-order-id="${orderId}" data-user-id="${userId}" data-variant-id="${id}">Rate Product</button>`;
            }
            break;
        case 'failed delivery':
            actions = `<button class="action-btn contact-btn" data-order-id="${orderId}">Contact Seller</button>`;
            break;
    }
    return actions;
}

function initializeCustomPopup() {
    // Custom Alert Popup
    const alertPopup = document.createElement('div');
    alertPopup.id = 'customAlertPopup';
    alertPopup.className = 'popup';
    alertPopup.innerHTML = `
        <div class="popup-content">
            <h3>Notification</h3>
            <p id="customAlertMessage"></p>
            <div class="popup-buttons">
                <button id="customAlertOk" class="popup-btn confirm">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(alertPopup);

    const alertOkButton = document.getElementById('customAlertOk');
    alertOkButton.addEventListener('click', () => {
        alertPopup.style.display = 'none';
    });

    // Override default alert
    window.alert = function(message) {
        const alertMessage = document.getElementById('customAlertMessage');
        alertMessage.textContent = message;
        alertPopup.style.display = 'flex';
    };

    // Custom Confirm Popup
    const confirmPopup = document.createElement('div');
    confirmPopup.id = 'customConfirmPopup';
    confirmPopup.className = 'popup';
    confirmPopup.innerHTML = `
        <div class="popup-content">
            <h3>Confirmation</h3>
            <p id="customConfirmMessage"></p>
            <div class="popup-buttons">
                <button id="customConfirmYes" class="popup-btn confirm">Yes</button>
                <button id="customConfirmNo" class="popup-btn cancel">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmPopup);

    // Handle confirm responses
    window.customConfirm = function(message, callback) {
        const confirmMessage = document.getElementById('customConfirmMessage');
        confirmMessage.textContent = message;
        confirmPopup.style.display = 'flex';

        const yesButton = document.getElementById('customConfirmYes');
        const noButton = document.getElementById('customConfirmNo');

        const handleResponse = (response) => {
            confirmPopup.style.display = 'none';
            callback(response);
            yesButton.removeEventListener('click', yesHandler);
            noButton.removeEventListener('click', noHandler);
        };

        const yesHandler = () => handleResponse(true);
        const noHandler = () => handleResponse(false);

        yesButton.addEventListener('click', yesHandler);
        noButton.addEventListener('click', noHandler);
    };
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
            openCancelOrderModal(orderId);
        });
    });
    
    document.querySelectorAll('.receive-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            customConfirm('Have you received this order?', (confirmed) => {
                if (confirmed) {
                    updateOrderStatus(orderId, 'delivered');
                }
            });
        });
    });
    
    document.querySelectorAll('.rate-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const userId = this.getAttribute('data-user-id');
            const variantId = this.getAttribute('data-variant-id');
            console.log('Rate button clicked:', { orderId, userId, variantId });
            openRatingModal(orderId, userId, variantId, async () => {
                button.textContent = 'Product Rated';
                button.disabled = true;
                ratedVariants.add(String(variantId));
                localStorage.setItem(`rated_order_${orderId}`, 'true');
                await fetchUserRatings(); // Refresh ratings
                await fetchUserOrders();  // Refresh orders
                if (window.location.pathname.split('/').pop() === 'toRate.html') {
                    window.location.href = '../HTML/purchases.html'; // Redirect to purchases.html
                }
            });
        });
    });

    document.querySelectorAll('.view-receipt-btn').forEach(button => {
        button.addEventListener('click', function() {
            const referenceNumber = this.getAttribute('data-reference');
            fetchAndDisplayReceipt(referenceNumber);
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
            await fetchUserRatings(); // Sync ratings
            await fetchUserOrders();  // Sync orders
            window.location.href = '../HTML/toRate.html'; // Redirect to toRate.html
        } else {
            alert(`Failed to update order: ${data.message}`);
        }
    } catch (error) {
        console.error("Error updating order:", error);
        alert("An error occurred while updating the order.");
    }
}

async function fetchAndDisplayReceipt(referenceNumber) {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        alert("Please log in to view your receipt.");
        return;
    }

    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/receipts`, {
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
        console.log("Receipts Response:", data);

        const receipt = data.find(r => r.order_reference === referenceNumber);
        if (!receipt) {
            alert("Receipt not found for this order.");
            return;
        }

        const orderGroup = userOrders.filter(o => o.reference_number === referenceNumber);
        displayReceiptModal(receipt, orderGroup);
    } catch (error) {
        console.error("Error fetching receipt:", error);
        alert("An error occurred while fetching the receipt.");
    }
}

function displayReceiptModal(receipt, orderGroup) {
    const itemsWithDetails = receipt.items.map((item, index) => {
        const order = orderGroup[index] || orderGroup[0];
        const productName = order?.product_name || "Unknown Product";
        const variant = order?.variant_price ? `Variant (Price: ₱${parseFloat(order.variant_price).toFixed(2)})` : "";
        return { ...item, productName, variant };
    });

    const modal = document.createElement('div');
    modal.className = 'receipt-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>RECEIPT</h2>
            <p class="order-ref">${receipt.order_reference}</p>
            <div class="section">
                <h3>Bill to:</h3>
                <p>${receipt.bill_to.name}</p>
                <p>${receipt.bill_to.address}</p>
            </div>
            <div class="section">
                <h3>Ship to:</h3>
                <p>${receipt.ship_to.name}</p>
                <p>${receipt.ship_to.address}</p>
            </div>
            <div class="section">
                <h3>Payment Details:</h3>
                <p>Payment Method: ${receipt.payment_method.toUpperCase()}</p>
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>ITEM</th>
                        <th>Quantity</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsWithDetails.map(item => `
                        <tr>
                            <td>${item.productName}${item.variant ? ` - ${item.variant}` : ''}</td>
                            <td>${item.quantity}</td>
                            <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p class="total">TOTAL: ₱${parseFloat(receipt.total_amount).toFixed(2)}</p>
            <div class="modal-actions">
                <button id="close-receipt-modal">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#close-receipt-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

function openRatingModal(orderId, userId, variantId, callback) {
    console.log('Opening rating modal with:', { orderId, userId, variantId });
    if (!variantId || variantId === 'undefined') {
        alert("Error: Cannot rate this product due to missing variant ID.");
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'rating-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Rate Product</h2>
            <p>Please rate this product (1-5 stars):</p>
            <div class="star-rating">
                <span class="star" data-value="1">★</span>
                <span class="star" data-value="2">★</span>
                <span class="star" data-value="3">★</span>
                <span class="star" data-value="4">★</span>
                <span class="star" data-value="5">★</span>
            </div>
            <div class="modal-actions">
                <button id="submit-rating" disabled>Submit Rating</button>
                <button id="close-rating-modal">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let selectedRating = 0;
    const stars = modal.querySelectorAll('.star');
    const submitButton = modal.querySelector('#submit-rating');
    const closeButton = modal.querySelector('#close-rating-modal');

    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-value'));
            stars.forEach(s => s.classList.remove('selected'));
            for (let i = 0; i < selectedRating; i++) {
                stars[i].classList.add('selected');
            }
            submitButton.disabled = false;
        });
    });

    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    submitButton.addEventListener('click', async () => {
        if (selectedRating === 0) {
            alert("Please select a rating.");
            return;
        }

        const authToken = localStorage.getItem("authToken");
        console.log('Submitting rating with:', { variantId, userId, rating: selectedRating });

        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/ratings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    variant_id: variantId,
                    user_id: userId,
                    rating: selectedRating
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                alert("Rating submitted successfully!");
                document.body.removeChild(modal);
                if (callback) callback();
            } else {
                alert(`Failed to submit rating: ${data.errors.join(', ')}`);
            }
        } catch (error) {
            console.error("Error submitting rating:", error);
            alert("An error occurred while submitting the rating.");
        }
    });
}

function openCancelOrderModal(orderId) {
    const modal = document.createElement('div');
    modal.className = 'cancel-order-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Cancel Order</h2>
            <p>Please select a reason for cancellation:</p>
            <select id="cancellation-reason" class="form-control">
                <option value="" disabled selected>Select a reason</option>
                <option value="changed_mind">I changed my mind</option>
                <option value="found_cheaper">Found a cheaper alternative</option>
                <option value="delivery_too_long">Delivery is taking too long</option>
                <option value="incorrect_item">Incorrect item in cart</option>
                <option value="pricing_error">Pricing error</option>
                <option value="duplicate_order">Duplicate order</option>
            </select>
            <div class="modal-actions">
                <button id="submit-cancel" disabled>Confirm Cancellation</button>
                <button id="close-cancel-modal">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const reasonSelect = modal.querySelector('#cancellation-reason');
    const submitButton = modal.querySelector('#submit-cancel');
    const closeButton = modal.querySelector('#close-cancel-modal');

    reasonSelect.addEventListener('change', function() {
        submitButton.disabled = !this.value;
        if (this.value) {
            reasonSelect.querySelector('option[value=""]').disabled = true;
        }
    });

    function closeModal() {
        document.body.removeChild(modal);
    }

    closeButton.addEventListener('click', closeModal);

    submitButton.addEventListener('click', async function() {
        const reason = reasonSelect.value;

        if (!reason) {
            alert("Please select a cancellation reason.");
            return;
        }

        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify({ 
                    status: 'cancelled',
                    cancellation_reason: reason
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                const notificationSent = await sendAdminNotification(orderId, reason);
                alert('Order cancelled successfully' + 
                      (notificationSent ? ' and admin notified.' : '.'));
                closeModal();
                fetchUserOrders();
            } else {
                alert(`Failed to cancel order: ${data.message}`);
            }
        } catch (error) {
            console.error("Error cancelling order:", error);
            alert("An error occurred while cancelling the order.");
        }
    });
}

async function sendAdminNotification(orderId, cancellationReason) {
    const authToken = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");

    if (!authToken || !userId) return false;

    const payload = {
        recipient_type: "admin",
        user_id: 1, 
        title: "Order Cancelled",
        message: `Order #${orderId} has been cancelled by a customer. Reason: ${getLocalizedCancellationReason(cancellationReason)}`,
        type: "order_cancellation",
        additional_data: {
            order_id: parseInt(orderId),
            customer_user_id: parseInt(userId),
            cancellation_reason: cancellationReason
        }
    };

    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("Error sending admin notification:", error);
        return false;
    }
}

function getLocalizedCancellationReason(reason) {
    const reasons = {
        'changed_mind': 'Changed mind',
        'found_cheaper': 'Found cheaper alternative',
        'incorrect_item': 'Incorrect item',
        'pricing_error': 'Pricing error',
        'duplicate_order': 'Duplicate order'
    };
    return reasons[reason] || reason;
}

const styles = `
<style>
.action-btn {
    padding: 8px 15px;
    margin: 5px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.1s;
}

.view-receipt-btn, .rate-btn {
    background-color: #007bff;
    color: white;
    border: 1px solid #0069d9;
}

.view-receipt-btn:hover, .rate-btn:hover {
    background-color: #0069d9;
    transform: scale(1.05);
}

.rate-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.receipt-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.receipt-modal .modal-content {
    background: #ffffff;
    padding: 35px;
    border-radius: 10px;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.receipt-modal h2 {
    margin: 0 0 15px;
    font-size: 26px;
    color: #333;
    text-align: center;
    text-transform: uppercase;
}

.receipt-modal .order-ref {
    font-size: 18px;
    color: #444;
    text-align: center;
    margin-bottom: 20px;
}

.receipt-modal .section {
    margin-bottom: 20px;
}

.receipt-modal h3 {
    margin: 0 0 10px;
    font-size: 20px;
    color: #555;
}

.receipt-modal p {
    margin: 5px 0;
    font-size: 16px;
    color: #444;
    line-height: 1.6;
}

.receipt-modal .items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

.receipt-modal .items-table th,
.receipt-modal .items-table td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
}

.receipt-modal .items-table th {
    background: #f1f1f1;
    font-size: 16px;
    color: #333;
    text-transform: uppercase;
}

.receipt-modal .items-table td {
    font-size: 15px;
    color: #444;
}

.receipt-modal .total {
    font-size: 18px;
    font-weight: 600;
    color: #222;
    text-align: right;
    margin-top: 15px;
}

.receipt-modal .modal-actions {
    margin-top: 30px;
    text-align: right;
}

.receipt-modal button {
    padding: 12px 25px;
    border: none;
    border-radius: 5px;
    background-color: #007bff;
    color: white;
    font-size: 15px;
    cursor: pointer;
}

.rating-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.rating-modal .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.rating-modal h2 {
    margin: 0 0 15px;
    font-size: 24px;
    color: #333;
    text-align: center;
}

.rating-modal p {
    margin: 0 0 15px;
    font-size: 16px;
    color: #444;
}

.rating-modal .star-rating {
    text-align: center;
    margin-bottom: 20px;
}

.rating-modal .star {
    font-size: 30px;
    color: #ddd;
    cursor: pointer;
    margin: 0 5px;
}

.rating-modal .star.selected {
    color: #f5c518;
}

.rating-modal .modal-actions {
    display: flex;
    justify-content: space-between;
}

.rating-modal button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;
}

.rating-modal #submit-rating {
    background-color: #28a745;
    color: white;
}

.rating-modal #submit-rating:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.rating-modal #close-rating-modal {
    background-color: #f8f9fa;
    border: 1px solid #ddd;
}

.cancel-order-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.cancel-order-modal .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cancel-order-modal select {
    width: 100%;
    margin: 10px 0;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.cancel-order-modal .modal-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
}

.cancel-order-modal button {
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.cancel-order-modal #submit-cancel {
    background-color: #dc3545;
    color: white;
}

.cancel-order-modal #submit-cancel:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.cancel-order-modal #close-cancel-modal {
    background-color: #f8f9fa;
    border: 1px solid #ddd;
}

.user-rating {
    margin-top: 5px;
}

.user-rating .star {
    font-size: 16px;
    color: #ddd;
    margin: 0 2px;
}

.user-rating .star.selected {
    color: #f5c518;
}

/* Custom Popup Styles */
.popup {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 2000;
    justify-content: center;
    align-items: center;
}

.popup-content {
    background: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    width: 350px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    animation: fadeIn 0.3s ease-out;
}

.popup-content h3 {
    color: #02254b;
    margin-bottom: 15px;
    font-size: 24px;
}

.popup-content p {
    color: #666;
    margin-bottom: 20px;
    font-size: 16px;
}

.popup-buttons {
    display: flex;
    justify-content: space-around;
}

.popup-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.popup-btn.confirm {
    background-color: #02254b;
    color: #FFFFFF;
}

.popup-btn.confirm:hover {
    background-color: #0147A1;
}

.popup-btn.cancel {
    background-color: #FF0000;
    color: #FFFFFF;
}

.popup-btn.cancel:hover {
    background-color: #CC0000;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);