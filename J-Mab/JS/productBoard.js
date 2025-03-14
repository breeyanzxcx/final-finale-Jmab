document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');
    console.log('Product ID:', productId);
    
    let availableStock = 0;

    // Popup elements
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';
    
    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';
    
    const popupHTML = `
        <div class="popup-header">
            <h3>Shopping Cart</h3>
        </div>
        <div class="popup-content">
            <div class="checkmark-circle">
                <div class="background"></div>
                <div class="checkmark"></div>
            </div>
            <p id="popup-message">Item added to your cart successfully!</p>
        </div>
        <div class="popup-buttons">
            <button class="popup-btn popup-btn-secondary" id="popup-continue">Continue Shopping</button>
            <button class="popup-btn popup-btn-primary" id="popup-view-cart">View Cart</button>
        </div>
    `;
    
    popupContainer.innerHTML = popupHTML;
    popupOverlay.appendChild(popupContainer);
    document.body.appendChild(popupOverlay);
    
    // Popup event listeners
    document.getElementById('popup-continue').addEventListener('click', () => {
        popupOverlay.classList.remove('active');
    });
    
    document.getElementById('popup-view-cart').addEventListener('click', () => {
        window.location.href = "../HTML/userCart.html";
    });

    if (productId) {
        try {
            const response = await fetch('http://localhost/jmab/final-jmab/api/products');
            const data = await response.json();
            console.log('API Response:', data);

            if (data.success && Array.isArray(data.products)) {
                const product = data.products.find(p => String(p.product_id) === String(productId));
                console.log('Found Product:', product);

                if (product) {
                    availableStock = parseInt(product.stock) || 0;
                    
                    // Update product details
                    document.querySelector('.product-img').src = product.image_url || './imahe/default-image.png';
                    document.querySelector('.product-img').alt = product.name || 'Product';
                    document.getElementById('product-name').textContent = product.name || 'Unnamed Product';
                    document.getElementById('product-description').textContent = product.description || 'No description available';
                    document.getElementById('product-brand').textContent = `Brand: ${product.brand || 'N/A'}`;
                    document.getElementById('product-price').textContent = `₱${product.price || '0.00'}`;
                    
                    // Update size selector
                    const sizeSelect = document.getElementById('size');
                    sizeSelect.innerHTML = product.size 
                        ? `<option value="${product.size}">${product.size}</option>`
                        : '<option value="">N/A</option>';

                    // Add voltage info if available
                    if (product.voltage) {
                        const voltageInfo = document.createElement('p');
                        voltageInfo.textContent = `Voltage: ${product.voltage}`;
                        document.querySelector('.product-details').insertBefore(voltageInfo, document.getElementById('product-description'));
                    }

                    // Add stock info
                    const stockInfo = document.createElement('p');
                    stockInfo.textContent = `Stock: ${product.stock || 0}`;
                    stockInfo.id = 'stock-info';
                    document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
                    
                    // Set max quantity input
                    const qtyInput = document.querySelector('.qty-input');
                    qtyInput.setAttribute('max', availableStock);
                    
                    // Validate quantity input
                    validateQuantityInput(qtyInput);

                    // Disable "Add to Cart" button if stock is 0
                    const addToCartButton = document.querySelector('.add-to-cart');
                    if (availableStock === 0) {
                        addToCartButton.disabled = true;
                        addToCartButton.textContent = 'No Stock';
                    }
                } else {
                    document.getElementById('product-name').textContent = 'Product Not Found';
                    document.getElementById('product-description').textContent = 'No product matches this ID.';
                }
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('product-name').textContent = 'Error';
            document.getElementById('product-description').textContent = 'Failed to load product details.';
        }
    } else {
        document.getElementById('product-name').textContent = 'No Product Selected';
        document.getElementById('product-description').textContent = 'Please select a product.';
    }

    // Validate quantity input
    function validateQuantityInput(input) {
        const value = parseInt(input.value);
        if (value < 1) {
            input.value = 1;
        } else if (value > availableStock) {
            input.value = availableStock;
            alert(`Sorry, only ${availableStock} items are available in stock.`);
        }
    }

    // Quantity button event listeners
    const qtyButtons = document.querySelectorAll('.qty-btn');
    qtyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.parentElement.querySelector('.qty-input');
            let value = parseInt(input.value);
            if (button.textContent === '-') {
                value = value > 1 ? value - 1 : 1;
            } else {
                value += 1;
                if (value > availableStock) {
                    value = availableStock;
                    alert(`Sorry, only ${availableStock} items are available in stock.`);
                }
            }
            input.value = value;
        });
    });

    // Quantity input event listeners
    const qtyInput = document.querySelector('.qty-input');
    qtyInput.addEventListener('change', function() {
        validateQuantityInput(this);
    });
    
    qtyInput.addEventListener('input', function() {
        if (this.value === '') return;
        
        const value = parseInt(this.value);
        if (isNaN(value) || value < 1) {
            this.value = 1;
        } else if (value > availableStock) {
            this.value = availableStock;
        }
    });

    // Add to cart function
    async function addToCart(isCheckout = false) {
        const quantity = parseInt(document.querySelector('.qty-input').value);
        const productId = urlParams.get('productId');
        
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');

        if (!userId || !authToken) {
            alert("Please log in to add items to your cart.");
            window.location.href = "../HTML/sign-in.php";
            return;
        }

        if (quantity > availableStock) {
            alert(`Cannot add ${quantity} items. Only ${availableStock} are available.`);
            document.querySelector('.qty-input').value = availableStock;
            return;
        }

        if (isCheckout) {
            // Redirect directly to checkout with product details
            const checkoutUrl = `../HTML/checkout.html?productId=${productId}&quantity=${quantity}`;
            console.log("Redirecting to:", checkoutUrl);
            window.location.href = checkoutUrl;
            return;
        }

        try {
            console.log("Adding to cart:", { user_id: userId, product_id: productId, quantity });

            const response = await fetch('http://localhost/jmab/final-jmab/api/carts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    product_id: productId,
                    quantity: quantity
                })
            });

            const result = await response.json();
            console.log("API Response:", result);

            if (response.ok && result.success) {
                availableStock -= quantity;
                document.getElementById('stock-info').textContent = `Stock: ${availableStock}`;
                document.querySelector('.qty-input').setAttribute('max', availableStock);

                // Set popup message
                document.getElementById('popup-message').textContent = `Added ${quantity} item(s) to cart!`;
                
                // Show the popup with animation
                popupOverlay.classList.add('active');
                
                // Disable "Add to Cart" button if stock reaches 0
                if (availableStock === 0) {
                    const addToCartButton = document.querySelector('.add-to-cart');
                    addToCartButton.disabled = true;
                    addToCartButton.textContent = 'No Stock';
                }
            } else {
                const errorMsg = result.errors ? result.errors.join(', ') : 'Failed to add item to cart.';
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert("An error occurred while adding to cart. Please try again.");
        }
    }

    // Event listeners for "Add to Cart" and "Buy Now" buttons
    document.querySelector('.add-to-cart').addEventListener('click', () => addToCart(false));
    document.querySelector('.buy-now').addEventListener('click', () => addToCart(true));

    // Return button event listener
    document.getElementById('returnBtn').addEventListener('click', () => {
        window.history.back();
    });
});