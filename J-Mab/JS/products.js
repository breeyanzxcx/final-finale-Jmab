document.addEventListener("DOMContentLoaded", () => {
    console.log("Page loaded, fetching products...");

    const urlParams = new URLSearchParams(window.location.search);
    let selectedCategory = urlParams.get("category") ? urlParams.get("category").toLowerCase() : "tires";

    // Load products with the selected category
    loadProducts(selectedCategory);
    setupCategoryFiltering();

    const sidebarLinks = document.querySelectorAll(".sidebar a[data-category]");
    sidebarLinks.forEach(link => {
      if (link.getAttribute("data-category") === selectedCategory) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });

document.getElementById("sortLowHigh").addEventListener("click", (e) => {
  e.preventDefault();
  sortProducts("lowToHigh");
});

document.getElementById("sortHighLow").addEventListener("click", (e) => {
  e.preventDefault();
  sortProducts("highToLow");
});

function sortProducts(sortOrder) {
  const sections = [
    { selector: '.tire-section .item-container', items: '.tire-section .item-container .item' },
    { selector: '.Battery-section .item-container', items: '.Battery-section .item-container .item' },
    { selector: '.Lubricant-section .item-container', items: '.Lubricant-section .item-container .item' },
    { selector: '.Oil-section .item-container', items: '.Oil-section .item-container .item' }
  ];

  sections.forEach(section => {
    const container = document.querySelector(section.selector);
    const items = Array.from(document.querySelectorAll(section.items));

    if (container && items.length > 0) {
      console.log(`Sorting ${section.selector}...`);

      items.sort((a, b) => {
        const priceElementA = a.querySelector('.price');
        const priceElementB = b.querySelector('.price');

        console.log('Price Element A:', priceElementA);
        console.log('Price Element B:', priceElementB);

        const priceA = priceElementA ? parseFloat(priceElementA.textContent.replace('Price: ₱', '')) : 0;
        const priceB = priceElementB ? parseFloat(priceElementB.textContent.replace('Price: ₱', '')) : 0;

        console.log('Price A:', priceA);
        console.log('Price B:', priceB);

        if (sortOrder === "lowToHigh") {
          return priceA - priceB;
        } else if (sortOrder === "highToLow") {
          return priceB - priceA;
        }
        return 0;
      });

      container.innerHTML = "";
      items.forEach(item => container.appendChild(item));
    }
  });
}
async function loadProducts(selectedCategory = "tires") {
  try {
    const response = await fetch("http://localhost/jmab/final-jmab/api/products");
    const data = await response.json();

    console.log("API Response:", data);

    if (data.success && Array.isArray(data.products)) {
      const products = data.products;

      // Select product sections
      const tireSection = document.querySelector(".tire-section .item-container");
      const batterySection = document.querySelector(".Battery-section .item-container");
      const lubricantSection = document.querySelector(".Lubricant-section .item-container");
      const oilSection = document.querySelector(".Oil-section .item-container");

      // Clear previous content
      tireSection.innerHTML = "";
      batterySection.innerHTML = "";
      lubricantSection.innerHTML = "";
      oilSection.innerHTML = "";

      // Hide all sections initially
      document.querySelector(".tire-section").style.display = "none";
      document.querySelector(".Battery-section").style.display = "none";
      document.querySelector(".Lubricant-section").style.display = "none";
      document.querySelector(".Oil-section").style.display = "none";

      // Filter and display products
      products.forEach(product => {
        let category = product.category.trim().toLowerCase();
        const productElement = document.createElement("div");
        productElement.classList.add("item");

        productElement.innerHTML = `
          <img src="${product.image_url}" alt="${product.name}">
          <h4>${product.name}</h4>
          <p class="description">${product.description}</p>
          <p>Stock: ${product.stock}</p>
          ${product.size ? `<p>Size: ${product.size}</p>` : ""}
          ${product.voltage ? `<p>Voltage: ${product.voltage}</p>` : ""}
          <p class="price">Price: ₱${product.price}</p> <!-- Add class="price" here -->
          <a href="../HTML/productBoard.html?productId=${product.product_id}" class="view-product-btn">View Product</a>
          `;

        if (category.includes("tire") && (selectedCategory === "tires" || selectedCategory === "all")) {
          tireSection.appendChild(productElement);
          document.querySelector(".tire-section").style.display = "block";
        } else if (category.includes("batter") && (selectedCategory === "batteries" || selectedCategory === "all")) {
          batterySection.appendChild(productElement);
          document.querySelector(".Battery-section").style.display = "block";
        } else if (category.includes("lubric") && (selectedCategory === "lubricants" || selectedCategory === "all")) {
          lubricantSection.appendChild(productElement);
          document.querySelector(".Lubricant-section").style.display = "block";
        } else if (category.includes("oil") && (selectedCategory === "oils" || selectedCategory === "all")) {
          oilSection.appendChild(productElement);
          document.querySelector(".Oil-section").style.display = "block";
        }
      });

      console.log(`Loaded products for category: ${selectedCategory}`);
    } else {
      console.error("API returned unexpected data:", data);
    }
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

  // Function to set up category filtering
  function setupCategoryFiltering() {
    const categoryLinks = document.querySelectorAll(".sidebar a[data-category]");
    categoryLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const category = link.getAttribute("data-category");
        loadProducts(category);

        // Update URL
        history.pushState(null, "", `?category=${category}`);

        // Update active link
        categoryLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      });
    });
  }

  // Toggle dropdown function
  function toggleDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
  }

  function logoutUser() {
    const confirmLogout = confirm("Are you sure you want to log out?");
    
    if (confirmLogout) {
        // Clear authentication data
        localStorage.removeItem("authToken"); // Remove token if using authentication
        sessionStorage.removeItem("authToken");

        // Redirect to login page
        window.location.href = "../HTML/sign-in.php"; // Change this to your actual login page
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", (event) => {
            event.preventDefault();
            logoutUser();
        });
    }
});


