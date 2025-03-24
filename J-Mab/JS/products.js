document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded, fetching products...");

  const urlParams = new URLSearchParams(window.location.search);
  let selectedCategory = urlParams.get("category") ? urlParams.get("category").toLowerCase() : "tires";

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

  const sortLowHighBtn = document.getElementById("sortLowHigh");
  if (sortLowHighBtn) {
      sortLowHighBtn.addEventListener("click", (e) => {
          e.preventDefault();
          sortProducts("lowToHigh");
      });
  }

  const sortHighLowBtn = document.getElementById("sortHighLow");
  if (sortHighLowBtn) {
      sortHighLowBtn.addEventListener("click", (e) => {
          e.preventDefault();
          sortProducts("highToLow");
      });
  }

  setupLogoutButton();
  setupSearch();
});

function setupLogoutButton() {
  const logoutButton = document.getElementById("logout");
  const logoutPopup = document.getElementById("logoutPopup");
  const confirmLogoutBtn = document.getElementById("confirmLogout");
  const cancelLogoutBtn = document.getElementById("cancelLogout");

  if (logoutButton && logoutPopup) {
      logoutButton.addEventListener("click", (event) => {
          event.preventDefault();
          logoutPopup.style.display = "flex";
      });

      if (confirmLogoutBtn) {
          confirmLogoutBtn.addEventListener("click", () => {
              localStorage.removeItem("authToken");
              sessionStorage.removeItem("authToken");
              window.location.href = "../HTML/sign-in.php";
          });
      }

      if (cancelLogoutBtn) {
          cancelLogoutBtn.addEventListener("click", () => {
              logoutPopup.style.display = "none";
          });
      }

      window.addEventListener("click", (event) => {
          if (event.target === logoutPopup) {
              logoutPopup.style.display = "none";
          }
      });
  } else {
      console.error("Logout button or popup not found. Check your HTML.");
  }
}

function sortProducts(sortOrder) {
  console.log(`Sorting products ${sortOrder}...`);

  const sections = [
      { selector: '.tire-section .item-container', items: '.tire-section .item-container .item' },
      { selector: '.Battery-section .item-container', items: '.Battery-section .item-container .item' },
      { selector: '.Lubricant-section .item-container', items: '.Lubricant-section .item-container .item' },
      { selector: '.Oil-section .item-container', items: '.Oil-section .item-container .item' }
  ];

  sections.forEach(section => {
      const container = document.querySelector(section.selector);
      if (!container) {
          console.warn(`Container not found: ${section.selector}`);
          return;
      }

      const items = Array.from(document.querySelectorAll(section.items));
      if (items.length === 0) {
          console.warn(`No items found in: ${section.selector}`);
          return;
      }

      console.log(`Sorting ${items.length} items in ${section.selector}...`);

      items.sort((a, b) => {
          const priceElementA = a.querySelector('.price');
          const priceElementB = b.querySelector('.price');

          if (!priceElementA || !priceElementB) {
              console.warn('Price element not found', { a, b });
              return 0;
          }

          const priceTextA = priceElementA.textContent.trim();
          const priceTextB = priceElementB.textContent.trim();

          const priceA = parseFloat(priceTextA.replace(/[^\d.]/g, '')) || 0;
          const priceB = parseFloat(priceTextB.replace(/[^\d.]/g, '')) || 0;

          if (sortOrder === "lowToHigh") {
              return priceA - priceB;
          } else if (sortOrder === "highToLow") {
              return priceB - priceA;
          }
          return 0;
      });

      container.innerHTML = "";
      items.forEach(item => container.appendChild(item));
      console.log(`Successfully sorted ${items.length} items in ${section.selector}`);
  });
}

