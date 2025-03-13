document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();

    document.getElementById("logout").addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "../J-Mab/HTML/sign-in.php";
        }
    });
});

// Confirmation Logic
const confirmationModal = document.getElementById("confirmationModal");
const confirmationMessage = document.getElementById("confirmationMessage");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

let currentOrderId = null;
let currentNewStatus = null;

// Function to show the confirmation 
function showConfirmationModal(message, orderId, newStatus) {
    confirmationMessage.textContent = message;
    currentOrderId = orderId;
    currentNewStatus = newStatus;
    confirmationModal.style.display = "flex";
}

// Function to hide the confirmation modal
function hideConfirmationModal() {
    confirmationModal.style.display = "none";
}

// Handle "Yes" button click
confirmYes.addEventListener("click", function () {
    hideConfirmationModal();
    if (currentOrderId && currentNewStatus) {
        updateOrderStatus(currentOrderId, currentNewStatus); // Proceed with the action
    }
});

// Handle "No" button click
confirmNo.addEventListener("click", function () {
    hideConfirmationModal(); 
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
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
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

    ordersTableBody.innerHTML = ""; // Clear previous content

    // Group orders by reference_number
    const groupedOrders = {};
    orders.forEach(order => {
        if (!groupedOrders[order.reference_number]) {
            groupedOrders[order.reference_number] = {
                user_id: order.user_id,
                first_name: order.first_name,
                last_name: order.last_name,
                total_price: parseFloat(order.total_price) || 0,
                payment_method: order.payment_method,
                status: order.status,
                product_details: order.product_details,
                order_id: order.order_id
            };
        }
    });

    // Render orders
    Object.entries(groupedOrders).forEach(([reference_number, order]) => {
        const row = document.createElement("tr");

        // Apply refined styles to statuses
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

        row.innerHTML = `
            <td>${reference_number}</td>
            <td>${order.first_name} ${order.last_name}</td>
            <td>₱${order.total_price.toFixed(2)}</td>
            <td>${order.payment_method.toUpperCase()}</td>
            <td>${order.product_details.replace(/, /g, "<br>")}</td>
            <td><span class="status-label ${statusClass}">${order.status}</span></td>
            <td>
                ${getStatusActions(order.status, order.order_id)}
            </td>
        `;

        ordersTableBody.appendChild(row);
    });
}


function getStatusActions(status, orderId) {
    let actions = '';

    if (status === 'pending') {
        actions = `
            <button class="accept-btn" onclick="showConfirmationModal('Are you sure you want to accept this order?', ${orderId}, 'processing')">Accept</button>
            <button class="decline-btn" onclick="showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled')">Decline</button>
        `;
    } else if (status === 'processing') {
        actions = `
            <button class="out-for-delivery-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery')">Out for Delivery</button>
        `;
    } else if (status === 'out for delivery') {
        actions = `
            <button class="delivered-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Delivered?', ${orderId}, 'delivered')">Delivered</button>
            <button class="didnt-receive-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Failed Delivery?', ${orderId}, 'failed delivery')">Didn't Receive</button>
        `;
    } else if (status === 'failed delivery') {
        actions = `
            <button class="retry-delivery-btn" onclick="showConfirmationModal('Are you sure you want to mark this order as Out for Delivery?', ${orderId}, 'out for delivery')">Out for Delivery Again</button>
            <button class="cancel-btn" onclick="showConfirmationModal('Are you sure you want to cancel this order?', ${orderId}, 'cancelled')">Cancel</button>
        `;
    } else if (status === 'cancelled' || status === 'delivered') {
        actions = `<span>No actions</span>`;
    }

    return actions;
}

// Function to update order status
function updateOrderStatus(orderId, newStatus) {
    const authToken = localStorage.getItem("authToken");

    fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                console.error("Server responded with an error:", err);
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${err.errors.join(", ")}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert(`Order ${orderId} updated to ${newStatus}`);
            fetchOrders(); // Refresh the orders table
        } else {
            alert(`Failed to update order: ${data.errors.join(", ")}`);
        }
    })
    .catch(error => {
        console.error("Error updating order:", error);
        alert("An error occurred while updating the order. Check the console for details.");
    });
}