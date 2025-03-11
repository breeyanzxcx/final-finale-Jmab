document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();

    document.getElementById("logout").addEventListener("click", function (e) {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "../J-Mab/HTML/sign-in.php";
        }
    });
});

async function fetchOrders() {
    const authToken = localStorage.getItem("authToken"); // Make sure the admin is authenticated
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
                product_details: order.product_details, // Store product names
                order_id: order.order_id
            };
        }

        // Append product name
        if (order.product_name) {
            groupedOrders[order.reference_number].products.push(order.product_name);
        }
    });

    // Render orders
    Object.entries(groupedOrders).forEach(([reference_number, order]) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${reference_number}</td> <!-- Order ID is reference number -->
            <td>${order.first_name} ${order.last_name}</td>
            <td>₱${order.total_price.toFixed(2)}</td>
            <td>${order.payment_method.toUpperCase()}</td>
            <td>${order.product_details.replace(/, /g, "<br>")}</td>
            <td>${order.status}</td>
            <td>
                <button class="accept-btn" onclick="updateOrderStatus(${order.order_id}, 'accepted')">Accept</button>
                <button class="decline-btn" onclick="updateOrderStatus(${order.order_id}, 'declined')">Decline</button>
            </td>
        `;

        ordersTableBody.appendChild(row);
    });
}

// Function to accept or decline orders
function updateOrderStatus(orderId, newStatus) {
    fetch(`http://localhost/jmab/final-jmab/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Order ${orderId} updated to ${newStatus}`);
            fetchOrders(); // Refresh order list
        } else {
            alert(`Failed to update order: ${data.message}`);
        }
    })
    .catch(error => console.error("Error updating order:", error));
}