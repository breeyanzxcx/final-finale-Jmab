// Global chart variables
let salesChart = null;
let customersChart = null;
let notificationList = [];

document.addEventListener("DOMContentLoaded", function () {
    const userId = parseInt(localStorage.getItem('userId')) || -1;
    const authToken = localStorage.getItem('authToken');

    // Authentication check
    if (userId === -1 || !authToken) {
        console.error('User not authenticated');
        window.location.href = '../J-Mab/HTML/sign-in.php';
        return;
    }

    // Initialize WebSocket for notifications (assuming WS_NOTIFICATION_URL is defined elsewhere)
    const notificationWS = new WebSocketManager(WS_NOTIFICATION_URL, "notification");
    notificationWS.connect(userId, authToken, handleNotificationReceived);

    // Event listeners
    setupEventListeners();

    // Initial data fetch
    fetchNotifications();
    fetchOrders();
    setInterval(fetchOrders, 60000); // Poll every minute as fallback
});

// Event listener setup
function setupEventListeners() {
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationDropdown = document.getElementById('notificationDropdown');
    notificationIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = notificationDropdown.style.display === 'block';
        notificationDropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            fetchNotifications();
            markAllAsRead();
        }
    });

    const helpBubble = document.getElementById('helpBubble');
    const contactPopup = document.getElementById('contactPopup');
    helpBubble.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target !== contactPopup && !contactPopup.contains(e.target)) {
            contactPopup.style.display = contactPopup.style.display === 'block' ? 'none' : 'block';
        }
    });

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                localStorage.clear();
                window.location.href = '../J-Mab/HTML/sign-in.php';
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (!notificationIcon.contains(e.target)) notificationDropdown.style.display = 'none';
        if (!helpBubble.contains(e.target)) contactPopup.style.display = 'none';
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const userId = parseInt(localStorage.getItem('userId'));
            const authToken = localStorage.getItem('authToken');
            notificationWS.reconnectIfNeeded(userId, authToken, handleNotificationReceived);
            fetchNotifications();
        }
    });

    window.addEventListener('beforeunload', () => notificationWS.close());
}

// Notification handling
function handleNotificationReceived(data) {
    if (data.type === 'notification') {
        const existingIndex = notificationList.findIndex(n => n.id === data.id);
        if (existingIndex >= 0) {
            notificationList[existingIndex] = data;
        } else {
            notificationList.unshift(data);
        }
        renderNotifications();
        playNotificationSound();
        if (data.message?.toLowerCase().includes('order')) fetchOrders();
    }
}

