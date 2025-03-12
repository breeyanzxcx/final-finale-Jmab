document.addEventListener("DOMContentLoaded", () => {
    //confirmation dialog element
    const confirmationDialog = document.createElement('div');
    confirmationDialog.className = 'confirmation-dialog';
    confirmationDialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-icon">⚠️</div>
            <div class="dialog-title">Remove Item</div>
            <div class="dialog-message">Are you sure you want to remove this item from your cart?</div>
            <div class="dialog-buttons">
                <button class="dialog-btn cancel-btn">Cancel</button>
                <button class="dialog-btn confirm-btn">Remove</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmationDialog);

    fetchUserCart();

    const checkoutButton = document.querySelector(".checkout-btn");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            // Check if any items are selected
            const selectedItems = document.querySelectorAll(".item-checkbox:checked");
            
            // check if cart is empty
            const cartItems = document.querySelectorAll(".cart-item");
            
            if (cartItems.length === 0) {
                alert("Your cart is empty. Please add items before proceeding to checkout.");
                return;
            }
            
            if (selectedItems.length === 0) {
                alert("Please select at least one item to proceed to checkout.");
                return;
            }
            
            // Get the cart IDs of selected items
            const selectedCartIds = Array.from(selectedItems).map(checkbox => {
                return checkbox.closest(".cart-item").dataset.cartId;
            });
            
            localStorage.setItem("selectedCartIds", JSON.stringify(selectedCartIds));
            
            window.location.href = "../HTML/checkout.html";
        });
    }

    // Select All checkbox listener
    const selectAllCheckbox = document.getElementById("select-all");
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", toggleSelectAll);
    }

    // Delete Selected Items button - Use the custom confirmation
    const deleteButton = document.querySelector(".delete-btn");
    if (deleteButton) {
        deleteButton.addEventListener("click", showDeleteSelectedConfirmation);
    }

    // Back button 
    const returnBtn = document.getElementById("returnBtn");
    if (returnBtn) {
        returnBtn.addEventListener("click", function() {
            // Simple navigation back to product page
            window.location.href = "../HTML/productPage.html?category=tires";
        });
    }
});

//Fetch and display user's cart
async function fetchUserCart() {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");

    if (!userId || !authToken) {
        alert("Please log in to proceed with checkout.");
        window.location.href = "../HTML/sign-in.php";
        return;
    }

    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/carts/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });

        // Handle 404 as empty cart instead of error
        if (response.status === 404) {
            document.querySelector(".cart-items-container").innerHTML = "<h3>Your cart is empty.</h3>";
            updateOrderSummaryEmpty();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Cart Data:", data);

        if (data.success && data.cart && data.cart.length > 0) {
            displayCartItems(data.cart);
        } else {
            document.querySelector(".cart-items-container").innerHTML = "<h3>Your cart is empty.</h3>";
            // Reset order summary when cart is empty
            updateOrderSummaryEmpty();
        }
    } catch (error) {
        console.error("Error fetching cart:", error);
        document.querySelector(".cart-items-container").innerHTML = "<h3>Your cart is empty.</h3>";
        updateOrderSummaryEmpty();
    }
}

//Display cart items
function displayCartItems(cartItems) {
    const cartItemsContainer = document.querySelector(".cart-items-container");
    if (!cartItemsContainer) {
        console.error("Cart items container not found.");
        return;
    }

    cartItemsContainer.innerHTML = ""; 

    cartItems.forEach(item => {
        const cartItem = document.createElement("div");
        cartItem.classList.add("cart-item");
        cartItem.dataset.cartId = item.cart_id;

        cartItem.innerHTML = `
            <input type="checkbox" class="item-checkbox">
            <div class="item-details">
                <img src="${item.product_image || 'https://via.placeholder.com/100'}" alt="${item.product_name}">
                <div class="item-info">
                    <h3>${item.product_name}</h3>
                    <p>Brand: ${item.product_brand || "Unknown"}</p>
                </div>
            </div>
            <div class="item-price">₱${parseFloat(item.product_price).toFixed(2)}</div>
            <div class="quantity">
                <button class="qty-btn decrease">-</button>
                <input type="number" value="${item.quantity}" min="1" class="qty-input">
                <button class="qty-btn increase">+</button>
            </div>
            <div class="item-actions">
                <img src="../imahe/trashIcon.png" alt="Remove" class="delete-btn">
            </div>
        `;

        cartItemsContainer.appendChild(cartItem);
    });

    attachEventListeners();
    updateOrderSummary(cartItems);
}

// Reset order summary when cart is empty
function updateOrderSummaryEmpty() {
    const subtotalElement = document.querySelector(".order-summary p:nth-child(2) span");
    const totalElement = document.querySelector(".order-summary p:nth-child(4) span");

    if (subtotalElement) subtotalElement.textContent = "₱0.00";
    if (totalElement) totalElement.textContent = "₱50.00"; // Just shipping fee
}

