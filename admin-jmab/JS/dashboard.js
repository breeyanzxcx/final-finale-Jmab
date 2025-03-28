document.addEventListener("DOMContentLoaded", function () {
    fetchOrders();

    // Logout confirmation with custom modal
    const logoutBtn = document.getElementById('logout');
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    const modalClose = document.querySelector('.modal-close');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showModal('Logout Confirmation', 'Are you sure you want to log out?', 
                function() {
                    window.location.href = '../J-Mab/HTML/sign-in.php';
                }
            );
        });
    }

    // Modal close handlers
    modalCancel.addEventListener('click', hideModal);
    modalClose.addEventListener('click', hideModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) hideModal();
    });

    // Modal functions
    function showModal(title, message, onConfirm) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';

        // Remove any existing confirm listener and add new one
        const newConfirmBtn = modalConfirm.cloneNode(true);
        modalConfirm.parentNode.replaceChild(newConfirmBtn, modalConfirm);
        document.getElementById('modalConfirm').addEventListener('click', function() {
            onConfirm();
            hideModal();
        });
    }

    function hideModal() {
        modal.style.display = 'none';
    }
});

async function fetchOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        showModal('Unauthorized Access', 'Please log in to continue.', 
            function() {
                window.location.href = "../HTML/sign-in.php";
            }
        );
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
        console.log("API Response:", data);
        if (data.success) {
            displayOrders(data.orders);
            updateSalesCounter(data.orders);
            updateCustomerCounter(data.orders);
        } else {
            console.error("Failed to fetch orders:", data.message);
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function updateSalesCounter(orders) {
    let totalSales = 0;

    orders.forEach(order => {
        if (order.total_quantity) {
            console.log("Order Quantity:", order.total_quantity);
            totalSales += parseInt(order.total_quantity, 10);
        }
    });

    console.log("Total Sales:", totalSales);
    const salesCounter = document.querySelector(".sales-counter");
    if (salesCounter) {
        salesCounter.textContent = totalSales;
    }
}

function updateCustomerCounter(orders) {
    const uniqueCustomers = new Set();

    orders.forEach(order => {
        if (order.user_id) {
            console.log("Customer ID:", order.user_id);
            uniqueCustomers.add(order.user_id);
        }
    });

    const totalCustomers = uniqueCustomers.size;
    console.log("Total Customers:", totalCustomers);

    const customersCounter = document.querySelector(".customers-counter");
    if (customersCounter) {
        customersCounter.textContent = totalCustomers;
    }
}

function displayOrders(orders) {
    const ordersTableBody = document.querySelector(".orders-container tbody");
    ordersTableBody.innerHTML = "";

    const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recentOrders = sortedOrders.slice(0, 10);

    recentOrders.forEach(order => {
        const fullName = `${order.first_name || ""} ${order.last_name || ""}`.trim();
        const formattedDate = formatDate(order.created_at);
        const statusClass = order.status.toLowerCase().replace(/ /g, '-');

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${fullName || "N/A"}</td>
            <td>${formattedDate || "N/A"}</td>
            <td><p class="status ${statusClass}">${order.status}</p></td>
        `;
        ordersTableBody.appendChild(row);
    });
}

function formatDate(dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    const options = { 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: true 
    };
    return date.toLocaleString("en-US", options);
}