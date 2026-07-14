/**
 * Swarna Silk - Google Sheets Database Backend (Google Apps Script Web App)
 * Deployed as: Web App (Execute as: Me, Who has access: Anyone)
 *
 * Sheets auto-created on first run:
 *   - Settings  : key | value  (edit WhatsApp number & other config here)
 *   - Sarees    : id | name | description | price | image_url | category | tagline | discount_price | gallery_images | sizes | badge | stock | fabric_care | blouse_info | created_at
 *   - Orders    : order_id | customer_name | phone | items | subtotal | status | timestamp
 */

// ─── ENTRY POINTS ───────────────────────────────────────────────────────────

function doGet(e) {
  // CORS configuration headers
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    ensureAllSheets(); // Auto-create all sheets and headers on first access

    var action = e.parameter.action;

    if (action === "getCatalog") {
      var sarees = getCatalogData(getOrCreateSheet("Sarees"));
      return jsonResponse({ success: true, catalog: sarees });
    }

    if (action === "getSettings") {
      var settings = getSettingsData();
      return jsonResponse({ success: true, settings: settings });
    }

    if (action === "getOrders") {
      var orders = getOrdersData();
      return jsonResponse({ success: true, orders: orders });
    }

    if (action === "getDashboardStats") {
      var stats = getDashboardStatsData();
      return jsonResponse({ success: true, stats: stats });
    }

    // Health-check endpoint
    return jsonResponse({ success: true, message: "Swarna Silk API Active" });

  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    ensureAllSheets();
    // Parse incoming text/plain payload to avoid CORS preflight options check
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    if (action === "createOrder") {
      var orderId = recordOrder(postData.order);
      return jsonResponse({ success: true, orderId: orderId });
    }

    if (action === "checkAdminPass") {
      var isValid = checkAdminPass(postData.password);
      return jsonResponse({ success: true, valid: isValid });
    }

    if (action === "addProduct") {
      var newProduct = addProduct(postData.product);
      return jsonResponse({ success: true, product: newProduct });
    }

    if (action === "updateProduct") {
      var success = updateProduct(postData.id, postData.product);
      return jsonResponse({ success: success });
    }

    if (action === "deleteProduct") {
      var success = deleteProduct(postData.id);
      return jsonResponse({ success: success });
    }

    if (action === "updateSettings") {
      updateSettingsData(postData.settings);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: "Unknown action: " + action });

  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// ─── SHEET BOOTSTRAP ────────────────────────────────────────────────────────

function ensureAllSheets() {
  getOrCreateSheet("Settings");
  getOrCreateSheet("Sarees");
  getOrCreateSheet("Orders");
}

function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  return sheet;
}

function initializeSheet(sheet, sheetName) {
  if (sheetName === "Settings") {
    sheet.appendRow(["key", "value", "description"]);
    sheet.appendRow(["whatsapp_number", "919876543210", "WhatsApp Business number (country code + digits, no spaces or +)"]);
    sheet.appendRow(["store_name", "Swarna Silk", "Brand name shown in app header"]);
    sheet.appendRow(["currency_symbol", "₹", "Symbol to prefix prices (₹, $, €, …)"]);
    sheet.appendRow(["admin_password", "admin123", "Password for accessing admin dashboard"]);

    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 220);
    sheet.setColumnWidth(3, 400);
    sheet.getRange("1:1").setFontWeight("bold").setBackground("#6b0c22").setFontColor("#ffffff");

  } else if (sheetName === "Sarees") {
    sheet.appendRow([
      "id", "name", "description", "price", "image_url", "category",
      "tagline", "discount_price", "gallery_images", "sizes", "badge", "stock",
      "fabric_care", "blouse_info", "created_at"
    ]);

    var mockSarees = [
      [
        "SAR-1001", "Vintage Kanchipuram",
        "Authentic pure handloom silk saree with heavy gold zari border.",
        24500, "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
        "Kanchipuram", "Deep Maroon Heritage Silk", 22500,
        JSON.stringify([
          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80"
        ]),
        "Free Size", "Limited Edition", "In Stock", "Dry Clean Only", "Blouse piece included", new Date().toISOString()
      ],
      [
        "SAR-1002", "Banarasi Flora",
        "Classic pure silk Banarasi with intricate silver floral thread work.",
        18200, "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
        "Banarasi", "Ivory Floral Silver Zari", 18200,
        JSON.stringify([]), "Free Size", "New Arrival", "In Stock", "Dry Clean Only", "Blouse piece included", new Date().toISOString()
      ],
      [
        "SAR-1003", "Sage Organza",
        "Luminous hand-painted translucent organza with pastel accents.",
        12800, "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
        "Organza", "Luminous Translucent Pastel", 12800,
        JSON.stringify([]), "Free Size", "Best Seller", "In Stock", "Dry Clean Only", "Blouse piece included", new Date().toISOString()
      ],
      [
        "SAR-1004", "Ruby Georgette",
        "Soft georgette decorated with handworked glass beads & sequences.",
        15500, "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?auto=format&fit=crop&w=600&q=80",
        "Georgette", "Glittering Party Wear", 14500,
        JSON.stringify([]), "Free Size", "", "In Stock", "Dry Clean Only", "Blouse piece included", new Date().toISOString()
      ],
      [
        "SAR-1005", "Royal Paithani",
        "Traditional Maharashtrian silk saree featuring peacock design pallu.",
        29000, "https://images.unsplash.com/photo-1610030470298-317f2249c5eb?auto=format&fit=crop&w=600&q=80",
        "Silk", "Traditional Peacock Border", 29000,
        JSON.stringify([]), "Free Size", "", "In Stock", "Dry Clean Only", "Blouse piece included", new Date().toISOString()
      ]
    ];

    for (var i = 0; i < mockSarees.length; i++) {
      sheet.appendRow(mockSarees[i]);
    }
    sheet.getRange("1:1").setFontWeight("bold").setBackground("#6b0c22").setFontColor("#ffffff");

  } else if (sheetName === "Orders") {
    sheet.appendRow(["order_id", "customer_name", "phone", "items", "subtotal", "status", "timestamp"]);
    sheet.getRange("1:1").setFontWeight("bold").setBackground("#6b0c22").setFontColor("#ffffff");
  }
}

