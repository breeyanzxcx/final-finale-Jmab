document.addEventListener("DOMContentLoaded", () => {
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

    // Initialize custom popup for alerts
    const customPopup = document.createElement('div');
    customPopup.id = 'customPopup';
    customPopup.className = 'popup';
    customPopup.innerHTML = `
        <div class="popup-content">
            <h3>Notification</h3>
            <p id="customPopupMessage"></p>
            <div class="popup-buttons">
                <button id="customPopupOk" class="popup-btn confirm">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(customPopup);

    const customPopupOk = document.getElementById('customPopupOk');
    customPopupOk.addEventListener('click', () => {
        customPopup.style.display = 'none';
    });

    // Override default alert with custom popup
    window.alert = function(message) {
        const popupMessage = document.getElementById('customPopupMessage');
        popupMessage.textContent = message;
        customPopup.style.display = 'flex';
    };

    fetchUserCart();

    const checkoutButton = document.querySelector(".checkout-btn");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            const selectedItems = document.querySelectorAll(".item-checkbox:checked");
            const cartItems = document.querySelectorAll(".cart-item");

            if (cartItems.length === 0) {
                alert("Your cart is empty. Please add items before proceeding to checkout.");
                return;
            }

            if (selectedItems.length === 0) {
                alert("Please select a product to checkout.");
                return;
            }
            
            const selectedCartIds = Array.from(selectedItems).map(checkbox => {
                return checkbox.closest(".cart-item").dataset.cartId;
            });

            localStorage.setItem("selectedCartIds", JSON.stringify(selectedCartIds));
            window.location.href = "../HTML/checkout.html";
        });
    }

    const selectAllCheckbox = document.getElementById("select-all");
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", function () {
            toggleSelectAll();
            updateOrderSummary();
        });
    }

    const deleteButton = document.getElementById("delete-selected");
    if (deleteButton) {
        deleteButton.addEventListener("click", showDeleteSelectedConfirmation);
    }

    const returnBtn = document.getElementById("returnBtn");
    if (returnBtn) {
        returnBtn.addEventListener("click", function() {
            window.location.href = "../HTML/productPage.html?category=tires";
        });
    }
});

async function fetchUserCart() {
    const cartItemsContainer = document.querySelector(".cart-items-container");
    cartItemsContainer.innerHTML = "<div class='loading'>Loading your cart...</div>";

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

        if (response.status === 404) {
            cartItemsContainer.innerHTML = "<div class='empty-cart'>Your cart is empty.</div>";
            updateOrderSummaryEmpty();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Cart API Response:", data);

        if (data.success && data.cart && data.cart.length > 0) {
            displayCartItems(data.cart);
        } else {
            cartItemsContainer.innerHTML = "<div class='empty-cart'>Your cart is empty.</div>";
            updateOrderSummaryEmpty();
        }
    } catch (error) {
        console.error("Error fetching cart:", error);
        cartItemsContainer.innerHTML = "<div class='error'>Error loading cart. Please try again.</div>";
    }
}

function displayCartItems(cartItems) {
    const cartItemsContainer = document.querySelector(".cart-items-container");
    cartItemsContainer.innerHTML = "";

    cartItems.forEach(item => {
        const cartItem = document.createElement("div");
        cartItem.classList.add("cart-item");
        cartItem.dataset.cartId = item.cart_id;

        const rawPrice = item.variant_price;
        console.log(`Raw price for ${item.product_name}:`, rawPrice);
        const unitPrice = !isNaN(parseFloat(rawPrice)) && rawPrice !== null ? parseFloat(rawPrice) : 0;
        const quantity = item.quantity || 1;
        const totalPrice = unitPrice * quantity;
        const size = item.variant_size || "N/A";

        cartItem.innerHTML = `
            <input type="checkbox" class="item-checkbox">
            <div class="item-details">
                <img src="${item.product_image || 'https://via.placeholder.com/100'}" alt="${item.product_name}">
                <div class="item-info">
                    <h3>${item.product_name}</h3>
                    <p>Brand: ${item.product_brand || "Unknown"}</p>
                    <p>Size: ${size}</p>
                </div>
            </div>
            <div class="item-price" data-unit-price="${unitPrice}">₱${totalPrice.toFixed(2)}</div>
            <div class="quantity">
                <button class="qty-btn decrease">-</button>
                <input type="number" value="${quantity}" min="1" class="qty-input">
                <button class="qty-btn increase">+</button>
            </div>
        `;

        cartItemsContainer.appendChild(cartItem);
    });

    attachEventListeners();
    updateOrderSummary();
}

function updateOrderSummaryEmpty() {
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");

    if (subtotalElement) subtotalElement.textContent = "₱0.00";
    if (totalElement) totalElement.textContent = "₱50.00";
}

function attachEventListeners() {
    document.querySelectorAll(".increase").forEach(button => {
        button.addEventListener("click", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            const inputField = this.previousElementSibling;
            const newQuantity = parseInt(inputField.value) + 1;
            updateQuantity(cartId, newQuantity);
        });
    });

    document.querySelectorAll(".decrease").forEach(button => {
        button.addEventListener("click", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            const inputField = this.nextElementSibling;
            const currentQuantity = parseInt(inputField.value);
            if (currentQuantity > 1) {
                const newQuantity = currentQuantity - 1;
                updateQuantity(cartId, newQuantity);
            }
        });
    });

    document.querySelectorAll(".qty-input").forEach(input => {
        input.addEventListener("change", function () {
            const cartId = this.closest(".cart-item").dataset.cartId;
            const value = parseInt(this.value);
            this.value = isNaN(value) || value < 1 ? 1 : value;
            updateQuantity(cartId, parseInt(this.value));
        });
    });

    document.querySelectorAll(".item-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", updateOrderSummary);
    });
}

function updateOrderSummary() {
    const subtotalElement = document.getElementById("subtotal");
    const totalElement = document.getElementById("total");
    const cartItems = document.querySelectorAll(".cart-item");
    
    let subtotal = 0;
    const shippingFee = 50;

    cartItems.forEach(item => {
        const checkbox = item.querySelector(".item-checkbox");
        if (checkbox.checked) {
            const unitPrice = parseFloat(item.querySelector(".item-price").dataset.unitPrice) || 0;
            const quantity = parseInt(item.querySelector(".qty-input").value) || 1;
            const itemSubtotal = unitPrice * quantity;
            subtotal += itemSubtotal;

            item.querySelector(".item-price").textContent = `₱${itemSubtotal.toFixed(2)}`;

            console.log(`Item: ${item.querySelector("h3").textContent}`);
            console.log("Unit Price:", unitPrice);
            console.log("Quantity:", quantity);
            console.log("Item Subtotal:", itemSubtotal);
        }
    });

    console.log("Total Subtotal:", subtotal);

    subtotal = isNaN(subtotal) ? 0 : subtotal;

    if (subtotalElement) subtotalElement.textContent = `₱${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `₱${(subtotal + shippingFee).toFixed(2)}`;
}

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

                if (!response.ok) throw new Error("Failed to remove item");
                fetchUserCart();
                showSuccessMessage("Item removed successfully!");
            } catch (error) {
                console.error("Error removing item:", error);
                alert("Failed to remove item. Please try again.");
            }
        }
    );
}