async function fetchNotifications() {
    try {
        const userId = parseInt(localStorage.getItem('userId'));
        const notifications = await apiService.fetchNotifications(userId); // Assuming apiService is defined
        notificationList = notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderNotifications();
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

async function markAllAsRead() {
    try {
        const unreadNotifications = notificationList.filter(n => n.is_read === 0);
        for (const notification of unreadNotifications) {
            await apiService.markNotificationAsRead(notification.id);
            notification.is_read = 1;
        }
        renderNotifications();
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
    }
}

async function deleteNotification(notificationId) {
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`http://localhost/jmab/final-jmab/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            notificationList = notificationList.filter(n => n.id !== notificationId);
            renderNotifications();
        } else {
            console.error('Failed to delete notification:', data.message);
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

function renderNotifications() {
    const notificationListElement = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationBadge');
    if (!notificationListElement || !notificationBadge) return;

    notificationListElement.innerHTML = notificationList.length === 0
        ? '<li class="notification-empty">No notifications</li>'
        : notificationList.map(notification => `
            <li>
                <div class="notification-content ${notification.is_read ? '' : 'unread-notification'}">
                    <strong>${notification.title || 'Notification'}</strong>
                    <p>${notification.message}</p>
                    <small>${formatNotificationTimestamp(notification.created_at)}</small>
                </div>
                <div class="trash-icon" data-notification-id="${notification.id}">
                    <i class="fas fa-trash"></i>
                </div>
            </li>
        `).join('');

    notificationListElement.querySelectorAll('.trash-icon').forEach(icon => {
        icon.addEventListener('click', (e) => deleteNotification(parseInt(e.currentTarget.getAttribute('data-notification-id'))));
    });

    const unreadCount = notificationList.filter(n => n.is_read === 0).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

function formatNotificationTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
}

function playNotificationSound() {
    try {
        new Audio('../sounds/notification.mp3').play();
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Order handling
async function fetchOrders() {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        alert("Unauthorized access. Please log in.");
        window.location.href = "../J-Mab/HTML/sign-in.php";
        return;
    }

    try {
        // Fetch orders
        const ordersResponse = await fetch("http://localhost/jmab/final-jmab/api/orders", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!ordersResponse.ok) throw new Error(`HTTP error fetching orders! Status: ${ordersResponse.status}`);

        const ordersData = await ordersResponse.json();
        if (ordersData.success && ordersData.orders?.length > 0) {
            displayOrders(ordersData.orders);
            updateSalesCounter(ordersData.orders);
            updateCustomerCounter(ordersData.orders);
            updateCustomersChart(ordersData.orders);
        } else {
            console.warn("No orders found or API returned empty data");
        }

        // Fetch and update sales chart separately
        await updateSalesChart();

    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function updateSalesCounter(orders) {
    const totalSales = orders.reduce((sum, order) => {
        // Only count orders that aren't failed/cancelled
        if (order.status && 
            !['failed', 'canceled', 'cancelled', 'refunded'].includes(order.status.toLowerCase())) {
            return sum + (parseInt(order.total_quantity, 10) || 0);
        }
        return sum;
    }, 0);

    const salesCounter = document.querySelector(".sales-counter");
    if (salesCounter) salesCounter.textContent = totalSales;
}

function updateCustomerCounter(orders) {
    const uniqueCustomers = new Set(orders.map(order => order.user_id).filter(id => id));
    const customersCounter = document.querySelector(".customers-counter");
    if (customersCounter) customersCounter.textContent = uniqueCustomers.size;
}

function formatOrderItems(order) {
    let items = [];
    if (order.items && Array.isArray(order.items)) {
        items = order.items;
    } else if (order.order_items && Array.isArray(order.order_items)) {
        items = order.order_items;
    } else if (order.product_details) {
        if (Array.isArray(order.product_details)) {
            items = order.product_details;
        } else if (typeof order.product_details === 'object') {
            items = [order.product_details];
        } else if (typeof order.product_details === 'string') {
            const rawDetails = order.product_details.trim();
            const match = rawDetails.match(/^(.*?)(?:\s*\(x(\d+)\))?$/i);
            if (match) {
                let name = match[1].trim();
                const quantity = match[2] ? parseInt(match[2], 10) : 1;
                const parts = name.split(' - ').filter((part, index, self) => self.indexOf(part) === index);
                name = parts.join(' - ');
                items = [{ name, quantity }];
            } else {
                items = [{ name: rawDetails, quantity: 1 }];
            }
        }
    }

    if (items.length === 0) return "No items found";

    return items.map(item => {
        const name = item.name || item.product_name || item.model || "Unknown Product";
        const quantity = item.quantity || item.qty || 1;
        return `${name} (${quantity})`;
    }).join(', ');
}

function displayOrders(orders) {
    const ordersTableBody = document.querySelector(".orders-container tbody");
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = "";
    const recentOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

    recentOrders.forEach(order => {
        const fullName = `${order.first_name || ""} ${order.last_name || ""}`.trim();
        const formattedDate = formatDate(order.created_at);
        const statusClass = order.status.toLowerCase().replace(/ /g, '-');
        const itemDetails = formatOrderItems(order);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${fullName || "N/A"}</td>
            <td>${formattedDate || "N/A"}</td>
            <td class="items-cell">${itemDetails}<div class="items-tooltip">${itemDetails}</div></td>
            <td><p class="status ${statusClass}">${order.status}</p></td>
        `;
        ordersTableBody.appendChild(row);
    });
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", { 
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true 
    });
}

