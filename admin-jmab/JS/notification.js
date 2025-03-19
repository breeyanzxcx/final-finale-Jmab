// admin/notification.js
document.addEventListener("DOMContentLoaded", function() {
    initializeNotifications();
    setupWebSocket();
});

function initializeNotifications() {
    const notificationIcon = document.getElementById("notificationIcon");
    if (notificationIcon) {
        notificationIcon.addEventListener("click", toggleNotificationDropdown);
    }
    
    window.addEventListener("click", function(e) {
        const notificationContainer = document.querySelector(".notification-container");
        const dropdown = document.getElementById("notificationDropdown");
        if (notificationContainer && dropdown && !notificationContainer.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

function setupWebSocket() {
    const adminId = localStorage.getItem("adminId") || "0"; // Default to 0 if no specific admin ID
    const authToken = localStorage.getItem("adminAuthToken");
    
    if (!authToken) {
        console.error("Admin auth token not found.");
        return;
    }

    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = function() {
        console.log("WebSocket connection opened for admin notifications");
        // Register admin with userId = 0 (or specific adminId)
        ws.send(JSON.stringify({ userId: adminId }));
    };

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log("Received notification:", data);
        updateNotificationUI([data]); // Update UI with new notification
        playNotificationSound();
    };

    ws.onerror = function(error) {
        console.error("WebSocket error:", error);
    };

    ws.onclose = function() {
        console.log("WebSocket connection closed. Reconnecting...");
        setTimeout(setupWebSocket, 2000); // Reconnect after 2 seconds
    };
}

function toggleNotificationDropdown(event) {
    event.preventDefault();
    const dropdown = document.getElementById("notificationDropdown");
    if (!dropdown) return;
    
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    if (dropdown.style.display === "block") {
        markNotificationsAsRead(); // Optional: mark as read when opened
    }
}

function updateNotificationUI(notifications) {
    const notificationList = document.getElementById("notificationList");
    const notificationBadge = document.getElementById("notificationBadge");
    
    if (!notificationList || !notificationBadge) return;

    notifications.forEach(notification => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="${notification.is_read ? '' : 'unread-notification'}">
                <strong>${notification.title}</strong>
                <p>${notification.message}</p>
                <small>${formatTimestamp(notification.created_at)}</small>
            </div>
        `;
        if (notification.type === "new_order" && notification.order_id) {
            li.style.cursor = "pointer";
            li.addEventListener("click", function() {
                window.location.href = `/JMAB/admin-jmab/orderConfirm.html?id=${notification.order_id}`;
            });
        }
        notificationList.insertBefore(li, notificationList.firstChild); // Add at top
    });

    const unreadCount = Array.from(notificationList.children).filter(li => 
        li.querySelector('.unread-notification')
    ).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? "inline-block" : "none";
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function playNotificationSound() {
    try {
        const audio = new Audio('../sounds/notification.mp3');
        audio.play();
    } catch (error) {
        console.error("Error playing notification sound:", error);
    }
}

async function markNotificationsAsRead() {
    const authToken = localStorage.getItem("adminAuthToken");
    // Optional: Implement API call to mark notifications as read for admin
}