// ═══════════════════════════════════════════════════════════════════
//  SWARNA SILK — Admin Logic
// ═══════════════════════════════════════════════════════════════════

const GAS_URL = window.SWARNA_CONFIG?.GAS_URL || "";

// State
let productsList = [];
let ordersList = [];
let storeSettings = {};
let authenticated = false;

window.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  checkSession();
});

// ── SESSION MANAGEMENT ───────────────────────────────────────────
function checkSession() {
  const isAuth = sessionStorage.getItem("admin_auth") === "true";
  if (isAuth) {
    authenticated = true;
    showWorkspace();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("login-container").style.display = "flex";
  document.getElementById("admin-workspace").style.display = "none";
}

async function showWorkspace() {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("admin-workspace").style.display = "flex";
  
  // Fetch initial data
  await fetchSettings();
  await loadDashboard();
}

async function handleLogin(event) {
  event.preventDefault();
  const password = document.getElementById("admin-pass").value;
  const loginBtn = document.getElementById("btn-login");
  const errDiv = document.getElementById("login-error");

  loginBtn.disabled = true;
  loginBtn.innerHTML = "Authenticating...";
  errDiv.style.display = "none";

  if (!GAS_URL) {
    // Offline Dev Mode verification
    if (password === "admin123") {
      sessionStorage.setItem("admin_auth", "true");
      authenticated = true;
      showWorkspace();
    } else {
      errDiv.textContent = "Invalid password. (Offline mode password is: admin123)";
      errDiv.style.display = "block";
      loginBtn.disabled = false;
      loginBtn.innerHTML = `Login Dashboard <i data-lucide="arrow-right"></i>`;
      lucide.createIcons();
    }
    return;
  }

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "checkAdminPass", password: password })
    });
    const result = await response.json();

    if (result.success && result.valid) {
      sessionStorage.setItem("admin_auth", "true");
      authenticated = true;
      showWorkspace();
    } else {
      errDiv.textContent = "Incorrect password. Please verify Google Sheet settings.";
      errDiv.style.display = "block";
      loginBtn.disabled = false;
      loginBtn.innerHTML = `Login Dashboard <i data-lucide="arrow-right"></i>`;
      lucide.createIcons();
    }
  } catch (error) {
    console.error(error);
    errDiv.textContent = "Failed to connect to Google Apps Script. Check config.js.";
    errDiv.style.display = "block";
    loginBtn.disabled = false;
    loginBtn.innerHTML = `Login Dashboard <i data-lucide="arrow-right"></i>`;
    lucide.createIcons();
  }
}

function handleLogout() {
  sessionStorage.removeItem("admin_auth");
  authenticated = false;
  location.reload();
}

// ── NAVIGATION ───────────────────────────────────────────────────
function switchAdminTab(tabId) {
  document.querySelectorAll(".admin-view").forEach(view => view.classList.remove("active"));
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => item.classList.remove("active"));

  document.getElementById(`admin-view-${tabId}`).classList.add("active");
  document.getElementById(`tab-btn-${tabId}`).classList.add("active");

  const titleMap = {
    dashboard: "Dashboard",
    products: "Saree Products",
    orders: "Customer Orders",
    settings: "Store Settings"
  };
  document.getElementById("admin-view-title").textContent = titleMap[tabId];

  // Refresh tab data
  if (tabId === "dashboard") loadDashboard();
  if (tabId === "products") loadProducts();
  if (tabId === "orders") loadOrders();
  if (tabId === "settings") loadSettingsForm();
}

// ── SETTINGS ─────────────────────────────────────────────────────
async function fetchSettings() {
  if (!GAS_URL) {
    storeSettings = {
      store_name: "Swarna Silk",
      whatsapp_number: "919876543210",
      currency_symbol: "₹",
      admin_password: "admin123"
    };
    return;
  }
  try {
    const res = await fetch(`${GAS_URL}?action=getSettings`);
    const json = await res.json();
    if (json.success && json.settings) {
      storeSettings = json.settings;
    }
  } catch (err) {
    console.warn("Error loading settings:", err);
  }
}

function loadSettingsForm() {
  document.getElementById("set-store-name").value = storeSettings.store_name || "";
  document.getElementById("set-whatsapp").value = storeSettings.whatsapp_number || "";
  document.getElementById("set-currency").value = storeSettings.currency_symbol || "";
  document.getElementById("set-password").value = storeSettings.admin_password || "";
}

