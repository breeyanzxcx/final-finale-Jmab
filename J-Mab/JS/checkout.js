document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    const quantity = parseInt(urlParams.get("quantity")) || 1;
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");

    if (!userId || !authToken) {
        showNotificationPopup("Please log in to proceed with checkout.", () => {
            window.location.href = "../HTML/sign-in.php";
        });
        return;
    }

    console.log("User ID:", userId);
    console.log("Auth Token:", authToken);

    // Initialize WebSocket for notifications
    const notificationWS = new WebSocketManager("ws://localhost:8081/final-jmab/api", "notification");
    notificationWS.connect(userId, authToken, (data) => {
        console.log("[Notification] Received on checkout page:", data);
    });

    await fetchUserAndPopulateAddresses();

    if (productId) {
        await fetchBuyNowItem(productId, quantity);
    } else {
        await fetchSelectedCartItems();
    }

    document.querySelector(".confirm-btn").addEventListener("click", () => checkout(notificationWS));
    checkPendingPayments(userId);

    // Cleanup WebSocket on unload
    window.addEventListener("beforeunload", () => {
        notificationWS.close();
    });
});

class PaymentDataManager {
    static storePaymentData(orderId, paymentMethod, paymentLink) {
        const paymentData = {
            orderId: orderId,
            paymentMethod: paymentMethod,
            paymentLink: paymentLink,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem("pendingPaymentData", JSON.stringify(paymentData));
    }

    static getPaymentData() {
        const data = localStorage.getItem("pendingPaymentData");
        return data ? JSON.parse(data) : null;
    }

    static clearPaymentData() {
        localStorage.removeItem("pendingPaymentData");
    }
}

async function fetchUserAndPopulateAddresses() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");
    const addressSelect = document.getElementById("address-id");
    const fullNameInput = document.getElementById("full-name");
    const addAddressBtn = document.getElementById("add-address-btn"); 
    
    console.log("Fetching user data for address population and full name...");
    console.log("userId:", userId);
    console.log("authToken:", authToken);

    if (!addressSelect || !fullNameInput || !addAddressBtn) {
        console.error("Could not find DOM elements - addressSelect:", addressSelect, "fullNameInput:", fullNameInput, "addAddressBtn:", addAddressBtn);
        return;
    }

    addAddressBtn.addEventListener("click", () => {
        console.log("Add address button clicked");
        window.location.href = "../HTML/address.html"; // Redirect to address management page
    });

    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("User data response:", data);

        // Populate full name
        if (data.success && data.user) {
            const fullName = data.user.full_name || data.user.name || `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim();
            if (fullName) {
                fullNameInput.value = fullName;
                console.log(`Full name set to: "${fullName}"`);
            } else {
                console.warn("No full name found in user data:", data.user);
                fullNameInput.value = "";
            }
        } else {
            console.warn("Invalid response structure or no user data:", data);
            fullNameInput.value = "";
        }

        // Populate addresses
        addressSelect.innerHTML = '<option value="">Select an address</option>';
        
        if (data.success && data.user && data.user.addresses && data.user.addresses.length > 0) {
            data.user.addresses.forEach(address => {
                const option = document.createElement("option");
                option.value = address.id;
                option.textContent = `${address.home_address}, ${address.barangay}, ${address.city}${address.is_default ? " (Default)" : ""}`;
                addressSelect.appendChild(option);
                if (address.is_default) {
                    addressSelect.value = address.id;
                }
            });
            console.log(`Added ${data.user.addresses.length} addresses to dropdown`);
        } else {
            console.warn("No addresses found for user");
            addressSelect.innerHTML = '<option value="">No addresses available</option>';
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        addressSelect.innerHTML = '<option value="">Failed to load addresses</option>';
        fullNameInput.value = "";
    }
}

async function fetchBuyNowItem(productId, quantity) {
    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/products/${productId}`);
        const data = await response.json();
        console.log("Buy Now Product Data:", data);

        if (data.success && data.products) {
            const product = data.products.find(p => String(p.product_id) === String(productId));
            if (product) {
                const price = product.variants && product.variants.length > 0 
                    ? parseFloat(product.variants[0].price) || 0 
                    : parseFloat(product.price) || 0;
                const normalizedProduct = { ...product, price, quantity };
                displaySelectedItems([normalizedProduct]);
                updateOrderSummary(price, quantity);
            } else {
                document.getElementById("selected-items-container").innerHTML = "<p>Product not found.</p>";
            }
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        document.getElementById("selected-items-container").innerHTML = "<p>Failed to load product.</p>";
    }
}

