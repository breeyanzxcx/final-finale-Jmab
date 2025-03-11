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
    const sizeField = document.getElementById('sizeField');
    const voltageField = document.getElementById('voltageField');
    const productFormContainer = document.getElementById('productFormContainer');
    const addProductButton = document.getElementById('addProductButton');
    const cancelButton = document.getElementById('cancelButton');

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

    // Show/hide fields based on category
    categorySelect.addEventListener('change', function() {
        sizeField.style.display = this.value === 'Tires' ? 'block' : 'none';
        voltageField.style.display = this.value === 'Batteries' ? 'block' : 'none';
    });

    // Product form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());
        if (productData.category !== 'Tires') delete productData.size;
        if (productData.category !== 'Batteries') delete productData.voltage;

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

                    productElement.innerHTML = `
                        <img src="${product.image_url}" alt="${product.name}" class="product-image">
                        <h4>${product.name}</h4>
                        <p>${product.description || 'No description available'}</p>
                        <p>Brand: ${product.brand || 'Not specified'}</p>
                        <p>Stock: ${product.stock}</p>
                        ${product.size ? `<p>Size: ${product.size}</p>` : ''}
                        ${product.voltage ? `<p>Voltage: ${product.voltage}</p>` : ''}
                        <p>Price: ₱${product.price}</p>
                        <div class="product-actions" ">
                            <button class="edit-product-btn" data-id="${productId}">Edit</button>
                            <button class="delete-product-btn" data-id="${productId}">Delete</button>
                        </div>
                    `;

                    switch (product.category) {
                        case 'Tires': tireSection.appendChild(productElement); break;
                        case 'Batteries': batterySection.appendChild(productElement); break;
                        case 'Lubricants': lubricantSection.appendChild(productElement); break;
                        case 'Oils': oilSection.appendChild(productElement); break;
                        default: console.log(`Unknown category: ${product.category}`);
                    }
                });

                // Add event listeners to the edit and delete buttons
                document.querySelectorAll('.edit-product-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const productId = this.getAttribute('data-id');
                        console.log('Edit Product ID:', productId); // Debugging step
                
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
        
            // Check for 'products' instead of 'product'
            if (data.success && data.products) {
                const product = data.products; // Adjust to use 'products' key
        
                document.getElementById('name').value = product.name || '';
                document.getElementById('description').value = product.description || '';
                document.getElementById('category').value = product.category || '';
                document.getElementById('price').value = product.price || '';
                document.getElementById('stock').value = product.stock || '';
                document.getElementById('image_url').value = product.image_url || '';
                document.getElementById('brand').value = product.brand || '';
        
                categorySelect.dispatchEvent(new Event('change'));
        
                if (product.size) document.getElementById('size').value = product.size;
                if (product.voltage) document.getElementById('voltage').value = product.voltage;
        
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
        sizeField.style.display = 'none';
        voltageField.style.display = 'none';
    }

    // UPDATED: Product search functionality with respect to the current category filter
    document.getElementById('productSearch').addEventListener('input', function() {
        let filter = this.value.toLowerCase().trim();
        
        // Determine which sections are currently visible (based on category selection)
        let visibleSections = [];
        
        // Check which sections are displayed
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

        // Apply search filter only to visible sections
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
                    product.style.display = 'flex'; // Show matching products
                    product.style.opacity = '1';
                    product.style.transition = 'opacity 0.2s ease-in-out';
                    sectionHasResults = true;
                    anyResultsFound = true;
                } else {
                    product.style.display = 'none'; // Hide non-matching products
                    product.style.opacity = '0';
                }
            });

            // If no products match in this section, optionally hide the section title too
            const titleSelector = sectionSelector.replace('section', 'title');
            const title = document.querySelector(titleSelector);
            
            if (title) {
                title.style.display = sectionHasResults ? 'block' : 'none';
            }
        });
        
        // Optionally add a "no results found" message
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

    // UPDATED: Filter function for category selection that respects search
    function filterProducts(category) {
        const sections = document.querySelectorAll('.tire-section, .Battery-section, .Lubricant-section, .Oil-section');
        const titles = document.querySelectorAll('.tire-title, .Battery-title, .Lubricant-title, .Oil-title');

        // Hide all sections initially
        sections.forEach(section => section.style.display = 'none');
        titles.forEach(title => title.style.display = 'none');

        // Remove any existing no results message
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
        
        // Re-apply any current search filter after changing category
        const searchInput = document.getElementById('productSearch');
        if (searchInput && searchInput.value.trim() !== '') {
            // Trigger the input event to re-filter with current search term
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