async function saveAdminSettings(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-settings");
  btn.disabled = true;
  btn.innerHTML = "Saving...";

  const newSettings = {
    store_name: document.getElementById("set-store-name").value.trim(),
    whatsapp_number: document.getElementById("set-whatsapp").value.trim(),
    currency_symbol: document.getElementById("set-currency").value.trim(),
    admin_password: document.getElementById("set-password").value.trim()
  };

  if (!GAS_URL) {
    storeSettings = { ...storeSettings, ...newSettings };
    alert("Offline mode: Settings saved locally.");
    btn.disabled = false;
    btn.innerHTML = "Save Settings";
    return;
  }

  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "updateSettings", settings: newSettings })
    });
    const result = await res.json();
    if (result.success) {
      storeSettings = { ...storeSettings, ...newSettings };
      alert("Settings updated successfully!");
    } else {
      alert("Failed to save settings: " + result.error);
    }
  } catch (error) {
    alert("Connection error: Could not save settings.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Save Settings";
  }
}

// ── DASHBOARD ────────────────────────────────────────────────────
async function loadDashboard() {
  if (!GAS_URL) {
    document.getElementById("stat-products").textContent = "5";
    document.getElementById("stat-orders").textContent = "0";
    document.getElementById("stat-revenue").textContent = "₹0";
    return;
  }

  try {
    const res = await fetch(`${GAS_URL}?action=getDashboardStats`);
    const json = await res.json();
    if (json.success && json.stats) {
      const sym = storeSettings.currency_symbol || "₹";
      document.getElementById("stat-products").textContent = json.stats.totalProducts;
      document.getElementById("stat-orders").textContent = json.stats.totalOrders;
      document.getElementById("stat-revenue").textContent = `${sym}${json.stats.totalRevenue.toLocaleString("en-IN")}`;
    }
  } catch (err) {
    console.warn("Could not load dashboard stats:", err);
  }
}

// ── PRODUCTS ─────────────────────────────────────────────────────
async function loadProducts() {
  if (!GAS_URL) {
    productsList = [
      { id:"SAR-1001", name:"Vintage Kanchipuram", description:"Authentic pure handloom silk saree.", price:24500, category:"Kanchipuram", image_url:"https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80", tagline:"Heritage Maroon", discount_price:22500, gallery_images:"[]", sizes:"Free Size", badge:"Limited Edition", stock:"In Stock", fabric_care:"Dry Clean", blouse_info:"Included" }
    ];
    renderAdminProducts();
    return;
  }

  try {
    const res = await fetch(`${GAS_URL}?action=getCatalog`);
    const json = await res.json();
    if (json.success && json.catalog) {
      productsList = json.catalog;
      renderAdminProducts();
    }
  } catch (err) {
    console.warn("Error fetching products:", err);
  }
}

function renderAdminProducts() {
  const list = document.getElementById("admin-products-list");
  const query = document.getElementById("product-search").value.toLowerCase();
  const sym = storeSettings.currency_symbol || "₹";

  const filtered = productsList.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.id.toLowerCase().includes(query) ||
    p.category.toLowerCase().includes(query)
  );

  list.innerHTML = filtered.map(p => {
    let stockClass = "in-stock";
    if (p.stock === "Low Stock") stockClass = "low-stock";
    if (p.stock === "Out of Stock") stockClass = "out-of-stock";

    return `
      <tr>
        <td><img src="${p.image_url}" class="tbl-thumb" alt=""></td>
        <td><code>${p.id}</code></td>
        <td>
          <div style="font-weight:600; color:#fff;">${p.name}</div>
          <div style="font-size:11px; color:#94a3b8;">${p.tagline || ""}</div>
        </td>
        <td>${p.category}</td>
        <td>${sym}${Number(p.price).toLocaleString("en-IN")}</td>
        <td><span class="stock-badge ${stockClass}">${p.stock || "In Stock"}</span></td>
        <td class="actions-col">
          <button class="btn-sm-action" onclick="openEditProductModal('${p.id}')" aria-label="Edit"><i data-lucide="edit-3"></i></button>
          <button class="btn-sm-action delete-action" onclick="deleteProduct('${p.id}')" aria-label="Delete"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>
    `;
  }).join("");

  lucide.createIcons();
}

