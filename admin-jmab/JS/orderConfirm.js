let currentOrderId = null;
let currentNewStatus = null;
let currentUserId = null;
let currentReferenceNumber = null;
let currentProductDetails = null;
let groupedOrders = {};

function showConfirmationModal(message, orderId, newStatus, userId, referenceNumber, productDetails) {
    const confirmationModal = document.getElementById("confirmationModal");
    const confirmationMessage = document.getElementById("confirmationMessage");

    if (confirmationModal && confirmationMessage) {
        console.log("Showing confirmation modal with:", { message, orderId, newStatus, userId, referenceNumber, productDetails });
        confirmationMessage.textContent = message;
        currentOrderId = orderId;
        currentNewStatus = newStatus;
        currentUserId = userId;
        currentReferenceNumber = referenceNumber;
        currentProductDetails = productDetails;
        confirmationModal.style.display = "flex";
    } else {
        console.error("Confirmation modal or message element not found.");
    }
}

function hideConfirmationModal() {
    const confirmationModal = document.getElementById("confirmationModal");
    if (confirmationModal) {
        confirmationModal.style.display = "none";
    } else {
        console.error("Confirmation modal element not found.");
    }
}

// Custom Modal Functions
function showCustomModal(title, message, onConfirm = null) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    const modalClose = document.querySelector('.modal-close');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.style.display = 'flex';

    // If no confirmation callback, hide Cancel button and make Confirm close the modal
    if (!onConfirm) {
        modalCancel.style.display = 'none';
        modalConfirm.textContent = 'OK';
        const newConfirmBtn = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);
        document.getElementById('modalConfirm').addEventListener('click', hideCustomModal);
    } else {
        modalCancel.style.display = 'inline-block';
        modalConfirm.textContent = 'Confirm';
        const newConfirmBtn = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);
        document.getElementById('modalConfirm').addEventListener('click', function() {
            onConfirm();
            hideCustomModal();
        });
    }

    modalCancel.addEventListener('click', hideCustomModal);
    modalClose.addEventListener('click', hideCustomModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) hideCustomModal();
    });
}

function hideCustomModal() {
    const modal = document.getElementById('customModal');
    modal.style.display = 'none';
}

// Event listeners for confirmation buttons
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

if (confirmYes) {
    confirmYes.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("Confirm Yes clicked with:", { currentOrderId, currentNewStatus, currentUserId, currentReferenceNumber, currentProductDetails });
        if (currentOrderId && currentNewStatus && currentUserId) {
            hideConfirmationModal();
            if (currentNewStatus === "cancelled" || currentNewStatus === "failed delivery") {
                showReasonsModal(
                    currentOrderId,
                    currentNewStatus,
                    currentUserId,
                    currentReferenceNumber,
                    currentProductDetails
                );
            } else {
                updateOrderStatus(
                    currentOrderId,
                    currentNewStatus,
                    currentUserId,
                    currentReferenceNumber,
                    currentProductDetails
                );
            }
            currentOrderId = null;
            currentNewStatus = null;
            currentUserId = null;
            currentReferenceNumber = null;
            currentProductDetails = null;
        } else {
            console.warn("Confirmation attempted without valid order data.");
            showCustomModal('Error', 'Order data is missing. Please try again.');
        }
    });
}

if (confirmNo) {
    confirmNo.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("Confirm No clicked");
        hideConfirmationModal();
    });
}

function showReasonsModal(orderId, newStatus, userId, referenceNumber, productDetails) {
    const reasonsModal = document.getElementById("reasonsModal");
    const reasonsForm = document.getElementById("reasonsForm");
    const reasonsSubmit = document.getElementById("reasonsSubmit");

    if (!reasonsModal || !reasonsForm || !reasonsSubmit) {
        console.error("Reasons modal elements not found.");
        return;
    }

    reasonsForm.innerHTML = "";

    let reasons = [];
    if (newStatus === "failed delivery") {
        reasons = [
            "Address not found",
            "Customer not available",
            "Incomplete/incorrect address",
            "Access issues (gated community, etc.)",
            "Delivery attempted outside business hours"
        ];
    } else if (newStatus === "cancelled") {
        reasons = [
            "Customer request",
            "Out of stock",
            "Pricing discrepancy",
            "Incorrect product ordered",
            "Duplicate order",
            "Changed mind",
            "Found better alternative"
        ];
    }

    reasons.forEach((reason, index) => {
        const reasonDiv = document.createElement("div");
        reasonDiv.className = "reason-option";

        const radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.id = `reason-${index}`;
        radioInput.name = "cancelOrFailReason";
        radioInput.value = reason;

        const label = document.createElement("label");
        label.htmlFor = `reason-${index}`;
        label.textContent = reason;

        reasonDiv.appendChild(radioInput);
        reasonDiv.appendChild(label);
        reasonsForm.appendChild(reasonDiv);

        radioInput.addEventListener("change", function() {
            reasonsSubmit.disabled = false;
        });
    });

    reasonsModal.style.display = "flex";
    reasonsSubmit.disabled = true;

    reasonsSubmit.onclick = function() {
        const selectedReason = document.querySelector('input[name="cancelOrFailReason"]:checked');

        if (!selectedReason) {
            showCustomModal('Validation Error', 'Please select a reason.');
            return;
        }

        const fullReason = selectedReason.value;
        reasonsModal.style.display = "none";

        updateOrderStatus(orderId, newStatus, userId, referenceNumber, productDetails, fullReason);
    };
}

