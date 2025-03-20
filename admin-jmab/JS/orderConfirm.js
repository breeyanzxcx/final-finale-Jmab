// Global confirmation modal variables
let currentOrderId = null;
let currentNewStatus = null;

function showConfirmationModal(message, orderId, newStatus) {
    const confirmationModal = document.getElementById("confirmationModal");
    const confirmationMessage = document.getElementById("confirmationMessage");

    if (confirmationModal && confirmationMessage) {
        confirmationMessage.textContent = message;
        currentOrderId = orderId;
        currentNewStatus = newStatus;
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

// Event listeners for confirmation buttons (outside DOMContentLoaded for global access)
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

if (confirmYes) {
    confirmYes.addEventListener("click", function () {
        hideConfirmationModal();
        if (currentOrderId && currentNewStatus) {
            updateOrderStatus(currentOrderId, currentNewStatus);
        }
    });
}

if (confirmNo) {
    confirmNo.addEventListener("click", function () {
        hideConfirmationModal();
    });
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
                model: modelInput.value, // Will be same as name
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
            <td>₱${order.total_price.toFixed(2)}</td>
            <td>${order.payment_method.toUpperCase()}</td>
            <td>${formattedProductDetails}</td>
            <td><span class="status-label ${statusClass}">${order.status}</span></td>
            <td>
                ${getStatusActions(order.status, order.order_id)}
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

function getStatusActions(status, orderId) {
    let actions = "";

    if (status === "pending") {
        actions = `
            <button class="accept-btn" onclick="showConfirmationModal('Are you sure you want to accept this order?', ${orderId}, 'processing')">Accept</button>
            <button class="decline-btn" onclick="showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled')">Decline</button>
        `;
    } else if (status === "processing") {
        actions = `
            <button class="out-for-delivery-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery')">Out for Delivery</button>
        `;
    } else if (status === "out for delivery") {
        actions = `
            <button class="delivered-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Delivered?', ${orderId}, 'delivered')">Delivered</button>
            <button class="didnt-receive-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Failed Delivery?', ${orderId}, 'failed delivery')">Didn't Receive</button>
        `;
    } else if (status === "failed delivery") {
        actions = `
            <button class="retry-delivery-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery')">Out for Delivery Again</button>
            <button class="cancel-btn" onclick="showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled')">Cancel</button>
        `;
    } else if (status === "cancelled" || status === "delivered") {
        actions = `<span>No actions</span>`;
    }

    return actions;
}

function updateOrderStatus(orderId, newStatus) {
    const authToken = localStorage.getItem("authToken");

    fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert(`Order ${orderId} updated to ${newStatus}`);
                fetchOrders();
                localStorage.setItem("orderUpdated", "true");
            } else {
                alert(`Failed to update order: ${data.errors.join(", ")}`);
            }
        })
        .catch((error) => {
            console.error("Error updating order:", error);
            alert("An error occurred while updating the order.");
        });
}