async function loadProducts(selectedCategory = "tires") {
  try {
      const response = await fetch("http://localhost/jmab/final-jmab/api/products");
      const data = await response.json();

      console.log("API Response:", data);

      if (data.success && Array.isArray(data.products)) {
          const products = data.products;

          const tireSection = document.querySelector(".tire-section .item-container");
          const batterySection = document.querySelector(".Battery-section .item-container");
          const lubricantSection = document.querySelector(".Lubricant-section .item-container");
          const oilSection = document.querySelector(".Oil-section .item-container");

          if (tireSection) tireSection.innerHTML = "";
          if (batterySection) batterySection.innerHTML = "";
          if (lubricantSection) lubricantSection.innerHTML = "";
          if (oilSection) oilSection.innerHTML = "";

          document.querySelector(".tire-section").style.display = "none";
          document.querySelector(".Battery-section").style.display = "none";
          document.querySelector(".Lubricant-section").style.display = "none";
          document.querySelector(".Oil-section").style.display = "none";

          for (const product of products) {
              let category = product.category.trim().toLowerCase();
              const productElement = document.createElement("div");
              productElement.classList.add("item");
              
              let isOutOfStock = true;
              if (product.variants && product.variants.length > 0) {
                  isOutOfStock = !product.variants.some(variant => variant.stock > 0);
              }
              
              if (isOutOfStock) {
                  productElement.classList.add("out-of-stock");
              }
              
              let priceDisplay = '';
              if (product.variants && product.variants.length > 0) {
                  const prices = product.variants.map(variant => parseFloat(variant.price));
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  priceDisplay = minPrice === maxPrice ? `₱${minPrice}` : `₱${minPrice} - ₱${maxPrice}`;
              } else {
                  priceDisplay = `₱${product.price}`;
              }

              let averageRating = 0;
              let ratingCount = 0;
              try {
                  const ratingResponse = await fetch(`http://localhost/jmab/final-jmab/api/ratings/product/${product.product_id}`, {
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      }
                  });
                  const ratingData = await ratingResponse.json();
                  if (ratingData.success) {
                      averageRating = ratingData.average_rating;
                      ratingCount = ratingData.rating_count;
                  }
              } catch (error) {
                  console.error(`Error fetching rating for product ${product.product_id}:`, error);
              }

              productElement.innerHTML = `
                  <img src="${product.image_url}" alt="${product.name}">
                  <h4>${product.name}</h4>
                  <p class="description">${truncateText(product.description, 100)}</p>
                  <p class="price">${priceDisplay}</p>
                  ${isOutOfStock ? `<div class="out-of-stock-overlay">OUT OF STOCK</div>` : ""}
              `;

              productElement.addEventListener('click', () => {
                  window.location.href = `../HTML/productBoard.html?productId=${product.product_id}`;
              });

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
          }

          console.log(`Loaded products for category: ${selectedCategory}`);
      } else {
          console.error("API returned unexpected data:", data);
      }
  } catch (error) {
      console.error("Error fetching products:", error);
  }
}

function generateRatingStars(rating) {
  const maxStars = 5;
  let stars = "";
  const ratingValue = parseFloat(rating) || 0;
  for (let i = 1; i <= maxStars; i++) {
      if (i <= ratingValue) {
          stars += `<span class="star filled">★</span>`;
      } else {
          stars += `<span class="star">☆</span>`;
      }
  }
  return stars;
}

function setupCategoryFiltering() {
  const categoryLinks = document.querySelectorAll(".sidebar a[data-category]");
  categoryLinks.forEach(link => {
      link.addEventListener("click", (e) => {
          e.preventDefault();
          const category = link.getAttribute("data-category");
          loadProducts(category);
          history.pushState(null, "", `?category=${category}`);
          categoryLinks.forEach(l => l.classList.remove("active"));
          link.classList.add("active");
      });
  });
}

function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
      dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
  }
}

function setupSearch() {
  const searchInput = document.querySelector('.search-bar input');
  const searchButton = document.querySelector('.search-bar button');

  if (!searchInput || !searchButton) {
      console.error("Search input or button not found.");
      return;
  }

  function performSearch() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      console.log("Searching for:", searchTerm);

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
              if (!nameElement) return;

              const productName = nameElement.textContent.toLowerCase();
              if (productName.includes(searchTerm)) {
                  item.style.display = 'block';
                  sectionHasResults = true;
                  anyResultFound = true;
              } else {
                  item.style.display = 'none';
              }
          });

          sectionElement.style.display = sectionHasResults ? 'block' : 'none';
      });

      let noResultsMessage = document.getElementById('no-results-message');
      if (!anyResultFound) {
          if (!noResultsMessage) {
              noResultsMessage = document.createElement('div');
              noResultsMessage.id = 'no-results-message';
              noResultsMessage.textContent = 'No products found matching your search.';
              noResultsMessage.style.textAlign = 'center';
              noResultsMessage.style.padding = '20px';
              noResultsMessage.style.color = 'gray';
              document.querySelector('.products').appendChild(noResultsMessage);
          } else {
              noResultsMessage.style.display = 'block';
          }
      } else if (noResultsMessage) {
          noResultsMessage.style.display = 'none';
      }
  }

  searchInput.addEventListener('input', performSearch);
  searchButton.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
          performSearch();
      }
  });
}

function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}