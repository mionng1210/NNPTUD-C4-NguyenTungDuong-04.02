// Global variables
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let pageSize = 10;
let currentSort = { field: null, direction: 'asc' };

// Sort products by field
function sortProducts(field) {
    // Toggle direction if same field, otherwise reset to asc
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }

    // Sort filteredProducts
    filteredProducts.sort((a, b) => {
        let valA, valB;

        if (field === 'title') {
            valA = (a.title || '').toLowerCase();
            valB = (b.title || '').toLowerCase();
        } else if (field === 'price') {
            valA = a.price || 0;
            valB = b.price || 0;
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Update sort icons
    updateSortIcons();

    // Reset to first page and render
    currentPage = 1;
    renderCurrentPage();
}

// Update sort icons in table header
function updateSortIcons() {
    const sortables = document.querySelectorAll('.sortable');
    sortables.forEach(th => {
        th.classList.remove('asc', 'desc', 'active');
        if (th.dataset.sort === currentSort.field) {
            th.classList.add(currentSort.direction, 'active');
        }
    });
}

// Export current view to CSV
function exportToCSV() {
    if (filteredProducts.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    // CSV headers
    const headers = ['ID', 'Title', 'Price', 'Category', 'Description', 'Images'];

    // Build CSV content
    let csvContent = headers.join(',') + '\n';

    filteredProducts.forEach(product => {
        const row = [
            product.id,
            `"${escapeCSV(product.title)}"`,
            product.price,
            `"${escapeCSV(product.category?.name || 'N/A')}"`,
            `"${escapeCSV(product.description || '')}"`,
            `"${escapeCSV(product.images?.join('; ') || '')}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${formatDate()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Escape special characters for CSV
function escapeCSV(text) {
    if (!text) return '';
    return text.toString().replace(/"/g, '""').replace(/\n/g, ' ');
}

// Format date for filename
function formatDate() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

// Fetch products from db.json and display in dashboard
document.addEventListener('DOMContentLoaded', function () {
    fetchProducts();

    // Add search event listener
    document.getElementById('searchInput').addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterProducts(searchTerm);
    });

    // Add page size change listener
    document.getElementById('pageSize').addEventListener('change', function (e) {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderCurrentPage();
    });
});

// Filter products by title
function filterProducts(searchTerm) {
    if (!searchTerm) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product =>
            product.title.toLowerCase().includes(searchTerm)
        );
    }
    currentPage = 1;
    renderCurrentPage();
}

async function fetchProducts() {
    try {
        const response = await fetch('db.json');
        const products = await response.json();

        // Store products globally
        allProducts = products;
        filteredProducts = [...products];

        renderCurrentPage();
        updateStats(products);

        // Hide loading spinner and show table & pagination
        document.getElementById('loading').style.display = 'none';
        document.getElementById('productTable').style.display = 'table';
        document.getElementById('paginationContainer').style.display = 'flex';

    } catch (error) {
        console.error('Error fetching products:', error);
        document.getElementById('loading').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <strong>Lỗi!</strong> Không thể tải dữ liệu sản phẩm. Vui lòng kiểm tra file db.json.
            </div>
        `;
    }
}

// Render current page with pagination
function renderCurrentPage() {
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Ensure current page is valid
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Get items for current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = filteredProducts.slice(startIndex, endIndex);

    // Display products
    displayProducts(pageItems);

    // Update pagination UI
    updatePaginationUI(totalPages, totalItems);
}

// Update pagination buttons and info
function updatePaginationUI(totalPages, totalItems) {
    const paginationNav = document.getElementById('paginationNav');
    const pageInfo = document.getElementById('pageInfo');

    // Update page info
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    pageInfo.textContent = `Hiển thị ${startItem}-${endItem} của ${totalItems} sản phẩm`;

    // Build pagination buttons
    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">«</a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">»</a>
        </li>
    `;

    paginationNav.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderCurrentPage();
        // Scroll to table
        document.getElementById('productTable').scrollIntoView({ behavior: 'smooth' });
    }
}

function displayProducts(products) {
    const tableBody = document.getElementById('productTableBody');
    tableBody.innerHTML = '';

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">
                    Không tìm thấy sản phẩm nào
                </td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');

        // Get first image URL
        const imageUrl = product.images && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/80';

        // Get category name
        const categoryName = product.category && product.category.name
            ? product.category.name
            : 'N/A';

        // Get description for tooltip
        const description = product.description || 'Không có mô tả';

        // Add click event to open modal
        row.addEventListener('click', () => openProductModal(product.id));
        row.style.cursor = 'pointer';

        row.innerHTML = `
            <td><span class="product-id">#${product.id}</span></td>
            <td>
                <strong>${escapeHtml(product.title)}</strong>
            </td>
            <td><span class="price-tag">$${formatPrice(product.price)}</span></td>
            <td><span class="category-badge">${escapeHtml(categoryName)}</span></td>
            <td>
                <img src="${escapeHtml(imageUrl)}"
                     alt="${escapeHtml(product.title)}"
                     class="product-image"
                     onerror="this.src='https://via.placeholder.com/80?text=No+Image'">
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Initialize Bootstrap tooltips - removed as we're using click for modal
}

// Current product being viewed/edited
let currentProduct = null;
let productModal = null;

// Open product detail modal
function openProductModal(productId) {
    currentProduct = allProducts.find(p => p.id === productId);
    if (!currentProduct) return;

    // Populate view mode
    const imageUrl = currentProduct.images?.[0] || 'https://via.placeholder.com/300';
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalImage').onerror = function () {
        this.src = 'https://via.placeholder.com/300?text=No+Image';
    };
    document.getElementById('modalId').textContent = '#' + currentProduct.id;
    document.getElementById('modalTitle').textContent = currentProduct.title;
    document.getElementById('modalPrice').textContent = '$' + currentProduct.price;
    document.getElementById('modalCategory').textContent = currentProduct.category?.name || 'N/A';
    document.getElementById('modalDescription').textContent = currentProduct.description || 'Không có mô tả';

    // Reset to view mode
    toggleEditMode(false);

    // Show modal
    if (!productModal) {
        productModal = new bootstrap.Modal(document.getElementById('productModal'));
    }
    productModal.show();
}

// Toggle between view and edit mode
function toggleEditMode(isEdit) {
    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');
    const viewButtons = document.getElementById('viewButtons');
    const editButtons = document.getElementById('editButtons');

    if (isEdit) {
        // Populate edit form
        document.getElementById('editId').value = currentProduct.id;
        document.getElementById('editTitle').value = currentProduct.title || '';
        document.getElementById('editPrice').value = currentProduct.price || 0;
        document.getElementById('editDescription').value = currentProduct.description || '';
        document.getElementById('editImage').value = currentProduct.images?.[0] || '';

        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        viewButtons.style.display = 'none';
        editButtons.style.display = 'block';
    } else {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
        viewButtons.style.display = 'block';
        editButtons.style.display = 'none';
    }
}

// Save product changes
async function saveProduct() {
    const id = parseInt(document.getElementById('editId').value);
    const title = document.getElementById('editTitle').value.trim();
    const price = parseFloat(document.getElementById('editPrice').value);
    const description = document.getElementById('editDescription').value.trim();
    const imageUrl = document.getElementById('editImage').value.trim();

    if (!title) {
        alert('Vui lòng nhập tiêu đề!');
        return;
    }

    // Update in local arrays
    const updateProduct = (arr) => {
        const index = arr.findIndex(p => p.id === id);
        if (index !== -1) {
            arr[index].title = title;
            arr[index].price = price;
            arr[index].description = description;
            if (imageUrl) {
                arr[index].images = [imageUrl];
            }
        }
    };

    updateProduct(allProducts);
    updateProduct(filteredProducts);

    // Update current product
    currentProduct.title = title;
    currentProduct.price = price;
    currentProduct.description = description;
    if (imageUrl) {
        currentProduct.images = [imageUrl];
    }

    // Show success message
    alert('Đã cập nhật sản phẩm thành công!');

    // Update modal view
    document.getElementById('modalImage').src = imageUrl || 'https://via.placeholder.com/300';
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalPrice').textContent = '$' + price;
    document.getElementById('modalDescription').textContent = description || 'Không có mô tả';

    // Switch back to view mode
    toggleEditMode(false);

    // Re-render table
    renderCurrentPage();
    updateStats(allProducts);
}

// Create Modal
let createModal = null;

// Category mapping
const categoryMap = {
    1: { id: 1, name: "Clothes", slug: "clothes", image: "https://i.imgur.com/QkIa5tT.jpeg" },
    2: { id: 2, name: "Electronics", slug: "electronics", image: "https://i.imgur.com/ZANVnHE.jpeg" },
    3: { id: 3, name: "Furniture", slug: "furniture", image: "https://i.imgur.com/Qphac99.jpeg" },
    4: { id: 4, name: "Shoes", slug: "shoes", image: "https://i.imgur.com/qNOjJje.jpeg" },
    5: { id: 5, name: "Miscellaneous", slug: "miscellaneous", image: "https://i.imgur.com/BG8J0Fj.jpg" }
};

// Open create modal
function openCreateModal() {
    // Reset form
    document.getElementById('createForm').reset();

    // Show modal
    if (!createModal) {
        createModal = new bootstrap.Modal(document.getElementById('createModal'));
    }
    createModal.show();
}

// Create new product
async function createProduct() {
    const title = document.getElementById('createTitle').value.trim();
    const price = parseFloat(document.getElementById('createPrice').value);
    const categoryId = parseInt(document.getElementById('createCategory').value);
    const description = document.getElementById('createDescription').value.trim();
    const imageUrl = document.getElementById('createImage').value.trim();

    // Validation
    if (!title) {
        alert('Vui lòng nhập tên sản phẩm!');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('Vui lòng nhập giá hợp lệ!');
        return;
    }

    // Generate new ID
    const maxId = allProducts.reduce((max, p) => Math.max(max, p.id), 0);
    const newId = maxId + 1;

    // Create new product object
    const newProduct = {
        id: newId,
        title: title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        price: price,
        description: description || 'Sản phẩm mới',
        category: categoryMap[categoryId],
        images: imageUrl ? [imageUrl] : ['https://via.placeholder.com/300'],
        creationAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add to local arrays
    allProducts.unshift(newProduct);
    filteredProducts.unshift(newProduct);

    // Show success message
    alert('Đã tạo sản phẩm mới thành công!');

    // Close modal
    createModal.hide();

    // Reset to first page and render
    currentPage = 1;
    renderCurrentPage();
    updateStats(allProducts);
}
function updateStats(products) {
    // Total products
    document.getElementById('totalProducts').textContent = products.length;

    // Unique categories
    const categories = new Set(products.map(p => p.category?.name).filter(Boolean));
    document.getElementById('totalCategories').textContent = categories.size;

    // Average price
    const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const avgPrice = products.length > 0 ? Math.round(totalPrice / products.length) : 0;
    document.getElementById('avgPrice').textContent = `$${avgPrice}`;
}

function formatPrice(price) {
    if (price >= 1000000) {
        return (price / 1000000).toFixed(1) + 'M';
    } else if (price >= 1000) {
        return (price / 1000).toFixed(1) + 'K';
    }
    return price;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
