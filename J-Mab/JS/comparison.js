// Global variables to store selected products for comparison
let productsToCompare = [];
const MAX_COMPARE_PRODUCTS = 2; // Changed to 2 products max

document.addEventListener("DOMContentLoaded", () => {
  // Setup compare functionality
  setupCompareButton();
  
  // Close modal when X is clicked
  const closeBtn = document.querySelector("#compare-modal .close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("compare-modal").style.display = "none";
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("compare-modal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
});

function setupCompareButton() {
  // Create Compare button and add to product details
  const productDetailsDiv = document.querySelector(".product-details");
  if (productDetailsDiv) {
    const buttonsDiv = document.querySelector(".buttons");
    if (buttonsDiv) {
      // Check if button already exists to avoid duplicates
      if (!document.querySelector(".compare-btn")) {
        const compareBtn = document.createElement("button");
        compareBtn.className = "compare-btn";
        compareBtn.textContent = "COMPARE";
        compareBtn.addEventListener("click", openCompareModal);
        buttonsDiv.appendChild(compareBtn);
      }
    }
  }
}

async function openCompareModal() {
  // Show and prepare the modal first
  const modal = document.getElementById("compare-modal");
  const modalContent = modal.querySelector(".modal-content");
  
  // Clear previous content
  document.getElementById("product-selection").innerHTML = "";
  
  // Show loading message
  const loadingMessage = document.createElement("p");
  loadingMessage.textContent = "Loading products for comparison...";
  loadingMessage.id = "loading-message";
  modalContent.appendChild(loadingMessage);
  
  modal.style.display = "block";
  
  // Get current product ID and category
  const urlParams = new URLSearchParams(window.location.search);
  const currentProductId = urlParams.get("productId");
  
  if (!currentProductId) {
    showError("Product ID not found. Please try again with a valid product.");
    return;
  }
  
  try {
    // First, get the current product to determine its category
    console.log(`Fetching product data for ID: ${currentProductId}`);
    const currentProductResponse = await fetch(`http://localhost/jmab/final-jmab/api/products/${currentProductId}`);
    
    if (!currentProductResponse.ok) {
      throw new Error(`HTTP error! status: ${currentProductResponse.status}`);
    }
    
    const currentProductData = await currentProductResponse.json();
    console.log("Product data response:", currentProductData);
    
    console.log("Raw API response:", currentProductData);
    if (!currentProductData.success) {
      showError("Failed to load product information. The API returned an unsuccessful response.");
      return;
    }
    
    const currentProduct = currentProductData.products;
    if (!currentProduct) {
      showError("Failed to load product information. Product data is missing.");
      return;
    }
    const category = currentProduct.category ? currentProduct.category.trim() : "";
    
    if (!category) {
      showError("Product category is missing. Cannot find similar products.");
      return;
    }
    
    // Now fetch all products
    console.log("Fetching all products");
    const productsResponse = await fetch("http://localhost/jmab/final-jmab/api/products");
    
    if (!productsResponse.ok) {
      throw new Error(`HTTP error! status: ${productsResponse.status}`);
    }
    
    const data = await productsResponse.json();
    console.log("All products response:", data);
    
    if (!data.success || !Array.isArray(data.products)) {
      showError("Failed to load products for comparison. The API returned an invalid response.");
      return;
    }
    
    // Filter products by the same category and exclude current product
    const sameCategory = data.products.filter(product => {
      const productCategory = product.category ? product.category.trim() : "";
      return productCategory === category && 
             product.product_id.toString() !== currentProductId;
    });
    
    console.log(`Found ${sameCategory.length} products in the same category: ${category}`);
    
    // Remove loading message
    const loadingMsg = document.getElementById("loading-message");
    if (loadingMsg) {
      loadingMsg.remove();
    }
    
    // Create the comparison board
    createComparisonBoard(currentProduct, sameCategory);
    
  } catch (error) {
    console.error("Error fetching products for comparison:", error);
    showError(`An error occurred while loading products: ${error.message}`);
  }
}

function showError(message) {
  console.error(message);
  
  // Remove loading message if it exists
  const loadingMsg = document.getElementById("loading-message");
  if (loadingMsg) {
    loadingMsg.remove();
  }
  
  // Clear previous error message if it exists
  const prevError = document.getElementById("error-message");
  if (prevError) {
    prevError.remove();
  }
  
  // Create and display error message
  const errorMessage = document.createElement("p");
  errorMessage.textContent = message;
  errorMessage.id = "error-message";
  errorMessage.style.color = "red";
  errorMessage.style.textAlign = "center";
  errorMessage.style.padding = "20px";
  
  const modal = document.getElementById("compare-modal");
  const modalContent = modal.querySelector(".modal-content");
  modalContent.appendChild(errorMessage);
}

function createComparisonBoard(currentProduct, sameCategoryProducts) {
  // Clear previous content
  const modal = document.getElementById("compare-modal");
  const modalContent = modal.querySelector(".modal-content");
  
  // Update modal title
  const modalTitle = modalContent.querySelector("h2");
  modalTitle.textContent = `Compare ${currentProduct.category} Products`;
  
  // Remove previous comparison content
  const previousContent = document.getElementById("comparison-container");
  if (previousContent) {
    previousContent.remove();
  }
  
  // Create container for the comparison board
  const comparisonContainer = document.createElement("div");
  comparisonContainer.id = "comparison-container";
  
  // Create two-column layout
  const productBoardsContainer = document.createElement("div");
  productBoardsContainer.className = "product-boards-container";
  
  // Add current product board
  const currentProductBoard = createProductBoard(currentProduct);
  productBoardsContainer.appendChild(currentProductBoard);
  
  // Create dropdown for selecting product to compare with
  const selectionContainer = document.createElement("div");
  selectionContainer.className = "product-selection-container";
  
  const selectLabel = document.createElement("label");
  selectLabel.textContent = "Select a product to compare with:";
  selectLabel.htmlFor = "compare-product-select";
  
  const select = document.createElement("select");
  select.id = "compare-product-select";
  
  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select a product --";
  select.appendChild(defaultOption);
  
  // Add options for each product in same category
  if (sameCategoryProducts.length === 0) {
    const noProductsOption = document.createElement("option");
    noProductsOption.value = "";
    noProductsOption.textContent = "No other products in this category";
    noProductsOption.disabled = true;
    select.appendChild(noProductsOption);
    select.disabled = true;
  } else {
    sameCategoryProducts.forEach(product => {
      const option = document.createElement("option");
      option.value = product.product_id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  }
  
  // Placeholder for second product board
  const secondProductPlaceholder = document.createElement("div");
  secondProductPlaceholder.id = "second-product-placeholder";
  secondProductPlaceholder.className = "product-board placeholder";
  
  if (sameCategoryProducts.length === 0) {
    secondProductPlaceholder.innerHTML = "<p>No other products available in this category</p>";
  } else {
    secondProductPlaceholder.innerHTML = "<p>Select a product to compare</p>";
  }
  
  // Add event listener to select dropdown
  select.addEventListener("change", async (event) => {
    const selectedProductId = event.target.value;
    
    // Remove placeholder or previous product
    const placeholder = document.getElementById("second-product-placeholder");
    const secondProductBoard = document.getElementById("second-product-board");
    
    if (placeholder) {
      placeholder.remove();
    }
    
    if (secondProductBoard) {
      secondProductBoard.remove();
    }
    
    if (!selectedProductId) {
      // If no product selected, show placeholder
      productBoardsContainer.appendChild(secondProductPlaceholder);
      return;
    }
    
    try {
      // Show loading indicator
      const loadingPlaceholder = document.createElement("div");
      loadingPlaceholder.id = "second-product-loading";
      loadingPlaceholder.className = "product-board placeholder";
      loadingPlaceholder.innerHTML = "<p>Loading product data...</p>";
      productBoardsContainer.appendChild(loadingPlaceholder);
      
      // Fetch the selected product details
      const response = await fetch(`http://localhost/jmab/final-jmab/api/products/${selectedProductId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Remove loading placeholder
      const loadingElem = document.getElementById("second-product-loading");
      if (loadingElem) {
        loadingElem.remove();
      }
      
      if (data.success && data.products) {
        const productBoard = createProductBoard(data.products);
        productBoard.id = "second-product-board";
        productBoardsContainer.appendChild(productBoard);
      } else {
        throw new Error("Failed to load product data");
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      
      // Remove loading placeholder if it exists
      const loadingElem = document.getElementById("second-product-loading");
      if (loadingElem) {
        loadingElem.remove();
      }
      
      // Show error placeholder
      const errorPlaceholder = document.createElement("div");
      errorPlaceholder.id = "second-product-board";
      errorPlaceholder.className = "product-board placeholder";
      errorPlaceholder.innerHTML = `<p>Error loading product: ${error.message}</p>`;
      productBoardsContainer.appendChild(errorPlaceholder);
    }
  });
  
  selectionContainer.appendChild(selectLabel);
  selectionContainer.appendChild(select);
  
  // Add initial placeholder for second product
  productBoardsContainer.appendChild(secondProductPlaceholder);
  
  // Add elements to container
  comparisonContainer.appendChild(selectionContainer);
  comparisonContainer.appendChild(productBoardsContainer);
  
  // Add to modal content
  modalContent.appendChild(comparisonContainer);
}

function createProductBoard(product) {
  console.log("Creating product board for:", product);
  
  const productBoard = document.createElement("div");
  productBoard.className = "product-board";
  
  // Create product image
  const imageContainer = document.createElement("div");
  imageContainer.className = "product-image-container";
  
  const image = document.createElement("img");
  // Check if image URL is available
  image.src = product.image_url || "../imahe/placeholder.png";
  image.alt = product.name;
  image.onerror = function() {
    this.src = "../imahe/placeholder.png";
    this.alt = "Image not available";
  };
  imageContainer.appendChild(image);
  
  // Create product info
  const productInfo = document.createElement("div");
  productInfo.className = "product-info";
  
  // Product name
  const nameHeading = document.createElement("h3");
  nameHeading.textContent = product.name || "Unnamed Product";
  productInfo.appendChild(nameHeading);
  
  // Brand
  const brandInfo = document.createElement("p");
  brandInfo.className = "brand-info";
  brandInfo.textContent = `Brand: ${product.brand || "N/A"}`;
  productInfo.appendChild(brandInfo);
  
  // Price
  const priceInfo = document.createElement("div");
  priceInfo.className = "price-info";
  
  // Find lowest price among variants
  let priceText = "N/A";
  if (product.variants && product.variants.length > 0) {
    // Make sure we have valid prices
    const prices = product.variants
      .map(variant => parseFloat(variant.price))
      .filter(price => !isNaN(price));
    
    if (prices.length > 0) {
      priceText = `₱${Math.min(...prices).toFixed(2)}`;
    }
  }
  
  priceInfo.textContent = priceText;
  productInfo.appendChild(priceInfo);
  
  // Description
  const descInfo = document.createElement("div");
  descInfo.className = "desc-info";
  descInfo.textContent = product.description || "No description available";
  productInfo.appendChild(descInfo);
  
  // Rating
  const ratingInfo = document.createElement("div");
  ratingInfo.className = "rating-info";
  const rating = parseFloat(product.average_rating) || 0;
  ratingInfo.innerHTML = generateRatingStars(rating) + ` (${rating.toFixed(1)})`;
  productInfo.appendChild(ratingInfo);
  
  // Available sizes
  const sizesInfo = document.createElement("div");
  sizesInfo.className = "sizes-info";
  let sizesText = "Sizes: ";
  
  if (product.variants && product.variants.length > 0) {
    const sizes = product.variants
      .map(variant => variant.size || variant.name)
      .filter(size => size); // Filter out empty values
    
    if (sizes.length > 0) {
      sizesText += sizes.join(", ");
    } else {
      sizesText += "N/A";
    }
  } else {
    sizesText += "N/A";
  }
  
  sizesInfo.textContent = sizesText;
  productInfo.appendChild(sizesInfo);
  
  // Availability
  const availabilityInfo = document.createElement("div");
  availabilityInfo.className = "availability-info";
  
  // Check if any variant is in stock
  let inStock = false;
  if (product.variants && product.variants.length > 0) {
    inStock = product.variants.some(variant => {
      const stock = parseInt(variant.stock);
      return !isNaN(stock) && stock > 0;
    });
  }
  
  availabilityInfo.textContent = `Availability: ${inStock ? "In Stock" : "Out of Stock"}`;
  availabilityInfo.className = inStock ? "availability-info in-stock" : "availability-info out-of-stock";
  productInfo.appendChild(availabilityInfo);
  
  // View button
  const viewBtn = document.createElement("button");
  viewBtn.className = "view-product-btn";
  viewBtn.textContent = "View Product";
  viewBtn.addEventListener("click", () => {
    window.location.href = `../HTML/productBoard.html?productId=${product.product_id}`;
  });
  productInfo.appendChild(viewBtn);
  
  // Append all to product board
  productBoard.appendChild(imageContainer);
  productBoard.appendChild(productInfo);
  
  return productBoard;
}

// Helper function to generate rating stars
function generateRatingStars(rating) {
  const maxStars = 5;
  let stars = "";
  const ratingValue = parseFloat(rating) || 0;

  for (let i = 1; i <= maxStars; i++) {
    if (i <= ratingValue) {
      stars += `<span class="star filled">&#9733;</span>`; // Filled star
    } else {
      stars += `<span class="star">&#9734;</span>`; // Empty star
    }
  }
  return stars;
}

function addCompareButtonStyles() {
  if (document.getElementById('compare-styles')) {
    return;
  }
  
}
// Initialize the compare button styles when the page loads
document.addEventListener("DOMContentLoaded", addCompareButtonStyles);