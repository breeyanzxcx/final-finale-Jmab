// Global confirmation modal variables
let currentOrderId = null;
let currentNewStatus = null;
let currentUserId = null;
let currentReferenceNumber = null;
let currentProductDetails = null;

function showConfirmationModal(message, orderId, newStatus, userId, referenceNumber, productDetails) {
    const confirmationModal = document.getElementById("confirmationModal");
    const confirmationMessage = document.getElementById("confirmationMessage");

    if (confirmationModal && confirmationMessage) {
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

// Event listeners for confirmation buttons
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

if (confirmYes) {
    confirmYes.addEventListener("click", function () {
        hideConfirmationModal();
        if (currentOrderId && currentNewStatus && currentUserId) {
            // If status is cancelled or failed delivery, show reasons modal first
            if (currentNewStatus === "cancelled" || currentNewStatus === "failed delivery") {
                showReasonsModal(
                    currentOrderId, 
                    currentNewStatus, 
                    currentUserId, 
                    currentReferenceNumber, 
                    currentProductDetails
                );
            } else {
                // For other statuses, proceed directly with update
                updateOrderStatus(
                    currentOrderId, 
                    currentNewStatus, 
                    currentUserId, 
                    currentReferenceNumber, 
                    currentProductDetails
                );
            }
        }
    });
}

if (confirmNo) {
    confirmNo.addEventListener("click", function () {
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

    // Clear previous reasons
    reasonsForm.innerHTML = "";

    // Define reasons based on the status
    let reasons = [];
    if (newStatus === "failed delivery") {
        reasons = [
            "Address not found",
            "Customer not available",
            "Incomplete/incorrect address",
            "Access issues (gated community, etc.)",
            "Delivery attempted outside business hours",
            "Other delivery complications"
        ];
    } else if (newStatus === "cancelled") {
        reasons = [
            "Customer request",
            "Out of stock",
            "Pricing discrepancy",
            "Incorrect product ordered",
            "Duplicate order",
            "Changed mind",
            "Found better alternative",
            "Other cancellation reasons"
        ];
    }

    // Create radio buttons for reasons
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
    });

    // Add a textarea for additional comments
    const additionalCommentsDiv = document.createElement("div");
    additionalCommentsDiv.className = "additional-comments";
    
    const additionalCommentsLabel = document.createElement("label");
    additionalCommentsLabel.htmlFor = "additionalComments";
    additionalCommentsLabel.textContent = "Additional Comments (Optional):";
    
    const additionalCommentsTextarea = document.createElement("textarea");
    additionalCommentsTextarea.id = "additionalComments";
    additionalCommentsTextarea.name = "additionalComments";
    additionalCommentsTextarea.placeholder = "Provide more details if needed...";
    
    additionalCommentsDiv.appendChild(additionalCommentsLabel);
    additionalCommentsDiv.appendChild(additionalCommentsTextarea);
    reasonsForm.appendChild(additionalCommentsDiv);

    // Show the modal
    reasonsModal.style.display = "flex";

    // Submit button event listener
    reasonsSubmit.onclick = function() {
        const selectedReason = document.querySelector('input[name="cancelOrFailReason"]:checked');
        const additionalComments = document.getElementById("additionalComments").value.trim();

        if (!selectedReason) {
            alert("Please select a reason.");
            return;
        }

        const fullReason = additionalComments 
            ? `${selectedReason.value} - ${additionalComments}` 
            : selectedReason.value;

        // Hide the modal
        reasonsModal.style.display = "none";

        // Proceed with order status update
        updateOrderStatus(
            orderId, 
            newStatus, 
            userId, 
            referenceNumber, 
            productDetails, 
            fullReason
        );
    };
}

document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();

    // Logout functionality
    document.getElementById("logout").addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "../J-Mab/HTML/sign-in.php";
        }
    });

    // Name/Model sync logic
    const nameInput = document.getElementById("name");
    const modelInput = document.getElementById("model");

    if (nameInput && modelInput) {
        nameInput.addEventListener("input", function () {
            modelInput.value = nameInput.value; // Sync the model with name
        });
    }

    // Form submission handling
    const createProductForm = document.getElementById("createProductForm");
    if (createProductForm) {
        createProductForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const productData = {
                name: nameInput.value,
                model: modelInput.value,
                description: document.getElementById("description").value,
                category: document.getElementById("category").value,
                image_url: document.getElementById("image_url").value,
                brand: document.getElementById("brand").value,
            };

            fetch("http://localhost/jmab/final-jmab/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
                body: JSON.stringify(productData),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        console.log("Product created:", data);
                        alert("Product added successfully!");
                        createProductForm.reset();
                    } else {
                        console.error("Failed to create product:", data.message);
                        alert("Failed to add product: " + data.message);
                    }
                })
                .catch((error) => {
                    console.error("Error creating product:", error);
                    alert("An error occurred while creating the product.");
                });
        });
    }
});

