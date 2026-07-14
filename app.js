// ═══════════════════════════════════════════════════════════════════
//  SWARNA SILK — Frontend Application (Shopify Dawn Theme)
//  GitHub Pages (static) → Google Apps Script (database + settings)
// ═══════════════════════════════════════════════════════════════════

const GAS_URL = window.SWARNA_CONFIG?.GAS_URL || "";

// ── STATE ────────────────────────────────────────────────────────
let catalog        = [];
let cart           = JSON.parse(localStorage.getItem("ss_cart") || "[]");
let selectedFabric = "all";
let storeSettings  = {
  whatsapp_number: window.SWARNA_CONFIG?.FALLBACK_WHATSAPP || "919876543210",
  store_name:      "Swarna Silk",
  currency_symbol: "₹"
};

// ── MOCK CATALOG (fallback when GAS_URL is not set) ──────────────
const MOCK_CATALOG = [
  {
    id: "SAR-1001", name: "Vintage Kanchipuram",
    description: "Authentic pure handloom silk saree with heavy gold zari border.",
    price: 24500, category: "Kanchipuram",
    image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    tagline: "Deep Maroon Heritage Silk", discount_price: 22500,
    gallery_images: "[]", sizes: "Free Size", badge: "Limited Edition", stock: "In Stock"
  },
  {
    id: "SAR-1002", name: "Banarasi Flora",
    description: "Classic pure silk Banarasi with intricate silver floral thread work.",
    price: 18200, category: "Banarasi",
    image_url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
    tagline: "Ivory Floral Silver Zari", discount_price: 18200,
    gallery_images: "[]", sizes: "Free Size", badge: "New Arrival", stock: "In Stock"
  },
  {
    id: "SAR-1003", name: "Sage Organza",
    description: "Luminous hand-painted translucent organza with pastel accents.",
    price: 12800, category: "Organza",
    image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    tagline: "Luminous Translucent Pastel", discount_price: 12800,
    gallery_images: "[]", sizes: "Free Size", badge: "Best Seller", stock: "In Stock"
  },
  {
    id: "SAR-1004", name: "Ruby Georgette",
    description: "Soft georgette decorated with handworked glass beads & sequences.",
    price: 15500, category: "Georgette",
    image_url: "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?auto=format&fit=crop&w=600&q=80",
    tagline: "Glittering Party Wear", discount_price: 14500,
    gallery_images: "[]", sizes: "Free Size", badge: "", stock: "In Stock"
  },
  {
    id: "SAR-1005", name: "Royal Paithani",
    description: "Traditional Maharashtrian silk saree featuring peacock design pallu.",
    price: 29000, category: "Silk",
    image_url: "https://images.unsplash.com/photo-1610030470298-317f2249c5eb?auto=format&fit=crop&w=600&q=80",
    tagline: "Traditional Peacock Border", discount_price: 29000,
    gallery_images: "[]", sizes: "Free Size", badge: "", stock: "In Stock"
  }
];

// ── INIT ─────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();
  updateCartUI();

  // Fetch settings + catalog in parallel for speed
  await Promise.all([fetchSettings(), fetchCatalog()]);
  
  if (storeSettings.store_name) {
    document.querySelectorAll(".brand-logo, .drawer-brand-logo").forEach(el => {
      el.textContent = storeSettings.store_name;
    });
    document.title = storeSettings.store_name + " — Premium Saree Collection";
  }
});

// ── SETTINGS (fetched from Google Sheet via GAS) ─────────────────
async function fetchSettings() {
  if (!GAS_URL) return; // use defaults
  try {
    const res  = await fetch(`${GAS_URL}?action=getSettings`);
    const json = await res.json();
    if (json.success && json.settings) {
      storeSettings = { ...storeSettings, ...json.settings };
    }
  } catch (err) {
    console.warn("Could not load settings from GAS:", err);
  }
}

// ── CATALOG ──────────────────────────────────────────────────────
async function fetchCatalog() {
  showCatalogLoading(true);

  if (GAS_URL) {
    try {
      const res  = await fetch(`${GAS_URL}?action=getCatalog`);
      const json = await res.json();
      if (json.success && json.catalog && json.catalog.length > 0) {
        catalog = json.catalog;
        showCatalogLoading(false);
        renderCatalog();
        return;
      }
    } catch (err) {
      console.warn("GAS catalog fetch failed, using mock data:", err);
    }
  }

  // Fallback to offline mock data
  catalog = MOCK_CATALOG;
  showCatalogLoading(false);
  renderCatalog();
}

function showCatalogLoading(show) {
  const loading = document.getElementById("catalog-loading");
  const grid    = document.getElementById("catalog-grid");
  if (loading) loading.style.display = show ? "flex" : "none";
  if (grid)    grid.style.display    = show ? "none" : "grid";
}

