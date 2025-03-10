document.addEventListener('DOMContentLoaded', () => {
    const returnBtn = document.getElementById('returnBtn');
    
    if (returnBtn) {
        returnBtn.addEventListener('click', () => {
            // Attempt to get the category from the URL of the product board page
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('productId');

            // Try to determine the category based on the product ID (if available)
            fetch('http://localhost/jmab/final-jmab/api/products')
                .then(response => response.json())
                .then(data => {
                    if (data.success && Array.isArray(data.products)) {
                        const product = data.products.find(p => String(p.product_id) === String(productId));
                        
                        let redirectCategory = 'tires'; // Default category
                        
                        if (product) {
                            const category = product.category.toLowerCase();
                            
                            if (category.includes('tire')) {
                                redirectCategory = 'tires';
                            } else if (category.includes('batter')) {
                                redirectCategory = 'batteries';
                            } else if (category.includes('lubric') || category.includes('oil')) {
                                redirectCategory = 'lubricants';
                            }
                        }

                        // Navigate to the correct product page
                        window.location.href = `../HTML/productPage.html?category=${redirectCategory}`;
                    } else {
                        // Fallback to tires if no products found
                        window.location.href = "../HTML/productPage.html?category=tires";
                    }
                })
                .catch(error => {
                    console.error('Error determining category:', error);
                    // Fallback to tires if there's an error
                    window.location.href = "../HTML/productPage.html?category=tires";
                });
        });
    }
});