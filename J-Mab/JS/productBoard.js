document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');
    console.log('Product ID:', productId);
    
    setupCartPopup();

    if (productId) {
        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/products`);
            const data = await response.json();
            console.log('Products API Response:', data);

            if (data.success && Array.isArray(data.products)) {
                const product = data.products.find(p => String(p.product_id) === String(productId));
                console.log('Found Product:', product);

                if (product) {
                    document.querySelector('.product-img').src = product.image_url || './imahe/default-image.png';
                    document.querySelector('.product-img').alt = product.name || 'Product';
                    document.getElementById('product-name').textContent = product.name || 'Unnamed Product';
                    document.getElementById('product-brand').textContent = `Brand: ${product.brand || 'N/A'}`;
                    document.getElementById('product-description').textContent = product.description || 'No description available';
                    
                    handleProductVariants(product);
                    setupQuantityControls();
                    setupCartButtons(product);
                    displayProductRating(product);
                } else {
                    showProductNotFound();
                }
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('Error:', error);
            showLoadError();
        }
    } else {
        showNoProductSelected();
    }

    document.getElementById('returnBtn').addEventListener('click', () => {
        window.history.back();
    });
});

function setupCartPopup() {
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
    
    document.getElementById('popup-continue').addEventListener('click', () => {
        popupOverlay.classList.remove('active');
    });
    
    document.getElementById('popup-view-cart').addEventListener('click', () => {
        window.location.href = "../HTML/userCart.html";
    });
}

function handleProductVariants(product) {
    const sizeSelect = document.getElementById('size');
    
    function formatPrice(priceValue) {
        const price = parseFloat(priceValue);
        return isNaN(price) ? '0.00' : price.toFixed(2);
    }
    
    if (product.variants && product.variants.length > 0) {
        sizeSelect.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a variant';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        sizeSelect.appendChild(defaultOption);
        
        const sortedVariants = [...product.variants].sort((a, b) => {
            const priceA = parseFloat(a.price) || 0;
            const priceB = parseFloat(b.price) || 0;
            return priceA - priceB;
        });
        
        sortedVariants.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant.variant_id;
            const price = parseFloat(variant.price) || 0;
            option.textContent = `${variant.size} - ₱${formatPrice(variant.price)}`;
            option.dataset.price = price;
            option.dataset.stock = variant.stock || 0;
            option.dataset.size = variant.size || 'N/A';
            const stock = parseInt(variant.stock) || 0;
            option.disabled = stock <= 0;
            if (stock <= 0) option.textContent += ' (Out of Stock)';
            sizeSelect.appendChild(option);
        });
        
        sizeSelect.addEventListener('change', async function() {
            const selectedOption = this.options[this.selectedIndex];
            const selectedPrice = parseFloat(selectedOption.dataset.price) || 0;
            const selectedStock = parseInt(selectedOption.dataset.stock) || 0;
            const variantId = selectedOption.value;
            
            document.getElementById('product-price').textContent = `₱${formatPrice(selectedPrice)}`;
            
            const stockInfo = document.getElementById('stock-info') || document.createElement('p');
            stockInfo.id = 'stock-info';
            stockInfo.textContent = `Stock: ${selectedStock}`;
            if (!stockInfo.parentElement) {
                document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
            }
            
            const qtyInput = document.querySelector('.qty-input');
            qtyInput.setAttribute('max', selectedStock);
            if (parseInt(qtyInput.value) > selectedStock) qtyInput.value = selectedStock;
            
            updateButtonStates(selectedStock);
            await fetchAndDisplayVariantRating(variantId);
        });
        
        const firstInStock = sortedVariants.find(v => (parseInt(v.stock) || 0) > 0) || sortedVariants[0];
        if (firstInStock) {
            document.getElementById('product-price').textContent = `₱${formatPrice(firstInStock.price)}`;
            const stockInfo = document.createElement('p');
            stockInfo.id = 'stock-info';
            stockInfo.textContent = `Stock: ${parseInt(firstInStock.stock) || 0}`;
            document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
            updateButtonStates(parseInt(firstInStock.stock) || 0);
            fetchAndDisplayVariantRating(firstInStock.variant_id);
        }
    } else {
        sizeSelect.innerHTML = '<option value="">N/A</option>';
        document.getElementById('product-price').textContent = `₱${formatPrice(product.price)}`;
        const stockInfo = document.createElement('p');
        stockInfo.id = 'stock-info';
        stockInfo.textContent = `Stock: ${parseInt(product.stock) || 0}`;
        document.querySelector('.product-details').insertBefore(stockInfo, document.querySelector('.quantity'));
        updateButtonStates(parseInt(product.stock) || 0);
        fetchAndDisplayVariantRating(null);
    }

}

async function fetchAndDisplayVariantRating(variantId) {
    let ratingElement = document.getElementById('product-rating');
    if (!ratingElement) {
        ratingElement = document.createElement('div');
        ratingElement.id = 'product-rating';
        ratingElement.className = 'rating';
        document.querySelector('.product-details').insertBefore(ratingElement, document.querySelector('.quantity'));
    }

    if (variantId) {
        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/ratings/average/${variantId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                ratingElement.innerHTML = generateRatingStars(data.average_rating) + 
                    `<span class="rating-value">(${data.average_rating} - ${data.rating_count} reviews)</span>`;
            } else {
                ratingElement.innerHTML = generateRatingStars(0) + `<span class="rating-value">(0 - 0 reviews)</span>`;
            }
        } catch (error) {
            console.error('Error fetching variant rating:', error);
            ratingElement.innerHTML = generateRatingStars(0) + `<span class="rating-value">(0 - 0 reviews)</span>`;
        }
    } else {
        ratingElement.innerHTML = generateRatingStars(0) + `<span class="rating-value">(0 - 0 reviews)</span>`;
    }
}

function generateRatingStars(rating) {
    const maxStars = 5;
    let stars = "";
    const ratingValue = parseFloat(rating) || 0;
    for (let i = 1; i <= maxStars; i++) {
        stars += i <= ratingValue ? `<span class="star filled">★</span>` : `<span class="star">☆</span>`;
    }
    return stars;
}

function displayProductRating(product) {
    fetchAndDisplayVariantRating(product.variants && product.variants.length > 0 ? product.variants[0].variant_id : null);
}

function updateButtonStates(stock) {
    const addToCartButton = document.querySelector('.add-to-cart');
    const buyNowButton = document.querySelector('.buy-now');
    
    if (stock <= 0) {
        addToCartButton.disabled = true;
        addToCartButton.textContent = 'NO STOCK';
        addToCartButton.classList.add('disabled-button');
        buyNowButton.disabled = true;
        buyNowButton.textContent = 'NO STOCK';
        buyNowButton.classList.add('disabled-button');
    } else {
        addToCartButton.disabled = false;
        addToCartButton.textContent = 'Add to Cart';
        addToCartButton.classList.remove('disabled-button');
        buyNowButton.disabled = false;
        buyNowButton.textContent = 'Buy Now';
        buyNowButton.classList.remove('disabled-button');
    }
}

function setupQuantityControls() {
    const qtyButtons = document.querySelectorAll('.qty-btn');
    qtyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.parentElement.querySelector('.qty-input');
            let value = parseInt(input.value) || 1;
            const max = parseInt(input.getAttribute('max')) || 0;
            
            if (button.textContent === '-') {
                value = value > 1 ? value - 1 : 1;
            } else {
                value += 1;
                if (max > 0 && value > max) {
                    value = max;
                    alert(`Sorry, only ${max} items are available in stock.`);
                }
            }
            
            input.value = value;
        });
    });

    const qtyInput = document.querySelector('.qty-input');
    qtyInput.addEventListener('change', function() {
        validateQuantityInput(this, true);
    });
    
    qtyInput.addEventListener('input', function() {
        if (this.value === '') return;
        const value = parseInt(this.value) || 1;
        const max = parseInt(this.getAttribute('max')) || 0;
        this.value = value < 1 ? 1 : (max > 0 && value > max ? max : value);
    });
}

function validateQuantityInput(input, showAlert = true) {
    const value = parseInt(input.value) || 1;
    const max = parseInt(input.getAttribute('max')) || 0;
    
    if (value < 1) {
        input.value = 1;
    } else if (max > 0 && value > max) {
        input.value = max;
        if (showAlert) alert(`Sorry, only ${max} items are available in stock.`);
    }
}

function setupCartButtons(product) {
    async function addToCart(buyNow = false) {
        const sizeSelect = document.getElementById('size');
        const selectedOption = sizeSelect.options[sizeSelect.selectedIndex];
        
        if (!selectedOption || selectedOption.value === '') {
            alert("Please select a product variant.");
            return;
        }
        
        const variantId = selectedOption.value;
        const variantSize = selectedOption.dataset.size;
        const quantity = parseInt(document.querySelector('.qty-input').value) || 1;
        const price = parseFloat(selectedOption.dataset.price) || 0;
        const productId = product.product_id;
        
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');
    
        if (!userId || !authToken) {
            alert("Please log in to add items to your cart.");
            window.location.href = "../HTML/sign-in.php";
            return;
        }
    
        console.log("Adding to cart:", { userId, productId, variantId, variantSize, quantity, price });

        try {
            const response = await fetch('http://localhost/jmab/final-jmab/api/carts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    product_id: productId,
                    variant_id: variantId,
                    variant_size: variantSize,
                    quantity: quantity,
                    price: price
                })
            });
    
            const result = await response.json();
            console.log("Cart API Response:", result);
    
            if (response.ok && result.success) {
                if (buyNow) {
                    window.location.href = "../HTML/userCart.html";
                } else {
                    document.getElementById('popup-message').textContent = `Added ${quantity} item(s) to cart! Size: ${variantSize}`;
                    document.querySelector('.popup-overlay').classList.add('active');
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

    document.querySelector('.add-to-cart').addEventListener('click', () => addToCart(false));
    document.querySelector('.buy-now').addEventListener('click', () => addToCart(true));
}

function showProductNotFound() {
    document.getElementById('product-name').textContent = 'Product Not Found';
    document.getElementById('product-description').textContent = 'No product matches this ID.';
    disableButtons();
}

function showLoadError() {
    document.getElementById('product-name').textContent = 'Error';
    document.getElementById('product-description').textContent = 'Failed to load product details.';
    disableButtons();
}

function showNoProductSelected() {
    document.getElementById('product-name').textContent = 'No Product Selected';
    document.getElementById('product-description').textContent = 'Please select a product.';
    disableButtons();
}

function disableButtons() {
    const addToCartButton = document.querySelector('.add-to-cart');
    const buyNowButton = document.querySelector('.buy-now');
    if (addToCartButton && buyNowButton) {
        addToCartButton.disabled = true;
        buyNowButton.disabled = true;
    }
}