function attachEventListeners() {
    document.querySelectorAll(".increase").forEach(button => {
        button.addEventListener("click", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            const inputField = this.previousElementSibling;
            updateQuantity(cartId, parseInt(inputField.value) + 1);
        });
    });

    document.querySelectorAll(".decrease").forEach(button => {
        button.addEventListener("click", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            const inputField = this.nextElementSibling;
            if (parseInt(inputField.value) > 1) {
                updateQuantity(cartId, parseInt(inputField.value) - 1);
            }
        });
    });

    document.querySelectorAll(".qty-input").forEach(input => {
        input.addEventListener("change", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            if (parseInt(this.value) < 1) {
                this.value = 1;
            }
            updateQuantity(cartId, parseInt(this.value));
        });
    });

    document.querySelectorAll(".item-actions .delete-btn").forEach(button => {
        button.addEventListener("click", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            removeFromCart(cartId);
        });
    });
}

//Update order summary
function updateOrderSummary(cartItems) {
    const subtotalElement = document.querySelector(".order-summary p:nth-child(2) span");
    const totalElement = document.querySelector(".order-summary p:nth-child(4) span");

    if (!subtotalElement || !totalElement) {
        console.error("Order summary elements not found.");
        return;
    }

    let totalPrice = 0;

    cartItems.forEach(item => {
        totalPrice += parseFloat(item.total_price || (item.product_price * item.quantity));
    });

    subtotalElement.textContent = `₱${totalPrice.toFixed(2)}`;
    totalElement.textContent = `₱${(totalPrice + 50).toFixed(2)}`; // Shipping fee
}

//Remove a single item
async function removeFromCart(cartId) {
    showConfirmationDialog(
        "Remove Item", 
        "Are you sure you want to remove this item from your cart?",
        async () => {
            const authToken = localStorage.getItem("authToken");
            try {
                const response = await fetch(`http://localhost/jmab/final-jmab/api/carts/${cartId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                alert("Product removed.");
                fetchUserCart(); // Refresh cart
            } catch (error) {
                console.error("Error removing item:", error);
                alert("An error occurred while removing the item.");
            }
        }
    );
}

//Remove selected items
async function removeSelectedItems() {
    const authToken = localStorage.getItem("authToken");
    const selectedItems = document.querySelectorAll(".item-checkbox:checked");

    try {
        let allSuccess = true;
        
        for (const checkbox of selectedItems) {
            const cartItem = checkbox.closest(".cart-item");
            if (!cartItem) {
                console.error("Cart item not found for checkbox");
                continue;
            }
            
            const cartId = cartItem.dataset.cartId;
            if (!cartId) {
                console.error("Cart ID not found for item");
                continue;
            }

            const response = await fetch(`http://localhost/jmab/final-jmab/api/carts/${cartId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            
            if (!response.ok) {
                allSuccess = false;
                console.error(`Failed to delete item with cart ID ${cartId}`);
            }
        }

        if (allSuccess) {
            alert("Selected products removed.");
        } else {
            alert("Some products could not be removed. Please try again.");
        }
        
        fetchUserCart(); // Refresh cart
    } catch (error) {
        console.error("Error removing selected items:", error);
        alert("An error occurred while removing the items.");
    }
}

// Show confirmation for multiple items
function showDeleteSelectedConfirmation() {
    const selectedItems = document.querySelectorAll(".item-checkbox:checked");
    if (selectedItems.length === 0) {
        alert("No items selected for deletion.");
        return;
    }

    showConfirmationDialog(
        "Remove Items", 
        `Are you sure you want to remove ${selectedItems.length} item(s) from your cart?`,
        removeSelectedItems
    );
}

// Main confirmation dialog function
function showConfirmationDialog(title, message, confirmCallback) {
    const dialog = document.querySelector('.confirmation-dialog');
    const titleElement = dialog.querySelector('.dialog-title');
    const messageElement = dialog.querySelector('.dialog-message');
    const confirmButton = dialog.querySelector('.confirm-btn');
    const cancelButton = dialog.querySelector('.cancel-btn');
    
    // Set dialog content
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    // Show the dialog
    dialog.style.display = 'flex';
    
    // Handle button clicks
    const handleConfirm = () => {
        dialog.style.display = 'none';
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
        confirmCallback();
    };
    
    const handleCancel = () => {
        dialog.style.display = 'none';
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
    };
    
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
}

//Select All Function
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById("select-all");
    const itemCheckboxes = document.querySelectorAll(".item-checkbox");

    itemCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Function to update quantity 
async function updateQuantity(cartId, quantity) {
    const authToken = localStorage.getItem("authToken");
    
    try {
        const response = await fetch(`http://localhost/jmab/final-jmab/api/carts/${cartId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ quantity: quantity })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        fetchUserCart(); // Refresh cart to update prices
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity. Please try again.");
    }
}
// Optional: Function to update cart counter if you have one in your UI
/*function updateCartCounter() {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) return;
    
    fetch(`http://localhost/jmab/final-jmab/api/carts?user_id=${userId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(result => {
        if (result.success && result.cart) {
            // Calculate total items in cart
            const totalItems = result.cart.reduce((sum, item) => sum + parseInt(item.quantity), 0);
            
            // Update cart counter if you have one in your UI
            // Example: document.getElementById('cart-counter').textContent = totalItems;
        }
    })
    .catch(error => console.error("Error fetching cart count:", error));
}*/