// Replace the old populateAddressDropdown function with this new one
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    const quantity = parseInt(urlParams.get("quantity")) || 1;
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");

    if (!userId || !authToken) {
        alert("Please log in to proceed with checkout.");
        window.location.href = "../HTML/sign-in.php";
        return;
    }

    console.log("User ID:", userId);
    console.log("Auth Token:", authToken);

    // Use the new function to fetch user data and populate addresses
    await fetchUserAndPopulateAddresses();

    if (productId) {
        // If "Buy Now" was clicked, fetch only 1 product
        await fetchBuyNowItem(productId, quantity);
    } else {
        // If checkout is from the cart, fetch only selected items
        await fetchSelectedCartItems();
    }

    document.querySelector(".confirm-btn").addEventListener("click", checkout);
    
    // Check for pending payments when the page loads
    checkPendingPayments(userId);
   
});

// Payment related data storage
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

// Fetch user data and populate address dropdown
async function fetchUserAndPopulateAddresses() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");
    const addressSelect = document.getElementById("address-id");
    
    console.log("Fetching user data for address population...");
    
    if (!addressSelect) {
        console.error("Could not find address-id select element!");
        return;
    }

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

        // Clear any existing options
        addressSelect.innerHTML = '<option value="">Select an address</option>';
        
        if (data.success && data.user && data.user.addresses && data.user.addresses.length > 0) {
            // Add each address as an option
            data.user.addresses.forEach(address => {
                const option = document.createElement("option");
                option.value = address.id;
                option.textContent = `${address.home_address}, ${address.barangay}, ${address.city}${address.is_default ? " (Default)" : ""}`;
                addressSelect.appendChild(option);
                
                // Auto-select default address
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
    }
}

// Fetch single product (for Buy Now)
async function fetchBuyNowItem(productId, quantity) {
    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/products/${productId}`);
        const data = await response.json();

        if (data.success) {
            const product = data.products.find(p => String(p.product_id) === String(productId));
            if (product) {
                displaySelectedItems([{ ...product, quantity }]); 
                updateOrderSummary(product.price, quantity);
            } else {
                document.getElementById("selected-items-container").innerHTML = "<p>Product not found.</p>";
            }
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        document.getElementById("selected-items-container").innerHTML = "<p>Failed to load product.</p>";
    }
}

// Fetch only selected cart items
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
            );
            
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
    container.innerHTML = ""; // Clear previous items

    items.forEach(item => {
        const normalizedItem = {
            name: item.product_name || item.name,
            brand: item.product_brand || item.brand || 'N/A',
            price: item.product_price || item.price,
            image: item.product_image || item.image_url || '../imahe/default-image.png',
            quantity: item.quantity
        };

        const itemElement = document.createElement("div");
        itemElement.classList.add("selected-item");
        itemElement.innerHTML = `
            <img src="${normalizedItem.image}" alt="${normalizedItem.name}">
            <div class="item-info">
                <h3>${normalizedItem.name}</h3>
                <p>Brand: ${normalizedItem.brand}</p>
                <p>Price: ₱${parseFloat(normalizedItem.price).toFixed(2)}</p>
                <p>Quantity: ${normalizedItem.quantity}</p>
            </div>
        `;
        container.appendChild(itemElement);
    });
}

// Update Order Summary
function updateOrderSummary(price, quantity) {
    const subtotal = price * quantity;
    document.getElementById("subtotal").textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById("total").textContent = `₱${(subtotal + 50).toFixed(2)}`;
}

function updateOrderSummaryFromCart(cartItems) {
    const subtotal = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.product_price || item.price);
        return sum + price * item.quantity;
    }, 0);
    
    document.getElementById("subtotal").textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById("total").textContent = `₱${(subtotal + 50).toFixed(2)}`;
}

// Checkout Function
async function checkout() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");
    
    const shippingInfo = {
        full_name: document.getElementById("full-name").value,
        address_id: document.getElementById("address-id").value,
        payment_method: document.getElementById("payment-method").value
    };

    // Form validation
    if (!shippingInfo.full_name || !shippingInfo.address_id) {
        alert("Please fill in all shipping information fields, including selecting an address.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    const quantity = parseInt(urlParams.get("quantity")) || 1;

    try {
        // Get selected cart IDs
        const selectedCartIds = JSON.parse(localStorage.getItem("selectedCartIds") || "[]");
        
        // Updated order data with address_id
        const orderData = {
            cart_ids: selectedCartIds.map(id => parseInt(id)),
            address_id: parseInt(shippingInfo.address_id), // Ensure it's an integer
            payment_method: shippingInfo.payment_method
        };

        // If it's a "Buy Now" order, include product_id and quantity instead of cart_ids
        if (productId) {
            orderData.product_id = parseInt(productId);
            orderData.quantity = quantity;
            delete orderData.cart_ids; // Remove cart_ids for Buy Now
        }

        // Disable the checkout button and show loading state
        const checkoutButton = document.querySelector(".confirm-btn");
        if (checkoutButton) {
            checkoutButton.disabled = true;
            checkoutButton.textContent = "Processing...";
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
            // Clear cart items from localStorage
            localStorage.removeItem("selectedCartIds");
            
            // Check for payment method
            if (shippingInfo.payment_method === "gcash" && result.payment_link) {
                PaymentDataManager.storePaymentData(
                    result.order_id || "unknown", 
                    "gcash",
                    result.payment_link
                );
                
                if (confirm("You will now be redirected to complete your payment via GCash. Click OK to proceed.")) {
                    window.location.href = result.payment_link;
                } else {
                    alert("You can complete your payment later from your account page.");
                    window.location.href = "account.html";
                }
            } else {
                alert("Order placed successfully!");
                // window.location.href = "order-confirmation.html";
            }
        } else {
            alert(result.errors ? result.errors.join(", ") : "Failed to place order.");
            
            if (checkoutButton) {
                checkoutButton.disabled = false;
                checkoutButton.textContent = "Confirm Order";
            }
        }
    } catch (error) {
        console.error("Error during checkout:", error);
        alert("An error occurred during checkout. Please try again.");
        
        const checkoutButton = document.querySelector(".confirm-btn");
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = "Confirm Order";
        }
    }
}

function checkPendingPayments(userId) {
    console.log("Starting checkPendingPayments for userId:", userId);

    const authToken = localStorage.getItem("authToken");
    const paymentData = PaymentDataManager.getPaymentData(); // Get stored payment data

    fetch(`http://localhost/jmab/final-jmab/api/orders/${userId}`, {
        headers: {
            "Authorization": `Bearer ${authToken}`
        }
    })
        .then(response => {
            console.log("Fetch response received:", response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Parsed JSON data:", data);

            if (data.success && data.orders && data.orders.length > 0) {
                console.log("Total orders found:", data.orders.length);
                console.log("All orders:", data.orders);
                
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
                        // Use stored payment_link if available, otherwise log an error
                        const paymentLink = paymentData && paymentData.orderId === pendingPayment.order_id 
                            ? paymentData.paymentLink 
                            : null;

                        if (!paymentLink) {
                            console.error("No valid payment link found for order:", pendingPayment.order_id);
                            alert("Unable to redirect to payment page. Please try again or contact support.");
                            return;
                        }

                        const resumePayment = confirm(
                            "You have a pending GCash payment. Do you want to complete your payment now?"
                        );
                        if (resumePayment) {
                            window.location.href = paymentLink; // Use the stored checkout_url
                        } else {
                            console.log("User declined to complete pending payment");
                        }
                    } else {
                        console.log("Pending payment is over 24 hours old:", pendingPayment.order_id);
                    }
                } else {
                    console.log("No pending GCash payments found. All GCash orders status:", 
                        data.orders
                            .filter(order => order.payment_method === "gcash")
                            .map(order => order.payment_status)
                    );
                }
            } else {
                console.log("No orders found or invalid data structure:", data);
            }
        })
        .catch(error => {
            console.error("Error in fetch process:", error);
        });
}