function renderCatalog() {
  const grid  = document.getElementById("catalog-grid");
  const query = (document.getElementById("catalog-search")?.value || "").toLowerCase();
  const sym   = storeSettings.currency_symbol || "₹";

  const filtered = catalog.filter(item => {
    const matchSearch  = !query ||
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    const matchFabric  = selectedFabric === "all" ||
      item.category.toLowerCase() === selectedFabric.toLowerCase();
    return matchSearch && matchFabric;
  });

  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-results" style="grid-column: 1/-1; text-align:center; padding:40px; color:#565656;">No sarees match your search.</p>`;
    return;
  }

  const inCart = id => cart.some(c => c.id === id);

  grid.innerHTML = filtered.map(item => {
    const added = inCart(item.id);
    const priceNum = Number(item.price);
    const discNum = item.discount_price ? Number(item.discount_price) : null;
    const hasDiscount = discNum && discNum < priceNum;
    
    // Size list parsing
    const sizeBadges = (item.sizes || "Free Size").split(",")
      .map(s => `<span class="size-chip">${s.trim()}</span>`).join("");
      
    // Badges layout
    const badgeHTML = item.badge ? `<span class="badge-chip">${item.badge}</span>` : "";
    const outOfStock = item.stock === "Out of Stock";

    return `
      <div class="product-card ${outOfStock ? "oos-card" : ""}">
        <div class="product-img-wrapper" onclick="openProductDetailModal('${item.id}')">
          <img src="${item.image_url}" alt="${item.name}" loading="lazy">
          <span class="category-badge">${item.category}</span>
          ${badgeHTML}
          ${outOfStock ? `<div class="oos-overlay">SOLD OUT</div>` : ""}
        </div>
        <div class="product-info">
          <h4 class="product-title" onclick="openProductDetailModal('${item.id}')">${item.name}</h4>
          <p class="product-tagline">${item.tagline || ""}</p>
          
          <div class="size-row">
            ${sizeBadges}
          </div>

          <div class="product-price-row">
            <div class="price-box">
              ${hasDiscount ? `
                <span class="price-discounted">${sym}${discNum.toLocaleString("en-IN")}</span>
                <span class="price-original">${sym}${priceNum.toLocaleString("en-IN")}</span>
              ` : `
                <span class="price">${sym}${priceNum.toLocaleString("en-IN")}</span>
              `}
            </div>
            ${outOfStock ? `
              <button class="btn-add-cart disabled" disabled><i data-lucide="slash"></i></button>
            ` : `
              <button class="btn-add-cart ${added ? "added" : ""}"
                      onclick="toggleCartItem('${item.id}')"
                      aria-label="${added ? "Remove from bag" : "Add to bag"}">
                <i data-lucide="${added ? "check" : "plus"}"></i>
              </button>
            `}
          </div>
        </div>
      </div>`;
  }).join("");

  lucide.createIcons();
}