document.addEventListener("DOMContentLoaded", function () {
    const confirmationModal = document.getElementById("confirmationModal");
    const reasonsModal = document.getElementById("reasonsModal");
    if (confirmationModal) confirmationModal.style.display = "none";
    if (reasonsModal) reasonsModal.style.display = "none";

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        showCustomModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        );
        return;
    }

    fetchOrders();

    document.getElementById("logout").addEventListener("click", function (e) {
        e.preventDefault();
        showCustomModal('Logout Confirmation', 'Are you sure you want to log out?', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        );
    });

    const nameInput = document.getElementById("name");
    const modelInput = document.getElementById("model");

    if (nameInput && modelInput) {
        nameInput.addEventListener("input", function () {
            modelInput.value = nameInput.value;
        });
    }

    const createProductForm = document.getElementById("createProductForm");
    if (createProductForm) {
        createProductForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const productData = {
                name: nameInput.value,
                model: modelInput.value,
                description: document.getElementById("description").value,
                category: document.getElementById("category").value,
                image_url: document.getElementById("image_url").value,
                brand: document.getElementById("brand").value,
            };

            try {
                const response = await fetch("http://localhost/jmab/final-jmab/api/products", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify(productData),
                });

                const data = await response.json();
                if (data.success) {
                    console.log("Product created:", data);
                    showCustomModal('Success', 'Product added successfully!');
                    createProductForm.reset();
                } else {
                    console.error("Failed to create product:", data.message);
                    showCustomModal('Error', 'Failed to add product: ' + data.message);
                }
            } catch (error) {
                console.error("Error creating product:", error);
                showCustomModal('Error', 'An error occurred while creating the product.');
            }
        });
    }
});

async function fetchOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        showCustomModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        );
        return;
    }

    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/orders", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);
        if (data.success) {
            displayOrders(data.orders);
        } else {
            console.error("Failed to fetch orders:", data.message);
            showCustomModal('Error', 'Failed to fetch orders: ' + data.message);
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
        showCustomModal('Error', 'An error occurred while fetching orders: ' + error.message);
    }
}

function displayOrders(orders) {
    const ordersTableBody = document.getElementById("orders-table-body");

    if (!ordersTableBody) {
        console.error("Error: 'orders-table-body' not found in the DOM.");
        return;
    }

    ordersTableBody.innerHTML = "";
    groupedOrders = {};

    orders.forEach((order) => {
        if (!groupedOrders[order.reference_number]) {
            console.log("Processing order:", order);

            let productDetails = order.product_details || { name: "N/A", model: "N/A", quantity: 0 };
            if (typeof order.product_details === "string") {
                productDetails = parseProductDetailsString(order.product_details);
            }

            groupedOrders[order.reference_number] = {
                user_id: order.user_id,
                first_name: order.first_name,
                last_name: order.last_name,
                total_price: parseFloat(order.total_price) || 0,
                payment_method: order.payment_method,
                status: order.status,
                product_details: productDetails,
                order_id: order.order_id,
                reference_number: order.reference_number,
            };
        }
    });

    Object.entries(groupedOrders).forEach(([reference_number, order]) => {
        const row = document.createElement("tr");

        let statusClass;
        switch (order.status.toLowerCase()) {
            case "pending": statusClass = "status-pending"; break;
            case "cancelled": statusClass = "status-cancelled"; break;
            case "out for delivery": statusClass = "status-out-for-delivery"; break;
            case "delivered": statusClass = "status-delivered"; break;
            case "failed delivery": statusClass = "status-failed"; break;
            default: statusClass = "status-default"; break;
        }

        let formattedProductDetails = "N/A";
        if (order.product_details) {
            if (typeof order.product_details === "string") {
                formattedProductDetails = order.product_details;
            } else if (typeof order.product_details === "object") {
                const details = order.product_details;
                const productName = details.name || "N/A";
                const productQuantity = details.quantity !== undefined ? details.quantity : 0;
                formattedProductDetails = `${productName} (${productQuantity})`;
            }
        }

        row.innerHTML = `
            <td>${reference_number}</td>
            <td>${order.first_name} ${order.last_name}</td>
            <td>₱${formatPrice(order.total_price)}</td>
            <td>${order.payment_method.toUpperCase()}</td>
            <td>${formattedProductDetails}</td>
            <td><span class="status-label ${statusClass}">${order.status}</span></td>
            <td>
                ${getStatusActions(order.status, order.order_id, order.user_id, reference_number, formattedProductDetails)}
            </td>
        `;

        ordersTableBody.appendChild(row);
    });
}