async function fetchSelectedCartItems() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");
    const selectedCartIds = JSON.parse(localStorage.getItem("selectedCartIds") || "[]");
    
    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/carts/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        console.log("Cart Data:", data);

        if (data.success && data.cart && data.cart.length > 0) {
            const selectedItems = data.cart.filter(item => 
                selectedCartIds.includes(item.cart_id.toString())
            ).map(item => ({
                ...item,
                price: parseFloat(item.variant_price) || 0
            }));
            
            if (selectedItems.length > 0) {
                displaySelectedItems(selectedItems);
                updateOrderSummaryFromCart(selectedItems);
            } else {
                document.getElementById("selected-items-container").innerHTML = "<p>No items selected.</p>";
            }
        } else {
            document.getElementById("selected-items-container").innerHTML = "<p>Your cart is empty.</p>";
        }
    } catch (error) {
        console.error("Error fetching cart items:", error);
        document.getElementById("selected-items-container").innerHTML = "<p>Failed to load cart items.</p>";
    }
}

function displaySelectedItems(items) {
    const container = document.getElementById("selected-items-container");
    container.innerHTML = "";

    items.forEach(item => {
        let itemPrice = 0;
        if (item.price !== undefined && item.price !== null) {
            itemPrice = parseFloat(item.price);
        } else if (item.variant_price !== undefined && item.variant_price !== null) {
            itemPrice = parseFloat(item.variant_price);
        }
        if (isNaN(itemPrice)) itemPrice = 0;

        const normalizedItem = {
            name: item.product_name || item.name || 'Unknown Product',
            brand: item.product_brand || item.brand || 'N/A',
            price: itemPrice,
            image: item.product_image || item.image_url || '../imahe/default-image.png',
            quantity: item.quantity || 1,
            size: item.variant_size || "N/A"
        };

        const itemElement = document.createElement("div");
        itemElement.classList.add("selected-item");
        itemElement.innerHTML = `
            <img src="${normalizedItem.image}" alt="${normalizedItem.name}">
            <div class="item-info">
                <h3>${normalizedItem.name}</h3>
                <p>Brand: ${normalizedItem.brand}</p>
                <p>Size: ${normalizedItem.size}</p>
                <p>Price: ₱${normalizedItem.price.toFixed(2)}</p>
                <p>Quantity: ${normalizedItem.quantity}</p>
            </div>
        `;
        container.appendChild(itemElement);
    });
}

function updateOrderSummary(price, quantity) {
    const parsedPrice = parseFloat(price) || 0;
    const parsedQuantity = parseInt(quantity) || 1;
    const subtotal = parsedPrice * parsedQuantity;
    
    document.getElementById("subtotal").textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById("total").textContent = `₱${(subtotal + 50).toFixed(2)}`;
}

function updateOrderSummaryFromCart(cartItems) {
    const subtotal = cartItems.reduce((sum, item) => {
        let itemPrice = 0;
        if (item.price !== undefined && item.price !== null) {
            itemPrice = parseFloat(item.price);
        } else if (item.variant_price !== undefined && item.variant_price !== null) {
            itemPrice = parseFloat(item.variant_price);
        }
        if (isNaN(itemPrice)) itemPrice = 0;
        
        const quantity = parseInt(item.quantity) || 1;
        return sum + itemPrice * quantity;
    }, 0);
    
    document.getElementById("subtotal").textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById("total").textContent = `₱${(subtotal + 50).toFixed(2)}`;
}