// ── DETAIL DIALOG POPUP (Supports Gallery & Details) ─────────────
function openProductDetailModal(id) {
  const item = catalog.find(p => p.id === id);
  if (!item) return;

  let modal = document.getElementById("details-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "details-modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  const sym = storeSettings.currency_symbol || "₹";
  const priceNum = Number(item.price);
  const discNum = item.discount_price ? Number(item.discount_price) : null;
  const hasDiscount = discNum && discNum < priceNum;

  // Gallery array
  let gallery = [];
  try {
    if (item.gallery_images) {
      gallery = JSON.parse(item.gallery_images);
    }
  } catch(e) {
    if (typeof item.gallery_images === 'string' && item.gallery_images.trim() !== '') {
      gallery = item.gallery_images.split(",").map(s => s.trim());
    }
  }
  
  if (!gallery.includes(item.image_url)) {
    gallery.unshift(item.image_url);
  }
  
  gallery = gallery.filter(url => url.startsWith("http"));

  const sizeChips = (item.sizes || "Free Size").split(",")
    .map(s => `<span class="size-chip large">${s.trim()}</span>`).join("");

  const added = cart.some(c => c.id === item.id);
  const outOfStock = item.stock === "Out of Stock";

  modal.innerHTML = `
    <div class="modal-card detail-modal-card">
      <div class="modal-card-header">
        <h3>Product Details</h3>
        <button class="btn-clear" onclick="closeDetailModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body detail-modal-body">
        <div class="detail-grid">
          
          <!-- Image Gallery -->
          <div class="detail-gallery-box">
            <div class="main-gallery-img">
              <img id="detail-main-img" src="${item.image_url}" alt="">
            </div>
            <div class="gallery-thumbs">
              ${gallery.map((url, i) => `
                <img class="gal-thumb-btn ${i===0?'active':''}" src="${url}" onclick="setDetailMainImage(this, '${url}')" alt="">
              `).join("")}
            </div>
          </div>

          <!-- Product Details Form/Info -->
          <div class="detail-info-box">
            ${item.badge ? `<span class="badge-chip-large">${item.badge}</span>` : ""}
            <h2>${item.name}</h2>
            <p class="tagline-large">${item.tagline || ""}</p>
            
            <div class="price-box large mt-8">
              ${hasDiscount ? `
                <span class="price-discounted large">${sym}${discNum.toLocaleString("en-IN")}</span>
                <span class="price-original large">${sym}${priceNum.toLocaleString("en-IN")}</span>
              ` : `
                <span class="price large">${sym}${priceNum.toLocaleString("en-IN")}</span>
              `}
            </div>

            <div class="detail-meta-list mt-16">
              <div><strong>Category:</strong> ${item.category}</div>
              <div><strong>Blouse Details:</strong> ${item.blouse_info || "Included"}</div>
              <div><strong>Fabric Care:</strong> ${item.fabric_care || "Dry Clean Only"}</div>
              <div><strong>Status:</strong> <span class="stock-status-text ${item.stock === 'In Stock' ? 'ok' : 'warn'}">${item.stock || 'In Stock'}</span></div>
            </div>

            <div class="sizes-section mt-16">
              <h5 class="section-title">Available Sizes</h5>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
                ${sizeChips}
              </div>
            </div>

            <div class="description-section mt-16">
              <h5 class="section-title">Description</h5>
              <p class="desc-text">${item.description}</p>
            </div>

            <div class="action-section mt-24">
              ${outOfStock ? `
                <button class="btn btn-lg w-100 disabled" disabled>Sold Out</button>
              ` : `
                <button class="btn btn-lg btn-primary-black w-100" onclick="toggleDetailCartItem('${item.id}')" id="detail-cart-btn">
                  ${added ? 'Remove from Cart' : 'Add to Cart'}
                </button>
              `}
            </div>

          </div>

        </div>
      </div>
    </div>
  `;

  modal.classList.add("show");
  lucide.createIcons();
}

function setDetailMainImage(el, url) {
  document.querySelectorAll(".gal-thumb-btn").forEach(img => img.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("detail-main-img").src = url;
}

function closeDetailModal() {
  document.getElementById("details-modal")?.classList.remove("show");
}

function toggleDetailCartItem(id) {
  toggleCartItem(id);
  const btn = document.getElementById("detail-cart-btn");
  const added = cart.some(c => c.id === id);
  if (btn) {
    btn.textContent = added ? 'Remove from Cart' : 'Add to Cart';
  }
}

// ── CATALOG FILTERS ──────────────────────────────────────────────
function filterByFabric(fabric, pillEl) {
  selectedFabric = fabric;
  document.querySelectorAll("#fabric-pills .pill-btn").forEach(p => p.classList.remove("active"));
  if (pillEl) pillEl.classList.add("active");
  
  // Sync desktop nav highlights
  document.querySelectorAll(".desktop-navigation .nav-link").forEach(link => {
    link.classList.remove("active");
  });
  renderCatalog();
}

function selectFabricCategory(fabric) {
  selectedFabric = fabric;
  
  // Sync pill highlights
  document.querySelectorAll("#fabric-pills .pill-btn").forEach(p => {
    const text = p.textContent.trim().toLowerCase();
    const cleanFabric = fabric.toLowerCase();
    p.classList.toggle("active", (cleanFabric === "all" && text === "all sarees") || text === cleanFabric);
  });

  // Sync desktop navigation links
  document.querySelectorAll(".desktop-navigation .nav-link").forEach(link => {
    const target = link.textContent.trim();
    link.classList.toggle("active", (fabric === "all" && target === "Home") || (fabric === "Silk" && target === "Silk Weaves") || target.toLowerCase() === fabric.toLowerCase());
  });

  scrollToCatalog();
  renderCatalog();
}

function scrollToCatalog() {
  const anchor = document.getElementById("shop-catalog-anchor");
  if (anchor) {
    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ── HEADER STATE TOGGLES ─────────────────────────────────────────
function toggleSearchBox() {
  document.getElementById("header-search-bar").classList.toggle("open");
}

function toggleMenu() {
  document.getElementById("side-drawer").classList.toggle("open");
  document.getElementById("drawer-overlay").classList.toggle("show");
}

function toggleCartDrawer() {
  document.getElementById("cart-drawer").classList.toggle("open");
  document.getElementById("cart-overlay").classList.toggle("show");
  updateCartUI();
}

// ── CART ─────────────────────────────────────────────────────────
function toggleCartItem(id) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) {
    const item = catalog.find(c => c.id === id);
    if (item) {
      const price = item.discount_price ? Number(item.discount_price) : Number(item.price);
      cart.push({ ...item, actualPrice: price, quantity: 1 });
    }
  } else {
    cart.splice(idx, 1);
  }
  saveCart();
  renderCatalog();
}

function updateQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
    saveCart();
  }
}

