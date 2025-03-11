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



    if (productId) {
        // If "Buy Now" was clicked, fetch only 1 product
        await fetchBuyNowItem(productId, quantity);
    } else {
        // If checkout is from the cart, fetch only selected items
        await fetchSelectedCartItems();
    }

    document.querySelector(".confirm-btn").addEventListener("click", checkout);
    
    // Check for pending payments when the page loads
    checkPendingPayments();
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

// Fetch single product (for Buy Now)
async function fetchBuyNowItem(productId, quantity) {
    try {
        const response = await fetch("http://localhost/jmab/final-jmab/api/products");
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
    // Get selected cart IDs from localStorage
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
            // Filter cart items to show only selected ones
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
        // Create a normalized item object that works for both cart items and buy now items
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
        address: document.getElementById("address").value,
        payment_method: document.getElementById("payment-method").value
    };

    // Form validation
    if (!shippingInfo.full_name || !shippingInfo.address) {
        alert("Please fill in all shipping information fields.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    const quantity = parseInt(urlParams.get("quantity")) || 1;

    try {
        // Get selected cart IDs
        const selectedCartIds = JSON.parse(localStorage.getItem("selectedCartIds") || "[]");
        
        // Match the format in Postman
        const orderData = {
            cart_ids: selectedCartIds.map(id => parseInt(id)),
            payment_method: shippingInfo.payment_method
        };

        // Disable the checkout button and show loading state
        const checkoutButton = document.querySelector(".confirm-btn");
        if (checkoutButton) {
            checkoutButton.disabled = true;
            checkoutButton.textContent = "Processing...";
        }

        // Use the same endpoint format as in Postman
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
                // Store payment data for future reference
                PaymentDataManager.storePaymentData(
                    result.order_id || "unknown", 
                    "gcash",
                    result.payment_link
                );
                
                // Show confirmation before redirect
                if (confirm("You will now be redirected to complete your payment via GCash. Click OK to proceed.")) {
                    // For GCash, redirect to the payment link
                    window.location.href = result.payment_link;
                } else {
                    // If user cancels, redirect to a page where they can resume payment
                    alert("You can complete your payment later from your account page.");
                    window.location.href = "account.html";
                }
            } else {
                // For COD or if no payment link is provided
                alert("Order placed successfully!");
               // window.location.href = "order-confirmation.html";
            }
        } else {
            alert(result.errors ? result.errors.join(", ") : "Failed to place order.");
            
            // Re-enable the checkout button
            if (checkoutButton) {
                checkoutButton.disabled = false;
                checkoutButton.textContent = "Confirm Order";
            }
        }
    } catch (error) {
        console.error("Error during checkout:", error);
        alert("An error occurred during checkout. Please try again.");
        
        // Re-enable the checkout button
        const checkoutButton = document.querySelector(".confirm-btn");
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = "Confirm Order";
        }
    }
}

// Check for pending payments
function checkPendingPayments() {
    const pendingPayment = PaymentDataManager.getPaymentData();
    
    if (pendingPayment && pendingPayment.paymentMethod === "gcash") {
        // Calculate how long ago the payment was initiated
        const paymentTime = new Date(pendingPayment.timestamp);
        const currentTime = new Date();
        const hoursSincePending = (currentTime - paymentTime) / (1000 * 60 * 60);
        
        // Only show the prompt if the pending payment is less than 24 hours old
        if (hoursSincePending < 24) {
            // Show a notification about pending payment
            const resumePayment = confirm(
                "You have a pending GCash payment. Do you want to complete your payment now?"
            );
            
            if (resumePayment) {
                window.location.href = pendingPayment.paymentLink;
            } else {
                // If they decline, give them another chance later
                console.log("User declined to complete pending payment");
            }
        } else {
            // If the payment is older than 24 hours, just clear it
            PaymentDataManager.clearPaymentData();
        }
    }
}