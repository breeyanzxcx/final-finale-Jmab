document.addEventListener('DOMContentLoaded', (event) => {
    // Define section variables
    const tireSection = document.querySelector('.tire-section');
    const batterySection = document.querySelector('.Battery-section');
    const lubricantSection = document.querySelector('.Lubricant-section');
    const oilSection = document.querySelector('.Oil-section');

    const tireButton = document.getElementById('tireButton');
    const oilButton = document.getElementById('oilButton');
    const lubricantButton = document.getElementById('lubricantButton');
    const batteryButton = document.getElementById('batteryButton');
    const allButton = document.getElementById('allButton');

    tireButton.addEventListener('click', () => filterProducts('Tires'));
    oilButton.addEventListener('click', () => filterProducts('Oils'));
    lubricantButton.addEventListener('click', () => filterProducts('Lubricants'));
    batteryButton.addEventListener('click', () => filterProducts('Batteries'));
    allButton.addEventListener('click', () => filterProducts('All'));

    // Product Form Elements
    const form = document.getElementById('createProductForm');
    const categorySelect = document.getElementById('category');
    const productFormContainer = document.getElementById('productFormContainer');
    const addProductButton = document.getElementById('addProductButton');
    const cancelButton = document.getElementById('cancelButton');
    
    // Variants elements
    const variantsContainer = document.getElementById('variantsContainer');
    const addVariantButton = document.getElementById('addVariantButton');
    const variantSelectorContainer = document.createElement('div');
    variantSelectorContainer.id = 'variant-selector-container';
    
    // Add a label for the variant selector
    const variantLabel = document.createElement('label');
    variantLabel.setAttribute('for', 'variant-select');
    variantLabel.textContent = 'Variants';
    variantLabel.style.display = 'block'; // Ensure it’s on its own line
    variantLabel.style.fontWeight = 'bold';
    variantLabel.style.marginBottom = '5px';
    
    const variantSelect = document.createElement('select');
    variantSelect.id = 'variant-select';
    
    variantSelectorContainer.appendChild(variantLabel); // Add label before the select
    variantSelectorContainer.appendChild(variantSelect);
    variantsContainer.before(variantSelectorContainer); // Place selector above variants

    let isEditing = false;
    let currentProductId = null;

    // Show form smoothly
    addProductButton.addEventListener('click', function() {
        resetForm();
        document.querySelector('input[type="submit"]').value = "Create Product";
        productFormContainer.style.display = 'block';
        setTimeout(() => productFormContainer.style.opacity = '1', 10);
    });

    // Hide form smoothly
    cancelButton.addEventListener('click', function() {
        productFormContainer.style.opacity = '0';
        setTimeout(() => productFormContainer.style.display = 'none', 200);
        resetForm();
    });

    // Add variant button functionality
    if (addVariantButton) {
        addVariantButton.addEventListener('click', function() {
            addVariantRow();
            updateVariantSelector();
            variantSelect.value = variantSelect.options[variantSelect.options.length - 1].value; // Select the new variant
            displaySelectedVariant();
        });
    }

    // Function to add a variant row to the form
    function addVariantRow(variantData = null) {
        const variantRow = document.createElement('div');
        variantRow.className = 'variant-row';
        
        const variantId = variantData ? variantData.variant_id : 'new_' + Date.now();
        variantRow.dataset.variantId = variantId;
        
        let variantFields = `
            <input type="hidden" name="variant_id" value="${variantId}">
            <div class="form-group">
                <label>Size:</label>
                <input type="text" name="variant_size" value="${variantData ? variantData.size : ''}" required>
            </div>
            <div class="form-group">
                <label>Price:</label>
                <input type="number" name="variant_price" step="0.01" value="${variantData ? variantData.price : ''}" required>
            </div>
            <div class="form-group">
                <label>Stock:</label>
                <input type="number" name="variant_stock" value="${variantData ? variantData.stock : '0'}" required>
            </div>
            <button type="button" class="remove-variant-btn">Remove</button>
        `;
        
        variantRow.innerHTML = variantFields;
        variantsContainer.appendChild(variantRow);
        
        const removeButton = variantRow.querySelector('.remove-variant-btn');
        removeButton.addEventListener('click', function() {
            variantRow.remove();
            updateVariantSelector();
            if (variantSelect.options.length > 0) {
                variantSelect.value = variantSelect.options[0].value;
            }
            displaySelectedVariant();
        });
    }

    // Function to update the variant selector dropdown
    function updateVariantSelector() {
        const variantRows = variantsContainer.querySelectorAll('.variant-row');
        variantSelect.innerHTML = ''; // Clear existing options
        
        if (variantRows.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No variants available';
            variantSelect.appendChild(option);
            variantSelect.disabled = true;
        } else {
            variantRows.forEach((row, index) => {
                const variantId = row.dataset.variantId;
                const sizeInput = row.querySelector('input[name="variant_size"]');
                const size = sizeInput ? sizeInput.value : `Variant ${index + 1}`;
                const option = document.createElement('option');
                option.value = variantId;
                option.textContent = size || `Variant ${index + 1}`;
                variantSelect.appendChild(option);
            });
            variantSelect.disabled = false;
        }
    }

    // Function to display the selected variant
    function displaySelectedVariant() {
        const variantRows = variantsContainer.querySelectorAll('.variant-row');
        const selectedVariantId = variantSelect.value;

        variantRows.forEach(row => {
            if (row.dataset.variantId === selectedVariantId) {
                row.style.display = 'block';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Event listener for variant selector
    variantSelect.addEventListener('change', displaySelectedVariant);

    // Function to collect variant data from the form
    function collectVariantsData() {
        const variantRows = variantsContainer.querySelectorAll('.variant-row');
        const variantsData = [];
        
        variantRows.forEach(row => {
            const variantId = row.querySelector('input[name="variant_id"]').value;
            const size = row.querySelector('input[name="variant_size"]').value;
            const price = parseFloat(row.querySelector('input[name="variant_price"]').value);
            const stock = parseInt(row.querySelector('input[name="variant_stock"]').value);
            
            variantsData.push({
                variant_id: variantId,
                size: size,
                price: price,
                stock: stock
            });
        });
        
        return variantsData;
    }

    // Product form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());
        
        // Collect variants data
        productData.variants = collectVariantsData();

        // Ensure at least one variant is added
        if (productData.variants.length === 0) {
            alert('Please add at least one variant.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('Please log in first.');
                return;
            }

            let url = 'http://localhost/jmab/final-jmab/api/products';
            let method = 'POST';

            if (isEditing && currentProductId) {
                url = `http://localhost/jmab/final-jmab/api/products/${currentProductId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });

            const result = await response.json();
            console.log('API Response:', result);

            if (result.success) {
                alert(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
                form.reset();
                productFormContainer.style.opacity = '0';
                setTimeout(() => productFormContainer.style.display = 'none', 200);
                resetForm();
                loadProducts();
            } else {
                alert('Error: ' + (result.errors ? result.errors.join('\n') : 'Unknown error'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`An error occurred while ${isEditing ? 'updating' : 'creating'} the product.`);
        }
    });

    // Logout function
    document.getElementById('logout').addEventListener('click', function (e) {
        e.preventDefault();
        const isConfirmed = confirm("Are you sure you want to log out?");
        if (isConfirmed) {
            window.location.href = '../J-Mab/HTML/sign-in.php';
        }
    });

    // Load products with smooth transition
    async function loadProducts() {
        tireSection.innerHTML = '<p class="loading">Loading products...</p>'; 
        tireSection.style.opacity = '0.5';
    
        try {
            const response = await fetch('http://localhost/jmab/final-jmab/api/products');
            const data = await response.json();
    
            console.log('API Response:', data);
    
            if (data.success && Array.isArray(data.products)) {
                tireSection.innerHTML = '';
                batterySection.innerHTML = '';
                lubricantSection.innerHTML = '';
                oilSection.innerHTML = '';
    
                data.products.forEach(product => {
                    const productId = product.product_id;
                    
                    if (!productId) {
                        console.error('Product is missing product_id:', product);
                        return;
                    }
                    
                    const productElement = document.createElement('div');
                    productElement.classList.add('item-container');
                    productElement.dataset.productId = productId;
    
                    const maxDescriptionLength = 50;
                    const truncatedDescription = product.description && product.description.length > maxDescriptionLength
                        ? product.description.substring(0, maxDescriptionLength) + '...'
                        : product.description || 'No description available';
    
                    let isOutOfStock = true;
                    if (product.variants && product.variants.length > 0) {
                        isOutOfStock = !product.variants.some(variant => variant.stock > 0);
                    } else {
                        isOutOfStock = product.stock === 0;
                    }
    
                    let priceDisplay = '';
                    if (product.variants && product.variants.length > 0) {
                        const prices = product.variants.map(variant => parseFloat(variant.price));
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        
                        if (minPrice === maxPrice) {
                            priceDisplay = `₱${minPrice}`;
                        } else {
                            priceDisplay = `₱${minPrice} - ₱${maxPrice}`;
                        }
                    } else {
                        priceDisplay = `₱${product.price}`;
                    }
    
                    const outOfStockOverlay = isOutOfStock
                        ? `<div class="out-of-stock-overlay">OUT OF STOCK</div>`
                        : '';
    
                    productElement.innerHTML = `
                        <img src="${product.image_url}" alt="${product.name}" class="product-image">
                        ${outOfStockOverlay}
                        <h4>${product.name}</h4>
                        <p>${truncatedDescription}</p>
                        <p>Brand: ${product.brand || 'Not specified'}</p>
                        <p>Variants: ${product.variants ? product.variants.length : 0}</p>
                        <p>Price: ${priceDisplay}</p>
                        <div class="product-actions">
                            <button class="edit-product-btn" data-id="${productId}">Edit</button>
                            <button class="delete-product-btn" data-id="${productId}">Delete</button>
                        </div>
                    `;
    
                    if (isOutOfStock) {
                        productElement.classList.add('out-of-stock');
                    }
    
                    switch (product.category) {
                        case 'Tires': tireSection.appendChild(productElement); break;
                        case 'Batteries': batterySection.appendChild(productElement); break;
                        case 'Lubricants': lubricantSection.appendChild(productElement); break;
                        case 'Oils': oilSection.appendChild(productElement); break;
                        default: console.log(`Unknown category: ${product.category}`);
                    }
                });
    
                document.querySelectorAll('.edit-product-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const productId = this.getAttribute('data-id');
                        console.log('Edit Product ID:', productId);
                        if (!productId) {
                            console.error('Edit button missing product ID');
                            return;
                        }
                        editProduct(productId);
                    });
                });
                
                document.querySelectorAll('.delete-product-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const productId = this.getAttribute('data-id');
                        console.log('Delete Product ID:', productId);
                        if (!productId) {
                            console.error('Delete button missing product ID');
                            alert('Cannot delete: Product ID is missing');
                            return;
                        }
                        deleteProduct(productId);
                    });
                });
    
                tireSection.style.opacity = '1';
            } else {
                alert('Error loading products.');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('An error occurred while fetching products.');
        }
    }

    // Edit product function
    async function editProduct(productId) {
        if (!productId) {
            console.error('Invalid product ID for editing');
            return;
        }
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('Please log in first.');
                return;
            }
           
            console.log(`Fetching product details for ID: ${productId}`);
            console.log('Token:', token);
            
            const response = await fetch(`http://localhost/jmab/final-jmab/api/products/${productId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response Status:', response.status);
            console.log('Response OK:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }
    
            const data = await response.json();
            console.log('API Response:', data);
        
            if (data.success && data.products) {
                const product = data.products; 
        
                document.getElementById('name').value = product.name || '';
                document.getElementById('description').value = product.description || '';
                document.getElementById('category').value = product.category || '';
                document.getElementById('image_url').value = product.image_url || '';
                document.getElementById('brand').value = product.brand || '';
        
                variantsContainer.innerHTML = '';
                
                if (product.variants && Array.isArray(product.variants)) {
                    product.variants.forEach(variant => {
                        addVariantRow(variant);
                    });
                }
                if (!product.variants || product.variants.length === 0) {
                    addVariantRow();
                }
        
                updateVariantSelector();
                variantSelect.value = variantSelect.options[0].value;
                displaySelectedVariant();
        
                isEditing = true;
                currentProductId = productId;
        
                document.querySelector('input[type="submit"]').value = "Update Product";
        
                productFormContainer.style.display = 'block';
                setTimeout(() => productFormContainer.style.opacity = '1', 10);
        
                productFormContainer.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error: ' + (data.message || 'Failed to fetch product details'));
            }
        } catch (error) {
            console.error('Error fetching product details:', error.message);
            alert(`An error occurred while fetching product details: ${error.message}`);
        }
    }
    
    // Delete product function
    async function deleteProduct(productId) {
        if (!productId) {
            console.error('Cannot delete: Product ID is undefined or empty');
            alert('Cannot delete: Invalid product ID');
            return;
        }
        
        if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            return;
        }
    
        try {
            const token = localStorage.getItem('authToken');
            console.log('Token:', token); 
            if (!token) {
                alert('Please log in first.');
                return;
            }
    
            console.log(`Attempting to delete product with ID: ${productId}`);
            const response = await fetch(`http://localhost/jmab/final-jmab/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            const result = await response.json();
            console.log('Delete API Response:', result);
    
            if (result.success) {
                alert('Product deleted successfully!');
                loadProducts(); 
            } else {
                console.error('Delete Error:', result.message || result.errors); 
                alert('Error: ' + (result.errors ? result.errors.join('\n') : result.message || 'Unknown error')); 
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('An error occurred while deleting the product.');
        }
    }

    // Reset form function
    function resetForm() {
        form.reset(); 
        isEditing = false; 
        currentProductId = null;
        
        variantsContainer.innerHTML = '';
        addVariantRow();
        updateVariantSelector();
        variantSelect.value = variantSelect.options[0].value;
        displaySelectedVariant();
    }

    // Product search functionality with respect to the current category filter
    document.getElementById('productSearch').addEventListener('input', function() {
        let filter = this.value.toLowerCase().trim();
        
        let visibleSections = [];
        
        if (document.querySelector('.tire-section').style.display !== 'none') {
            visibleSections.push('.tire-section');
        }
        if (document.querySelector('.Battery-section').style.display !== 'none') {
            visibleSections.push('.Battery-section');
        }
        if (document.querySelector('.Lubricant-section').style.display !== 'none') {
            visibleSections.push('.Lubricant-section');
        }
        if (document.querySelector('.Oil-section').style.display !== 'none') {
            visibleSections.push('.Oil-section');
        }
        
        let anyResultsFound = false;

        visibleSections.forEach(sectionSelector => {
            const section = document.querySelector(sectionSelector);
            const products = section.querySelectorAll('.item-container');
            let sectionHasResults = false;

            products.forEach(product => {
                const nameElement = product.querySelector('h4');
                const descElement = product.querySelector('p');
                const brandElement = product.querySelector('p:nth-child(4)');
                
                if (!nameElement || !descElement || !brandElement) return;
                
                const name = nameElement.textContent.toLowerCase();
                const description = descElement.textContent.toLowerCase();
                const brand = brandElement.textContent.toLowerCase();

                if (name.includes(filter) || description.includes(filter) || brand.includes(filter)) {
                    product.style.display = 'flex';
                    product.style.opacity = '1';
                    product.style.transition = 'opacity 0.2s ease-in-out';
                    sectionHasResults = true;
                    anyResultsFound = true;
                } else {
                    product.style.display = 'none';
                    product.style.opacity = '0';
                }
            });

            const titleSelector = sectionSelector.replace('section', 'title');
            const title = document.querySelector(titleSelector);
            
            if (title) {
                title.style.display = sectionHasResults ? 'block' : 'none';
            }
        });
        
        let noResultsMessage = document.getElementById('no-results-message');
        
        if (!anyResultsFound && filter.length > 0) {
            if (!noResultsMessage) {
                noResultsMessage = document.createElement('div');
                noResultsMessage.id = 'no-results-message';
                noResultsMessage.textContent = 'No products found matching your search.';
                noResultsMessage.style.textAlign = 'center';
                noResultsMessage.style.padding = '20px';
                noResultsMessage.style.color = 'gray';
                document.querySelector('.products-container').appendChild(noResultsMessage);
            } else {
                noResultsMessage.style.display = 'block';
            }
        } else if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }
    });

    // Filter function for category selection that respects search
    function filterProducts(category) {
        const sections = document.querySelectorAll('.tire-section, .Battery-section, .Lubricant-section, .Oil-section');
        const titles = document.querySelectorAll('.tire-title, .Battery-title, .Lubricant-title, .Oil-title');

        sections.forEach(section => section.style.display = 'none');
        titles.forEach(title => title.style.display = 'none');

        const noResultsMessage = document.getElementById('no-results-message');
        if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }

        switch (category) {
            case 'Tires':
                document.querySelector('.tire-section').style.display = 'grid';
                document.querySelector('.tire-title').style.display = 'block';
                adjustContainerSizes('Tires');
                break;
            case 'Batteries':
                document.querySelector('.Battery-section').style.display = 'grid';
                document.querySelector('.Battery-title').style.display = 'block';
                adjustContainerSizes('Batteries');
                break;
            case 'Lubricants':
                document.querySelector('.Lubricant-section').style.display = 'grid';
                document.querySelector('.Lubricant-title').style.display = 'block';
                adjustContainerSizes('Lubricants');
                break;
            case 'Oils':
                document.querySelector('.Oil-section').style.display = 'grid';
                document.querySelector('.Oil-title').style.display = 'block';
                adjustContainerSizes('Oils');
                break;
            case 'All': 
                sections.forEach(section => section.style.display = 'grid');
                titles.forEach(title => title.style.display = 'block');
                adjustContainerSizes('All');
                break;
            default:
                console.log(`Unknown category: ${category}`);
        }
        
        const searchInput = document.getElementById('productSearch');
        if (searchInput && searchInput.value.trim() !== '') {
            searchInput.dispatchEvent(new Event('input'));
        }
    }

    // Function to adjust container sizes based on category
    function adjustContainerSizes(category) {
        const tireContainers = document.querySelectorAll('.tire-section .item-container');
        const batteryContainers = document.querySelectorAll('.Battery-section .item-container');
        const lubricantContainers = document.querySelectorAll('.Lubricant-section .item-container');
        const oilContainers = document.querySelectorAll('.Oil-section .item-container');

        if (category === 'Tires' || category === 'All') {
            tireContainers.forEach(container => {
                container.classList.add('small-container');
                container.classList.remove('big-container');
            });
        } else {
            tireContainers.forEach(container => {
                container.classList.remove('small-container');
                container.classList.add('big-container');
            });
        }

        if (category === 'Batteries' || category === 'All') {
            batteryContainers.forEach(container => {
                container.classList.add('small-container');
                container.classList.remove('big-container');
            });
        } else {
            batteryContainers.forEach(container => {
                container.classList.remove('small-container');
                container.classList.add('big-container');
            });
        }

        if (category === 'Lubricants' || category === 'All') {
            lubricantContainers.forEach(container => {
                container.classList.add('small-container');
                container.classList.remove('big-container');
            });
        } else {
            lubricantContainers.forEach(container => {
                container.classList.remove('small-container');
                container.classList.add('big-container');
            });
        }

        if (category === 'Oils' || category === 'All') {
            oilContainers.forEach(container => {
                container.classList.add('small-container');
                container.classList.remove('big-container');
            });
        } else {
            oilContainers.forEach(container => {
                container.classList.remove('small-container');
                container.classList.add('big-container');
            });
        }
    }
    
    // Initialize product loading
    loadProducts();
});