function removeCartItem(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  renderCatalog();
}

function saveCart() {
  localStorage.setItem("ss_cart", JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const badge       = document.getElementById("cart-badge");
  const emptyState  = document.getElementById("bag-empty");
  const filledState = document.getElementById("bag-filled");
  const itemsList   = document.getElementById("bag-items-list");
  const sym         = storeSettings.currency_symbol || "₹";

  const totalItems = cart.reduce((a, c) => a + c.quantity, 0);

  if (badge) {
    badge.textContent    = totalItems;
    badge.style.display  = totalItems > 0 ? "flex" : "none";
  }

  if (!emptyState || !filledState) return;

  if (totalItems === 0) {
    emptyState.style.display  = "flex";
    filledState.style.display = "none";
    return;
  }

  emptyState.style.display  = "none";
  filledState.style.display = "flex";

  let subtotal = 0;
  if (itemsList) {
    itemsList.innerHTML = cart.map(item => {
      const price = item.actualPrice || (item.discount_price ? Number(item.discount_price) : Number(item.price));
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      return `
        <div class="bag-item-card">
          <img class="bag-item-img" src="${item.image_url}" alt="${item.name}">
          <div class="bag-item-info">
            <div>
              <h4 class="bag-item-title">${item.name}</h4>
              <p class="bag-item-desc">${item.category} · ${item.tagline || ""}</p>
            </div>
            <div class="bag-item-bottom">
              <div class="qty-controls">
                <button class="qty-btn" onclick="updateQty('${item.id}', -1)">−</button>
                <span class="qty-num">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
              </div>
              <span class="bag-item-price">${sym}${lineTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <button class="btn-remove-item" onclick="removeCartItem('${item.id}')" aria-label="Remove">
            <i data-lucide="trash-2"></i>
          </button>
        </div>`;
    }).join("");
    lucide.createIcons();
  }

  const fmt = n => `${sym}${n.toLocaleString("en-IN")}`;
  const sub = document.getElementById("summary-subtotal");
  if (sub) sub.textContent = fmt(subtotal);
}

// ── CHECKOUT ─────────────────────────────────────────────────────
function triggerCheckoutFlow() {
  document.getElementById("customer-name").value  = localStorage.getItem("ss_cust_name")  || "";
  document.getElementById("customer-phone").value = localStorage.getItem("ss_cust_phone") || "";
  document.getElementById("checkout-modal").classList.add("show");
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal").classList.remove("show");
}

async function submitOrder(event) {
  event.preventDefault();

  const customerName = document.getElementById("customer-name").value.trim();
  const phone        = document.getElementById("customer-phone").value.trim();
  const sym          = storeSettings.currency_symbol || "₹";
  
  let subtotal = 0;
  const orderItems = cart.map(i => {
    const price = i.actualPrice || (i.discount_price ? Number(i.discount_price) : Number(i.price));
    subtotal += price * i.quantity;
    return { id: i.id, name: i.name, price: price, quantity: i.quantity };
  });

  localStorage.setItem("ss_cust_name",  customerName);
  localStorage.setItem("ss_cust_phone", phone);

  closeCheckoutModal();
  toggleCartDrawer();

  const orderPayload = {
    customerName,
    phone,
    subtotal,
    items: orderItems
  };

  let orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

  if (GAS_URL) {
    fetch(GAS_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify({ action: "createOrder", order: orderPayload })
    })
    .then(r => r.json())
    .then(res => { if (res.success && res.orderId) orderId = res.orderId; })
    .catch(err => console.warn("Order write failed:", err));
  }

  openWhatsApp(orderId, orderPayload, sym);

  cart = [];
  saveCart();
  renderCatalog();
}

function openWhatsApp(orderId, order, sym) {
  const lines = order.items.map((item, i) =>
    `${i + 1}. *${item.name}* (Qty: ${item.quantity}) — ${sym}${(item.price * item.quantity).toLocaleString("en-IN")}`
  ).join("\n");

  const msg =
    `✨ *Swarna Silk — New Order* ✨\n\n` +
    `📋 *Order ID:* ${orderId}\n` +
    `👤 *Name:* ${order.customerName}\n` +
    `📞 *Phone:* ${order.phone}\n\n` +
    `🛍️ *Items:*\n${lines}\n\n` +
    `💰 *Total:* ${sym}${order.subtotal.toLocaleString("en-IN")}\n\n` +
    `Please confirm this order. Thank you! 🙏`;

  const waNumber = storeSettings.whatsapp_number || "919876543210";
  window.open(`https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(msg)}`, "_blank");
}