// ── ORDERS ───────────────────────────────────────────────────────
async function loadOrders() {
  if (!GAS_URL) {
    document.getElementById("admin-orders-list").innerHTML = `<tr><td colspan="6" style="text-align:center;">No orders in offline mode.</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`${GAS_URL}?action=getOrders`);
    const json = await res.json();
    if (json.success && json.orders) {
      ordersList = json.orders;
      renderAdminOrders();
    }
  } catch (err) {
    console.warn(err);
  }
}

function renderAdminOrders() {
  const list = document.getElementById("admin-orders-list");
  const sym = storeSettings.currency_symbol || "₹";

  list.innerHTML = ordersList.map(o => {
    const dateStr = o.timestamp ? new Date(o.timestamp).toLocaleString("en-IN") : "-";
    return `
      <tr>
        <td><code>${o.order_id}</code></td>
        <td style="font-weight:600; color:#fff;">${o.customer_name}</td>
        <td>${o.phone}</td>
        <td style="font-size:12px; max-width:300px;">${o.items}</td>
        <td style="font-weight:600; color:#fff;">${sym}${Number(o.subtotal).toLocaleString("en-IN")}</td>
        <td style="font-size:12px; color:#94a3b8;">${dateStr}</td>
      </tr>
    `;
  }).join("");
}

// ── PRODUCT EDIT/ADD MODAL ───────────────────────────────────────
function openAddProductModal() {
  document.getElementById("modal-product-title").textContent = "Add New Saree";
  document.getElementById("edit-product-id").value = "";
  document.getElementById("product-form").reset();
  
  // Set default values
  document.getElementById("prod-sizes").value = "Free Size";
  document.getElementById("prod-care").value = "Dry Clean Only";
  document.getElementById("prod-blouse").value = "Blouse piece included";
  
  document.getElementById("product-modal").classList.add("show");
}

function openEditProductModal(id) {
  const p = productsList.find(item => item.id === id);
  if (!p) return;

  document.getElementById("modal-product-title").textContent = `Edit Saree ${id}`;
  document.getElementById("edit-product-id").value = p.id;
  
  document.getElementById("prod-name").value = p.name || "";
  document.getElementById("prod-category").value = p.category || "Kanchipuram";
  document.getElementById("prod-tagline").value = p.tagline || "";
  document.getElementById("prod-price").value = p.price || 0;
  document.getElementById("prod-discount").value = p.discount_price || "";
  document.getElementById("prod-cover").value = p.image_url || "";
  
  // Format gallery images
  let galleryUrls = "";
  try {
    const arr = JSON.parse(p.gallery_images);
    if (Array.isArray(arr)) {
      galleryUrls = arr.join("\n");
    }
  } catch(e) {
    if (typeof p.gallery_images === 'string') {
      galleryUrls = p.gallery_images;
    }
  }
  document.getElementById("prod-gallery").value = galleryUrls;
  
  document.getElementById("prod-badge").value = p.badge || "";
  document.getElementById("prod-stock").value = p.stock || "In Stock";
  document.getElementById("prod-sizes").value = p.sizes || "Free Size";
  document.getElementById("prod-blouse").value = p.blouse || p.blouse_info || "Blouse piece included";
  document.getElementById("prod-desc").value = p.description || "";
  document.getElementById("prod-care").value = p.fabric_care || "Dry Clean Only";

  document.getElementById("product-modal").classList.add("show");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("show");
}

async function saveProduct(event) {
  event.preventDefault();
  const saveBtn = document.getElementById("btn-save-product");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const id = document.getElementById("edit-product-id").value;
  const isEdit = !!id;

  // Format gallery urls back to JSON list
  const rawGallery = document.getElementById("prod-gallery").value;
  const galleryList = rawGallery.split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("http"));

  const productData = {
    name: document.getElementById("prod-name").value.trim(),
    category: document.getElementById("prod-category").value,
    tagline: document.getElementById("prod-tagline").value.trim(),
    price: Number(document.getElementById("prod-price").value),
    discount_price: document.getElementById("prod-discount").value ? Number(document.getElementById("prod-discount").value) : "",
    image_url: document.getElementById("prod-cover").value.trim(),
    gallery_images: JSON.stringify(galleryList),
    badge: document.getElementById("prod-badge").value.trim(),
    stock: document.getElementById("prod-stock").value,
    sizes: document.getElementById("prod-sizes").value.trim(),
    blouse_info: document.getElementById("prod-blouse").value.trim(),
    description: document.getElementById("prod-desc").value.trim(),
    fabric_care: document.getElementById("prod-care").value.trim()
  };

  if (!GAS_URL) {
    if (isEdit) {
      const idx = productsList.findIndex(p => p.id === id);
      if (idx !== -1) productsList[idx] = { ...productsList[idx], ...productData };
    } else {
      productData.id = "SAR-" + Math.floor(1000 + Math.random() * 9000);
      productsList.push(productData);
    }
    renderAdminProducts();
    closeProductModal();
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Product";
    return;
  }

  try {
    const action = isEdit ? "updateProduct" : "addProduct";
    const bodyPayload = isEdit ? { action, id, product: productData } : { action, product: productData };

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(bodyPayload)
    });
    const result = await res.json();

    if (result.success) {
      await loadProducts();
      closeProductModal();
    } else {
      alert("Error saving: " + result.error);
    }
  } catch (error) {
    console.error(error);
    alert("Connection failed.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Product";
  }
}

async function deleteProduct(id) {
  if (!confirm(`Are you sure you want to delete Saree ${id}?`)) return;

  if (!GAS_URL) {
    productsList = productsList.filter(p => p.id !== id);
    renderAdminProducts();
    return;
  }

  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "deleteProduct", id })
    });
    const result = await res.json();
    if (result.success) {
      await loadProducts();
    } else {
      alert("Could not delete product: " + result.error);
    }
  } catch (error) {
    alert("Failed to connect to delete.");
  }
}