async function updateSalesChart() {
    console.log("=====================================================");
    console.log("SALES CHART DEBUG: Fetching category counts");
    
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
        console.error("No auth token found");
        return;
    }

    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/orders/count", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error fetching category counts! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Raw API response:", data);

        if (!data.success) {
            throw new Error("API returned an error: " + (data.errors?.join(", ") || "Unknown error"));
        }

        if (!data.categories || !Array.isArray(data.categories)) {
            throw new Error("Invalid category data format from API");
        }

        const categoryCounts = {
            'Tires': 0,
            'Batteries': 0,
            'Oils': 0,
            'Lubricants': 0
            
        };

        data.categories.forEach(category => {
            const name = category.category;
            const count = parseInt(category.order_count, 10) || 0;
            console.log(`Processing category: ${name} with count: ${count}`);
            if (name in categoryCounts) {
                categoryCounts[name] = count;
            } else {
                console.warn(`Unexpected category from API: ${name}, ignoring`);
            }
        });

        console.log("Final category counts:", categoryCounts);

        const ctx = document.getElementById('salesChart')?.getContext('2d');
        if (!ctx) {
            console.error("Could not find salesChart canvas element");
            return;
        }

        if (salesChart) {
            console.log("Destroying existing chart");
            salesChart.destroy();
        }

        // Changed from pie chart to bar chart
        console.log("Creating new bar chart with data:", categoryCounts);
        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    label: 'Number of Orders',
                    data: Object.values(categoryCounts),
                    backgroundColor: [
                        '#FF6384', // Tires
                        '#36A2EB', // Batteries
                        '#FFCE56', // Oils
                        '#4BC0C0'  // Lubricants
                    ],
                    borderWidth: 1
                }]
            },
            options: getBarChartOptions('Sales Distribution by Category')
        });
        
        console.log("Chart created successfully");

    } catch (error) {
        console.error("Error updating sales chart:", error);
    }
    
    console.log("=====================================================");
}

// Add a new function for bar chart options
function getBarChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0
                },
                title: {
                    display: true,
                    text: 'Number of Orders',
                    font: {
                        size: 12,
                        weight: 'bold'
                    },
                    padding: {top: 0, bottom: 10}
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Product Categories',
                    font: {
                        size: 12,
                        weight: 'bold'
                    },
                    padding: {top: 10, bottom: 0}
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: title,
                font: { 
                    size: 16, 
                    weight: 'bold' 
                },
                padding: { 
                    top: 10, 
                    bottom: 20 
                },
                color: '#02254B'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${value} orders (${percentage}%)`;
                    }
                },
                bodyFont: { size: 12 },
                titleFont: { size: 14, weight: 'bold' }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    };
}

function updateCustomersChart(orders) {
    console.log("=====================================================");
    console.log("CUSTOMERS CHART DEBUG: Processing orders", orders);

    // Define expected statuses
    const statusCounts = { 
        'Pending': 0, 
        'Processing': 0, 
        'Out for Delivery': 0, 
        'Delivered': 0, 
        'Cancelled': 0 
    };

    // Normalize status values
    orders.forEach(order => {
        let status = order.status || '';
        console.log(`Raw status for order ${order.id}: "${status}"`);

        // Normalize the status to match expected keys
        const normalizedStatus = status
            .toLowerCase()
            .replace(/-/g, ' ') // Replace hyphens with spaces
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        console.log(`Normalized status: "${normalizedStatus}"`);

        if (normalizedStatus === 'Out For Delivery') {
            statusCounts['Out for Delivery']++;
        } else if (normalizedStatus in statusCounts) {
            statusCounts[normalizedStatus]++;
        } else {
            console.warn(`Unexpected status: "${normalizedStatus}", skipping`);
        }
    });

    console.log("Final status counts:", statusCounts);

    const ctx = document.getElementById('customersChart')?.getContext('2d');
    if (!ctx) {
        console.error("Could not find customersChart canvas element");
        return;
    }

    if (customersChart) {
        console.log("Destroying existing chart");
        customersChart.destroy();
    }

    console.log("Creating new chart with data:", statusCounts);
    customersChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#FF9F40', // Pending
                    '#36A2EB', // Processing
                    '#4BC0C0', // Out for Delivery
                    '#00CC99', // Delivered
                    '#FF6384'  // Cancelled
                ],
                borderWidth: 1
            }]
        },
        options: getPieChartOptions('Order Status Distribution')
    });

    console.log("Chart created successfully");
    console.log("=====================================================");
}

function getPieChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                    padding: 20,
                    font: { size: 12 },
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            title: {
                display: true,
                text: title,
                font: { size: 16, weight: 'bold' },
                padding: { top: 10, bottom: 20 },
                color: '#02254B'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                },
                bodyFont: { size: 12 },
                titleFont: { size: 14, weight: 'bold' }
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    };
}