function parseProductDetailsString(detailsString) {
    if (!detailsString) return { name: "N/A", model: "N/A", quantity: 0 };

    const items = detailsString.split(", ");
    let formattedDetails = "";

    items.forEach((item, index) => {
        const match = item.match(/(.*) - (.*) - (.*) \(x(\d+)\)/);
        if (match) {
            const [, name, , variant, quantity] = match;
            formattedDetails += `${name} - ${variant} (${quantity})`;
        } else {
            formattedDetails += item;
        }
        if (index < items.length - 1) formattedDetails += ", ";
    });

    return formattedDetails;
}

function getStatusActions(status, orderId, userId, referenceNumber, productDetails) {
    let actions = "";
    const escapedProductDetails = productDetails.replace(/'/g, "\\'");

    if (status === "pending") {
        actions = `
            <button class="accept-btn" onclick="console.log('Accept clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to accept this order?', ${orderId}, 'processing', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Accept</button>
            <button class="decline-btn" onclick="console.log('Decline clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Decline</button>
        `;
    } else if (status === "processing") {
        actions = `
            <button class="out-for-delivery-btn" onclick="console.log('Out for Delivery clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Out for Delivery</button>
        `;
    } else if (status === "out for delivery") {
        actions = `
            <button class="delivered-btn" onclick="console.log('Delivered clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to mark this order as Delivered?', ${orderId}, 'delivered', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Delivered</button>
            <button class="didnt-receive-btn" onclick="console.log('Didn\\'t Receive clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to mark this order as Failed Delivery?', ${orderId}, 'failed delivery', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Didn\'t Receive</button>
        `;
    } else if (status === "failed delivery") {
        actions = `
            <button class="retry-delivery-btn" onclick="console.log('Retry Delivery clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Out for Delivery Again</button>
            <button class="cancel-btn" onclick="console.log('Cancel clicked for order ${orderId}'); showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled', ${userId}, '${referenceNumber}', '${escapedProductDetails}')">Cancel</button>
        `;
    } else if (status === "cancelled" || status === "delivered") {
        actions = `<span>No actions</span>`;
    }

    return actions;
}

function formatPrice(price) {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString('en-PH', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function updateOrderStatus(orderId, newStatus, userId, referenceNumber, productDetails, reason = null) {
    const authToken = localStorage.getItem("authToken");

    console.log("Updating order status:", { orderId, newStatus, userId, referenceNumber, productDetails, reason });

    try {
        const updateResponse = await fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ 
                status: newStatus,
                reason: reason
            }),
        });

        const updateData = await updateResponse.json();
        console.log("Update response:", updateData);

        if (updateData.success) {
            let notificationTitle;
            switch (newStatus.toLowerCase()) {
                case "processing": notificationTitle = "Order Accepted"; break;
                case "out for delivery": notificationTitle = "Order Out for Delivery"; break;
                case "delivered": notificationTitle = "Order Delivered"; break;
                case "failed delivery": notificationTitle = "Order Delivery Failed"; break;
                case "cancelled": notificationTitle = "Order Cancelled"; break;
                default: notificationTitle = "Order Status Update"; break;
            }

            const notificationData = {
                user_id: userId,
                title: notificationTitle,
                message: `Your order (Ref: ${referenceNumber}) has been ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`
            };

            const notificationResponse = await fetch("http://localhost/jmab/final-jmab/api/notifications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(notificationData),
            });

            const notificationResult = await notificationResponse.json();
            console.log("Notification response:", notificationResult);

            if (notificationResult.success) {
                console.log(`Notification sent to user ${userId} for order ${orderId}: ${notificationTitle}`);
            } else {
                console.error("Failed to send notification:", notificationResult.message);
            }

            if (newStatus.toLowerCase() === "delivered") {
                const order = groupedOrders[referenceNumber];
                if (!order) {
                    console.error("Order not found in groupedOrders:", referenceNumber);
                    showCustomModal('Warning', 'Order updated, but receipt could not be generated due to missing order data.');
                } else {
                    const receiptData = {
                        order_id: orderId,
                        user_id: userId,
                        order_reference: referenceNumber,
                        total_amount: order.total_price,
                        payment_method: order.payment_method,
                        payment_status: "completed"
                    };

                    const receiptResponse = await fetch("http://localhost/jmab/final-jmab/api/receipts/order", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${authToken}`,
                        },
                        body: JSON.stringify(receiptData),
                    });

                    const receiptResult = await receiptResponse.json();
                    console.log("Receipt response:", receiptResult);

                    if (receiptResult.success) {
                        console.log(`Receipt created for order ${orderId}`);
                    } else {
                        console.error("Failed to create receipt:", receiptResult.message);
                        showCustomModal('Warning', `Order updated, but failed to create receipt: ${receiptResult.message}`);
                    }
                }
            }

            showCustomModal('Success', `Order ${orderId} updated to ${newStatus}`);
            fetchOrders();
            localStorage.setItem("orderUpdated", "true");
        } else {
            showCustomModal('Error', `Failed to update order: ${updateData.errors ? updateData.errors.join(", ") : updateData.message}`);
        }
    } catch (error) {
        console.error("Error updating order, sending notification, or creating receipt:", error);
        showCustomModal('Error', 'An error occurred while processing the order: ' + error.message);
    }
}