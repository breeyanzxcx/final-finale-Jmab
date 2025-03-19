document.addEventListener("DOMContentLoaded", function () {
    initializeNotifications();
    setupWebSocket();
    fetchNotifications(); // Fetch initial notifications on load
});

function initializeNotifications() {
    const notificationIcon = document.getElementById("notificationIcon");
    if (!notificationIcon) {
        console.error("Notification icon not found.");
        return;
    }

    notificationIcon.addEventListener("click", toggleNotificationDropdown);

    window.addEventListener("click", function (e) {
        const notificationContainer = document.querySelector(".notification-container");
        const dropdown = document.getElementById("notificationDropdown");
        if (notificationContainer && dropdown && !notificationContainer.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

function setupWebSocket() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");

    if (!userId || !authToken) {
        console.error("User credentials not found. Please log in.");
        return;
    }

    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = function () {
        console.log(`WebSocket connected for User ID: ${userId}`);
        ws.send(JSON.stringify({ userId: userId }));
    };

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        console.log("Received notification:", data);
        updateNotificationUI([data]);
        playNotificationSound();
    };

    ws.onerror = function (error) {
        console.error("WebSocket error:", error);
    };

    ws.onclose = function () {
        console.log("WebSocket closed. Reconnecting...");
        setTimeout(setupWebSocket, 2000);
    };
}

function toggleNotificationDropdown(event) {
    event.preventDefault();
    const dropdown = document.getElementById("notificationDropdown");
    if (!dropdown) {
        console.error("Notification dropdown not found.");
        return;
    }

    const isVisible = dropdown.style.display === "block";
    dropdown.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
        fetchNotifications(); // Fetch notifications when opening dropdown
        markNotificationsAsRead(); // Optional: mark as read
    }
}

async function fetchNotifications() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");

    if (!userId || !authToken) {
        console.error("User credentials not found.");
        return;
    }

    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/notifications/${userId}`, {
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
            updateNotificationUI(data.notifications);
        } else {
            console.error("Failed to fetch notifications:", data.errors);
        }
    } catch (error) {
        console.error("Error fetching notifications:", error);
    }
}

function updateNotificationUI(notifications) {
    const notificationList = document.getElementById("notificationList");
    const notificationBadge = document.getElementById("notificationBadge");

    if (!notificationList || !notificationBadge) {
        console.error("Notification UI elements not found.");
        return;
    }

    notificationList.innerHTML = ""; // Clear existing list

    if (notifications.length === 0) {
        notificationList.innerHTML = '<li class="notification-empty">No notifications</li>';
    } else {
        notifications.forEach(notification => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="${notification.is_read ? '' : 'unread-notification'}">
                    <strong>${notification.title}</strong>
                    <p>${notification.message}</p>
                    <small>${formatTimestamp(notification.created_at)}</small>
                </div>
            `;
            if (notification.type === "order_update" && notification.order_id) {
                li.style.cursor = "pointer";
                li.addEventListener("click", function () {
                    window.location.href = `../HTML/order-details.html?id=${notification.order_id}`;
                });
            }
            notificationList.appendChild(li);
        });
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? "inline-block" : "none";
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function playNotificationSound() {
    try {
        const audio = new Audio("../sounds/notification.mp3");
        audio.play();
    } catch (error) {
        console.error("Error playing notification sound:", error);
    }
}

async function markNotificationsAsRead() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");

    if (!userId || !authToken) return;

    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/notifications/mark-read", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
            console.log("Notifications marked as read");
            fetchNotifications(); // Refresh UI
        }
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
}