async function checkout(notificationWS) {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");
    
    const shippingInfo = {
        full_name: document.getElementById("full-name").value,
        address_id: document.getElementById("address-id").value,
        payment_method: document.getElementById("payment-method").value
    };

    if (!shippingInfo.full_name || !shippingInfo.address_id) {
        showNotificationPopup("Please fill in all shipping information fields, including selecting an address.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    const quantity = parseInt(urlParams.get("quantity")) || 1;

    try {
        const selectedCartIds = JSON.parse(localStorage.getItem("selectedCartIds") || "[]");
        
        const orderData = {
            address_id: parseInt(shippingInfo.address_id),
            payment_method: shippingInfo.payment_method
        };

        if (productId) {
            orderData.product_id = parseInt(productId);
            orderData.quantity = quantity;
            const sizeSelect = document.getElementById("size");
            if (sizeSelect) {
                orderData.variant_id = sizeSelect.value;
            }
        } else if (selectedCartIds.length > 0) {
            orderData.cart_ids = selectedCartIds.map(id => parseInt(id));
        } else {
            showNotificationPopup("No items selected for checkout.");
            return;
        }

        const checkoutButton = document.querySelector(".confirm-btn");
        if (checkoutButton) {
            checkoutButton.disabled = true;
            checkoutButton.textContent = "Order Placed";
        }

        console.log("Sending order data:", JSON.stringify(orderData, null, 2));

        const response = await fetch(`http://localhost/jmab/final-jmab/api/orders/${userId}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${authToken}` 
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        console.log("Order result:", result);

        if (response.ok && result.success) {
            localStorage.removeItem("selectedCartIds");

            // Send notification to admins via WebSocket
            const notificationData = {
                type: "order_update",
                title: "New Order Placed",
                message: `Order #${result.order_id} has been created by ${shippingInfo.full_name}.`,
                order_id: result.order_id,
                user_id: userId, // Sender (customer)
                created_at: new Date().toISOString(),
                is_read: 0
            };
            notificationWS.send(notificationData);
            console.log("Notification sent to admins:", notificationData);

            if (shippingInfo.payment_method === "gcash" && result.payment_link) {
                PaymentDataManager.storePaymentData(
                    result.order_id || "unknown",
                    "gcash",
                    result.payment_link
                );
                
                if (confirm("You will now be redirected to complete your payment via GCash. Click OK to proceed.")) {
                    window.location.href = result.payment_link;
                } else {
                    showNotificationPopup("You can complete your payment later from your account page.", () => {
                        window.location.href = "account.html";
                    });
                }
            } else {
                showNotificationPopup("Order placed successfully! Redirecting to your cart...", () => {
                    window.location.href = "../HTML/userCart.html";
                });
            }
        } else {
            showNotificationPopup(result.errors ? result.errors.join(", ") : "Failed to place order.");
            if (checkoutButton) {
                checkoutButton.disabled = false;
                checkoutButton.textContent = "Place Order";
            }
        }
    } catch (error) {
        console.error("Error during checkout:", error);
        showNotificationPopup("An error occurred during checkout. Please try again.");
        const checkoutButton = document.querySelector(".confirm-btn");
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = "Place Order";
        }
    }
}

function checkPendingPayments(userId) {
    console.log("Starting checkPendingPayments for userId:", userId);

    const authToken = localStorage.getItem("authToken");
    const paymentData = PaymentDataManager.getPaymentData();

    fetch(`http://localhost/jmab/final-jmab/api/orders/${userId}`, {
        headers: {
            "Authorization": `Bearer ${authToken}`
        }
    })
    .then(response => {
        console.log("Fetch response received:", response);
        if (!response.ok) {
            if (response.status === 404) {
                console.log("No orders found for user (404), likely no orders yet.");
                return { success: true, orders: [] };
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Parsed JSON data:", data);

        if (data.success && data.orders && data.orders.length > 0) {
            const pendingPayment = data.orders.find(order => 
                order.payment_method === "gcash" && 
                order.payment_status === "pending"
            );

            if (pendingPayment) {
                console.log("Found pending payment:", pendingPayment);
                const paymentTime = new Date(pendingPayment.created_at);
                const currentTime = new Date();
                const hoursSincePending = (currentTime - paymentTime) / (1000 * 60 * 60);

                if (hoursSincePending < 24) {
                    const paymentLink = paymentData && paymentData.orderId === pendingPayment.order_id 
                        ? paymentData.paymentLink 
                        : null;

                    if (!paymentLink) {
                        console.error("No valid payment link found for order:", pendingPayment.order_id);
                        showNotificationPopup("Unable to redirect to payment page. Please try again or contact support.");
                        return;
                    }

                    const resumePayment = confirm(
                        "You have a pending GCash payment. Do you want to complete your payment now?"
                    );
                    if (resumePayment) {
                        window.location.href = paymentLink;
                    }
                }
            }
        }
    })
    .catch(error => {
        console.error("Error in fetch process:", error);
    });
}

function showNotificationPopup(message, callback = null) {
    const popup = document.getElementById("notificationPopup");
    const messageElement = document.getElementById("notificationMessage");
    const okButton = document.getElementById("notificationOkBtn");

    messageElement.textContent = message;
    popup.style.display = "flex";

    okButton.onclick = function() {
        popup.style.display = "none";
        if (callback) callback();
    };
}