// ─── DATA ACCESS ────────────────────────────────────────────────────────────

function getSettingsData() {
  var sheet = getOrCreateSheet("Settings");
  var rows = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      settings[rows[i][0]] = rows[i][1];
    }
  }
  return settings;
}

function updateSettingsData(settings) {
  var sheet = getOrCreateSheet("Settings");
  var rows = sheet.getDataRange().getValues();
  for (var key in settings) {
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, settings[key], "Store setting"]);
    }
  }
}

function getCatalogData(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0];
  var catalog = [];
  for (var i = 1; i < rows.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = rows[i][j];
    }
    catalog.push(item);
  }
  return catalog;
}

function checkAdminPass(password) {
  var settings = getSettingsData();
  var actualPass = settings.admin_password || "admin123";
  return password === actualPass;
}

function getOrdersData() {
  var sheet = getOrCreateSheet("Orders");
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0];
  var orders = [];
  for (var i = 1; i < rows.length; i++) {
    var order = {};
    for (var j = 0; j < headers.length; j++) {
      order[headers[j]] = rows[i][j];
    }
    orders.push(order);
  }
  return orders.reverse(); // Newest first
}

function getDashboardStatsData() {
  var productsSheet = getOrCreateSheet("Sarees");
  var ordersSheet = getOrCreateSheet("Orders");
  
  var totalProducts = Math.max(0, productsSheet.getLastRow() - 1);
  
  var orderRows = ordersSheet.getDataRange().getValues();
  var totalOrders = Math.max(0, orderRows.length - 1);
  
  var totalRevenue = 0;
  for (var i = 1; i < orderRows.length; i++) {
    totalRevenue += Number(orderRows[i][4]) || 0; // subtotal column
  }
  
  return {
    totalProducts: totalProducts,
    totalOrders: totalOrders,
    totalRevenue: totalRevenue
  };
}

function addProduct(product) {
  var sheet = getOrCreateSheet("Sarees");
  var id = "SAR-" + Math.floor(1000 + Math.random() * 9000);
  
  var newRow = [
    id,
    product.name || "",
    product.description || "",
    Number(product.price) || 0,
    product.image_url || "",
    product.category || "",
    product.tagline || "",
    product.discount_price ? Number(product.discount_price) : "",
    product.gallery_images || "[]",
    product.sizes || "Free Size",
    product.badge || "",
    product.stock || "In Stock",
    product.fabric_care || "",
    product.blouse_info || "",
    new Date().toISOString()
  ];
  
  sheet.appendRow(newRow);
  product.id = id;
  return product;
}

function updateProduct(id, product) {
  var sheet = getOrCreateSheet("Sarees");
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      var rowNum = i + 1;
      
      // Map properties to column index based on header match
      var columnsToUpdate = {
        name: product.name,
        description: product.description,
        price: Number(product.price) || 0,
        image_url: product.image_url,
        category: product.category,
        tagline: product.tagline,
        discount_price: product.discount_price ? Number(product.discount_price) : "",
        gallery_images: product.gallery_images,
        sizes: product.sizes,
        badge: product.badge,
        stock: product.stock,
        fabric_care: product.fabric_care,
        blouse_info: product.blouse_info
      };
      
      for (var colName in columnsToUpdate) {
        var colIndex = headers.indexOf(colName);
        if (colIndex !== -1) {
          sheet.getRange(rowNum, colIndex + 1).setValue(columnsToUpdate[colName]);
        }
      }
      return true;
    }
  }
  return false;
}

function deleteProduct(id) {
  var sheet = getOrCreateSheet("Sarees");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function recordOrder(order) {
  var sheet = getOrCreateSheet("Orders");
  var orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  var itemsString = order.items.map(function(item) {
    return item.name + " (" + item.quantity + "x @ ₹" + item.price + ")";
  }).join(", ");

  sheet.appendRow([
    orderId,
    order.customerName,
    order.phone,
    itemsString,
    order.subtotal,
    "Pending Payment",
    new Date().toISOString()
  ]);

  return orderId;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
