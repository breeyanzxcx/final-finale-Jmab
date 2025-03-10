document.addEventListener('DOMContentLoaded', (event) => {
    // Define section variables here
    const tireSection = document.querySelector('.tire-section');
    const batterySection = document.querySelector('.Battery-section');
    const lubricantSection = document.querySelector('.Lubricant-section');
    const oilSection = document.querySelector('.Oil-section');

    const tireButton = document.getElementById('tireButton');
    const oilButton = document.getElementById('oilButton');
    const lubricantButton = document.getElementById('lubricantButton');
    const batteryButton = document.getElementById('batteryButton');

    tireButton.addEventListener('click', () => filterProducts('Tires'));
    oilButton.addEventListener('click', () => filterProducts('Oils'));
    lubricantButton.addEventListener('click', () => filterProducts('Lubricants'));
    batteryButton.addEventListener('click', () => filterProducts('Batteries'));
    const allButton = document.getElementById('allButton');

    allButton.addEventListener('click', () => filterProducts('All'));


    const form = document.getElementById('createProductForm');
    const categorySelect = document.getElementById('category');
    const sizeField = document.getElementById('sizeField');
    const voltageField = document.getElementById('voltageField');
    const productFormContainer = document.getElementById('productFormContainer');
    const addProductButton = document.getElementById('addProductButton');
    const cancelButton = document.getElementById('cancelButton');
    
    let isEditing = false;
    let currentProductId = null;

    addProductButton.addEventListener('click', function() {
        resetForm();
        document.querySelector('input[type="submit"]').value = "Create Product";
        productFormContainer.style.display = 'block';
    });

    cancelButton.addEventListener('click', function() {
        productFormContainer.style.display = 'none';
        resetForm();
    });

    categorySelect.addEventListener('change', function() {
        sizeField.style.display = this.value === 'Tires' ? 'block' : 'none';
        voltageField.style.display = this.value === 'Batteries' ? 'block' : 'none';
    });

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
                productFormContainer.style.display = 'none';
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

    document.getElementById('logout').addEventListener('click', function (e) {
        e.preventDefault();
        const isConfirmed = confirm("Are you sure you want to log out?");
        if (isConfirmed) {
            window.location.href = '../J-Mab/HTML/sign-in.php';
        }
    });

    async function loadProducts(products) {
        const tireSection = document.querySelector('.tire-section');
        tireSection.innerHTML = '';
        try {
            const response = await fetch('http://localhost/jmab/final-jmab/api/products');
            const data = await response.json();
    
            console.log('API Response:', data);
    
            if (data.success && Array.isArray(data.products)) {
                const products = data.products;
    
                tireSection.innerHTML = '';
                batterySection.innerHTML = '';
                lubricantSection.innerHTML = '';
                oilSection.innerHTML = '';
    
                products.forEach(product => {
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
                        <div class="product-actions" style="display: flex; justify-content: space-between; margin-top: 10px;">
                            <button class="edit-product-btn" data-id="${productId}" style="background-color: #4CAF50; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
                            <button class="delete-product-btn" data-id="${productId}" style="background-color: #f44336; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
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
            } else {
                console.error('Error: Unexpected API response format.', data);
                alert('Error loading products.');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('An error occurred while fetching products.');
        }
    }
    
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
           
            const response = await fetch(`http://localhost/jmab/final-jmab/api/products/${productId}`);
            const data = await response.json();
    
            if (data.success && data.product) {
                const product = data.product;
    
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
    
                productFormContainer.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error: ' + (data.message || 'Failed to fetch product details'));
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            alert('An error occurred while fetching product details.');
        }
    }
    
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

    function resetForm() {
        form.reset();
        isEditing = false;
        currentProductId = null;
        sizeField.style.display = 'none';
        voltageField.style.display = 'none';
    }

    loadProducts();
});

document.getElementById('productSearch').addEventListener('input', function () {
    let filter = this.value.toLowerCase().trim();
    let activeSections = document.querySelectorAll('.tire-section, .Battery-section, .Lubricant-section, .Oil-section');

    activeSections.forEach(section => {
        let products = section.querySelectorAll('.item-container');
        let found = false;

        products.forEach(product => {
            let name = product.querySelector('h4').textContent.toLowerCase();
            let description = product.querySelector('p').textContent.toLowerCase();
            let brand = product.querySelector('p:nth-child(4)').textContent.toLowerCase();

            if (name.includes(filter) || description.includes(filter) || brand.includes(filter)) {
                product.style.display = 'flex'; // Ensure it's visible in the grid
                product.style.opacity = '1'; 
                product.style.transition = 'opacity 0.2s ease-in-out';
                found = true;
            } else {
                product.style.display = 'none'; // Completely remove from layout
                product.style.opacity = '0';
            }
        });

        section.style.display = found ? 'grid' : 'none'; // Keep section hidden if no matching product
    });
});

function filterProducts(category) {
    const sections = document.querySelectorAll('.tire-section, .Battery-section, .Lubricant-section, .Oil-section');
    const titles = document.querySelectorAll('.tire-title, .Battery-title, .Lubricant-title, .Oil-title');

    // Hide all sections initially
    sections.forEach(section => section.style.display = 'none');
    titles.forEach(title => title.style.display = 'none');

    switch (category) {
        case 'Tires':
            document.querySelector('.tire-section').style.display = 'flex';
            document.querySelector('.tire-title').style.display = 'block';
            break;
        case 'Batteries':
            document.querySelector('.Battery-section').style.display = 'flex';
            document.querySelector('.Battery-title').style.display = 'block';
            break;
        case 'Lubricants':
            document.querySelector('.Lubricant-section').style.display = 'flex';
            document.querySelector('.Lubricant-title').style.display = 'block';
            break;
        case 'Oils':
            document.querySelector('.Oil-section').style.display = 'flex';
            document.querySelector('.Oil-title').style.display = 'block';
            break;
        case 'All': // Show all categories
            sections.forEach(section => section.style.display = 'flex');
            titles.forEach(title => title.style.display = 'block');
            break;
        default:
            console.log(`Unknown category: ${category}`);
    }
}