async function fetchOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        alert("Unauthorized access. Please log in.");
        window.location.href = "../HTML/sign-in.php";
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
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function displayOrders(orders) {
    const ordersTableBody = document.getElementById("orders-table-body");

    if (!ordersTableBody) {
        console.error("Error: 'orders-table-body' not found in the DOM.");
        return;
    }

    ordersTableBody.innerHTML = "";

    const groupedOrders = {};
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
            case "pending":
                statusClass = "status-pending";
                break;
            case "cancelled":
                statusClass = "status-cancelled";
                break;
            case "out for delivery":
                statusClass = "status-out-for-delivery";
                break;
            case "delivered":
                statusClass = "status-delivered";
                break;
            case "failed delivery":
                statusClass = "status-failed";
                break;
            default:
                statusClass = "status-default";
                break;
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

    if (status === "pending") {
        actions = `
            <button class="accept-btn" onclick="showConfirmationModal('Are you sure you want to accept this order?', ${orderId}, 'processing', ${userId}, '${referenceNumber}', '${productDetails}')">Accept</button>
            <button class="decline-btn" onclick="showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled', ${userId}, '${referenceNumber}', '${productDetails}')">Decline</button>
        `;
    } else if (status === "processing") {
        actions = `
            <button class="out-for-delivery-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery', ${userId}, '${referenceNumber}', '${productDetails}')">Out for Delivery</button>
        `;
    } else if (status === "out for delivery") {
        actions = `
            <button class="delivered-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Delivered?', ${orderId}, 'delivered', ${userId}, '${referenceNumber}', '${productDetails}')">Delivered</button>
            <button class="didnt-receive-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Failed Delivery?', ${orderId}, 'failed delivery', ${userId}, '${referenceNumber}', '${productDetails}')">Didn\'t Receive</button>
        `;
    } else if (status === "failed delivery") {
        actions = `
            <button class="retry-delivery-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery', ${userId}, '${referenceNumber}', '${productDetails}')">Out for Delivery Again</button>
            <button class="cancel-btn" onclick="showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled', ${userId}, '${referenceNumber}', '${productDetails}')">Cancel</button>
        `;
    } else if (status === "cancelled" || status === "delivered") {
        actions = `<span>No actions</span>`;
    }

    return actions;
}

function formatPrice(price) {
    // Convert to number if it's a string
    const num = typeof price === 'string' ? parseFloat(price) : price;
    // Format with commas and 2 decimal places
    return num.toLocaleString('en-PH', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function updateOrderStatus(
    orderId, 
    newStatus, 
    userId, 
    referenceNumber, 
    productDetails, 
    reason = null
) {
    const authToken = localStorage.getItem("authToken");

    try {
        // Step 1: Update the order status
        const updateResponse = await fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ 
                status: newStatus,
                reason: reason  // Include the reason in the update
            }),
        });

        const updateData = await updateResponse.json();

        if (updateData.success) {
            // Step 2: Determine the notification title based on the new status
            let notificationTitle;
            switch (newStatus.toLowerCase()) {
                case "processing":
                    notificationTitle = "Order Accepted";
                    break;
                case "out for delivery":
                    notificationTitle = "Order Out for Delivery";
                    break;
                case "delivered":
                    notificationTitle = "Order Delivered";
                    break;
                case "failed delivery":
                    notificationTitle = "Order Delivery Failed";
                    break;
                case "cancelled":
                    notificationTitle = "Order Cancelled";
                    break;
                default:
                    notificationTitle = "Order Status Update";
                    break;
            }

            // Step 3: Send notification to the customer
            const notificationData = {
                user_id: userId,
                title: notificationTitle,
                message: `Your order (Ref: ${referenceNumber}) has been ${newStatus}. ${reason ? `Reason: ${reason}` : ''} Product: ${productDetails || "N/A"}`,
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

            if (notificationResult.success) {
                console.log(`Notification sent to user ${userId} for order ${orderId}: ${notificationTitle}`);
            } else {
                console.error("Failed to send notification:", notificationResult.message);
            }

            // Step 4: Update UI and notify admin
            alert(`Order ${orderId} updated to ${newStatus}`);
            fetchOrders();
            localStorage.setItem("orderUpdated", "true");
        } else {
            alert(`Failed to update order: ${updateData.errors.join(", ")}`);
        }
    } catch (error) {
        console.error("Error updating order or sending notification:", error);
        alert("An error occurred while updating the order or sending the notification.");
    }
}