//CODE NG SEARCH BAR//
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar button');

    const originalLoadProducts = loadProducts;
    loadProducts = async function(selectedCategory = "tires") {
        await originalLoadProducts(selectedCategory);
        setupSearch();
    };

    function setupSearch() {
        function performSearch() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            const sections = [
                { selector: '.tire-section', container: '.tire-section .item-container' },
                { selector: '.Battery-section', container: '.Battery-section .item-container' },
                { selector: '.Lubricant-section', container: '.Lubricant-section .item-container' },
                { selector: '.Oil-section', container: '.Oil-section .item-container' }
            ];

            let anyResultFound = false;

            sections.forEach(section => {
                const sectionElement = document.querySelector(section.selector);
                const itemContainer = document.querySelector(section.container);
                
                if (!sectionElement || !itemContainer) return;

                const productItems = itemContainer.querySelectorAll('.item');
                let sectionHasResults = false;

                productItems.forEach(item => {
                    const nameElement = item.querySelector('h4');
                    const descElement = item.querySelector('.description');
                    const sizeElement = item.querySelector('p:nth-child(4)');
                    const priceElement = item.querySelector('p:nth-child(6)');

                    if (!nameElement || !descElement) return;

                    const productName = nameElement.textContent.toLowerCase();
                    const productDesc = descElement.textContent.toLowerCase();
                    const productSize = sizeElement ? sizeElement.textContent.toLowerCase() : '';
                    const productPrice = priceElement ? priceElement.textContent.toLowerCase() : '';

                    if (
                        productName.includes(searchTerm) || 
                        productDesc.includes(searchTerm) ||
                        productSize.includes(searchTerm) ||
                        productPrice.includes(searchTerm)
                    ) {
                        item.style.display = 'block';
                        sectionHasResults = true;
                        anyResultFound = true;
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Show/hide section based on search results
                sectionElement.style.display = sectionHasResults ? 'block' : 'none';
            });

            const resultsContainer = document.querySelector('.products');
            let noResultsMessage = document.getElementById('no-results-message');

            if (!anyResultFound) {
                if (!noResultsMessage) {
                    noResultsMessage = document.createElement('div');
                    noResultsMessage.id = 'no-results-message';
                    noResultsMessage.textContent = 'No products found matching your search.';
                    noResultsMessage.style.textAlign = 'center';
                    noResultsMessage.style.padding = '20px';
                    noResultsMessage.style.color = 'gray';
                    resultsContainer.appendChild(noResultsMessage);
                } else {
                    noResultsMessage.style.display = 'block';
                }
            } else if (noResultsMessage) {
                noResultsMessage.style.display = 'none';
            }
        }

        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }

    setupSearch();
});