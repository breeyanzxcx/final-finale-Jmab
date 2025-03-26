// Constants
const API_BASE_URL = "http://localhost/jmab/final-jmab/api";
const WS_URL = "ws://192.168.100.74:8081";

// WebSocket Manager
let webSocket = null;
let isConnected = false;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let userId = -1;
let authToken = null;
let reconnectTimeout = null;
let notificationsList = [];

// API Service
const apiService = {
    fetchNotifications: async function(userId) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/notifications/${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.status === 401) throw new Error("Unauthorized");
            const data = await response.json();
            if (!data.success) throw new Error("Failed to fetch notifications");
            return data.notifications || [];
        } catch (error) {
            console.error("Error fetching notifications:", error);
            throw error;
        }
    },
    markNotificationAsRead: async function(notificationId) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error("No authentication token available");
            const response = await fetch(`${API_BASE_URL}/notifications/read/${notificationId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ notification_id: notificationId }) // Add body if required
            });
            if (response.status === 401) throw new Error("Unauthorized");
            const data = await response.json();
            console.log("Mark as read response:", response.status, data);
            if (!data.success) {
                console.error("API error details:", data.errors || data.message || "No details provided");
                throw new Error("Failed to mark notification as read");
            }
            return data;
        } catch (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    }
};

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", function () {
    initializeApp();
});

// Core Initialization
function initializeApp() {
    userId = getUserId();
    authToken = getAuthToken();

    if (userId === -1 || !authToken) {
        showToast("Please log in to view notifications");
        return;
    }

    setupNotificationUI();
    connectWebSocket(userId);
    fetchNotifications();
}

// Setup UI Event Listeners
function setupNotificationUI() {
    const notificationIcon = document.getElementById("notificationIcon");
    if (notificationIcon) {
        notificationIcon.addEventListener("click", toggleNotificationDropdown);
    }

    window.addEventListener("click", function (e) {
        const notificationContainer = document.querySelector(".notification-container");
        const dropdown = document.getElementById("notificationDropdown");
        if (notificationContainer && dropdown && !notificationContainer.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

// WebSocket Management
function connectWebSocket(userId) {
    if (isConnected || isConnecting || !authToken) return;
    if (userId === -1) {
        console.error("Invalid user ID");
        return;
    }

    isConnecting = true;
    webSocket = new WebSocket(WS_URL);

    webSocket.onopen = function() {
        isConnected = true;
        isConnecting = false;
        reconnectAttempts = 0;
        console.log(`WebSocket connected for userId: ${userId}`);
        webSocket.send(JSON.stringify({ type: "auth", userId: userId, token: authToken }));
        updateConnectionStatus(true);
    };

    webSocket.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "auth") {
                if (!data.success) {
                    console.error("WebSocket auth failed");
                    closeConnection();
                }
                return;
            }
            console.log("WebSocket received:", data);
            handleNewNotification(data);
            playNotificationSound();
        } catch (e) {
            console.error("Error parsing WebSocket message:", e);
        }
    };

    webSocket.onerror = function(error) {
        console.error("WebSocket error:", error);
        isConnected = false;
        isConnecting = false;
        scheduleReconnect();
    };

    webSocket.onclose = function(event) {
        console.log("WebSocket closed:", event.reason);
        isConnected = false;
        isConnecting = false;
        if (event.code !== 1000) scheduleReconnect();
    };
}

function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error("Max reconnect attempts reached");
        return;
    }
    const delay = 5000 * (reconnectAttempts + 1);
    reconnectAttempts++;
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => connectWebSocket(userId), delay);
}

function reconnectIfNeeded() {
    if (!isConnected && !isConnecting && userId !== -1) {
        connectWebSocket(userId);
    }
}

function closeConnection() {
    if (webSocket) {
        webSocket.close(1000, "Normal closure");
        webSocket = null;
    }
    isConnected = false;
    isConnecting = false;
    reconnectAttempts = 0;
    clearTimeout(reconnectTimeout);
    updateConnectionStatus(false);
}

// UI Updates
function updateConnectionStatus(connected) {
    console.log(`Notification WebSocket: ${connected ? "Connected" : "Disconnected"}`);
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
        fetchNotifications();
        markNotificationsAsRead(); // Mark all unread notifications as read
    }
}

async function fetchNotifications() {
    try {
        const notifications = await apiService.fetchNotifications(userId);
        notificationsList = notifications.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at));
        renderNotifications();
    } catch (error) {
        showToast("Error loading notifications");
    }
}

function handleNewNotification(notification) {
    const existingIndex = notificationsList.findIndex(n => n.id === notification.id);
    if (existingIndex >= 0) {
        notificationsList[existingIndex] = notification;
    } else {
        notificationsList.unshift(notification);
    }
    renderNotifications();
    scrollToTop();
}

function renderNotifications() {
    const notificationList = document.getElementById("notificationList");
    const notificationBadge = document.getElementById("notificationBadge");

    if (!notificationList || !notificationBadge) {
        console.error("Notification UI elements not found.");
        return;
    }

    notificationList.innerHTML = "";

    if (notificationsList.length === 0) {
        notificationList.innerHTML = '<li class="notification-empty">No notifications</li>';
    } else {
        notificationsList.forEach(notification => {
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
                li.addEventListener("click", async () => {
                    await markNotificationAsRead(notification.id); // Mark as read on click for order updates
                    window.location.href = `../HTML/order-details.html?id=${notification.order_id}`;
                });
            } else if (!notification.is_read) {
                li.style.cursor = "pointer";
                li.addEventListener("click", () => markNotificationAsRead(notification.id)); // Mark as read on click
            }
            notificationList.appendChild(li);
        });
    }

    const unreadCount = notificationsList.filter(n => n.is_read === 0).length;
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? "inline-block" : "none";
}

async function markNotificationAsRead(notificationId) {
    try {
        await apiService.markNotificationAsRead(notificationId);
        const notification = notificationsList.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = 1; // Update local state
            renderNotifications();
        }
    } catch (error) {
        showToast("Failed to mark notification as read");
    }
}

async function markNotificationsAsRead() {
    try {
        const unreadNotifications = notificationsList.filter(n => n.is_read === 0);
        for (const notification of unreadNotifications) {
            await apiService.markNotificationAsRead(notification.id);
            notification.is_read = 1; // Update local state
        }
        renderNotifications();
    } catch (error) {
        showToast("Failed to mark notifications as read");
    }
}

function scrollToTop() {
    const dropdown = document.getElementById("notificationDropdown");
    if (dropdown) {
        dropdown.scrollTop = 0;
    }
}

// Utility Functions
function getUserId() {
    const storedId = localStorage.getItem("userId");
    return storedId ? parseInt(storedId) : -1;
}

function getAuthToken() {
    return localStorage.getItem("authToken");
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], { 
        year: "numeric", 
        month: "short", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit" 
    });
}

function playNotificationSound() {
    try {
        const audio = new Audio("../sounds/notification.mp3");
        audio.play();
    } catch (error) {
        console.error("Error playing notification sound:", error);
    }
}

function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
}

// Handle visibility changes
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        userId = getUserId();
        authToken = getAuthToken();
        reconnectIfNeeded();
        fetchNotifications();
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", closeConnection);