async function removeSelectedItems() {
    const authToken = localStorage.getItem("authToken");
    const selectedItems = document.querySelectorAll(".item-checkbox:checked");

    try {
        let allSuccess = true;
        for (const checkbox of selectedItems) {
            const cartId = checkbox.closest(".cart-item").dataset.cartId;
            const response = await fetch(`http://localhost/jmab/final-jmab/api/carts/${cartId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });

            if (!response.ok) allSuccess = false;
        }

        if (allSuccess) {
            showSuccessMessage("Selected items removed successfully!");
        } else {
            alert("Some items could not be removed. Please try again.");
        }
        fetchUserCart();
    } catch (error) {
        console.error("Error removing selected items:", error);
        alert("An error occurred while removing the items.");
    }
}

function showDeleteSelectedConfirmation() {
    const selectedItems = document.querySelectorAll(".item-checkbox:checked");
    if (selectedItems.length === 0) {
        alert("No items selected for deletion.");
        return;
    }

    showConfirmationDialog(
        "Remove Items",
        "Are you sure you want to remove these items from your cart?",
        removeSelectedItems
    );
}

function showConfirmationDialog(title, message, confirmCallback) {
    const dialog = document.querySelector('.confirmation-dialog');
    const titleElement = dialog.querySelector('.dialog-title');
    const messageElement = dialog.querySelector('.dialog-message');
    const confirmButton = dialog.querySelector('.confirm-btn');
    const cancelButton = dialog.querySelector('.cancel-btn');

    titleElement.textContent = title;
    messageElement.textContent = message;
    dialog.style.display = 'flex';

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

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById("select-all");
    const itemCheckboxes = document.querySelectorAll(".item-checkbox");

    itemCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateOrderSummary();
}

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

        if (!response.ok) throw new Error("Failed to update quantity");
        fetchUserCart();
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Quantity exceeds available stock.");
    }
}

function showSuccessMessage(message) {
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
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