(async function () {
  const categories = [
    { id: "subscriptions", name: "Subscriptions", icon: "📺" },
    { id: "topups", name: "Game Top-ups", icon: "🎮" },
    { id: "giftcards", name: "Gift Cards", icon: "🎁" },
    { id: "software", name: "Software", icon: "💻" },
    { id: "accounts", name: "Gaming Accounts", icon: "👾" },
    { id: "other", name: "Other Products", icon: "✦" }
  ];

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const money = value => "Rs. " + Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });

  const style = document.createElement("style");
  style.textContent = `
    #sm-store-products{max-width:1200px;margin:30px auto;padding:0 20px;color:inherit}
    .sm-product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:18px}
    .sm-product-card{border:1px solid var(--line,#29364b);border-radius:16px;padding:14px;background:linear-gradient(145deg,#121b2a,#0c111b);color:#f4f7ff;overflow:hidden;transition:transform .2s,border-color .2s}
    .sm-product-card:hover{transform:translateY(-3px);border-color:#428bff}
    .sm-product-image{width:100%;height:190px;object-fit:contain;border-radius:11px;background:#0a101a}
    .sm-product-placeholder{height:190px;display:grid;place-items:center;border-radius:11px;background:#0a101a;font-size:48px}
    .sm-product-card h3{font-size:14px;margin:11px 0 7px}
    .sm-product-description{font-size:12px;line-height:1.5;color:#aab6cc;white-space:pre-wrap;overflow-wrap:anywhere}
    .sm-product-price{font-size:17px;font-weight:800;margin-top:11px;color:#78bdff}
    .sm-page-title{font-size:clamp(23px,4vw,32px);margin:8px 0}
    .sm-page-subtitle{color:#aab6cc;margin:0 0 24px}
    .sm-back{display:inline-block;margin:0 0 18px;color:#78bdff;text-decoration:none}
    .sm-message{color:#aab6cc;padding:24px 0}
    .sm-category-meta{display:block;font-size:12px;color:#aab6cc;margin-top:7px}
    .sm-available{display:inline-block;font-size:11px;color:#80e6b1;background:#153628;padding:5px 9px;border-radius:20px;margin-top:10px}
    #sm-store-products[hidden]{display:none!important}
    @media(max-width:480px){#sm-store-products{padding:0 14px}.sm-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sm-product-card{padding:9px}.sm-product-image,.sm-product-placeholder{height:135px}.sm-product-card h3{font-size:14px}.sm-product-price{font-size:15px}}
  `;
  document.head.appendChild(style);

  const root = document.getElementById("sm-store-products") || document.createElement("section");
  root.id = "sm-store-products";
  const categorySection = document.getElementById("categories");
  if (!root.isConnected) {
    if (categorySection) categorySection.insertAdjacentElement("afterend", root);
    else document.querySelector("main")?.appendChild(root);
  }

  const path = location.pathname.replace(/\/+$/, "").toLowerCase();
  const routeParts = path.split("/").filter(Boolean);
  const current = categories.find(c => path === "/" + c.id);
  const productRoute = !current && routeParts.length === 2 &&
    categories.some(c => c.id === routeParts[0])
    ? { categoryId: routeParts[0], slug: routeParts[1] } : null;
  const home = !current && !productRoute;
  const slugify = value => String(value ?? "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  const productURL = product => "/" +
    (categories.some(c => c.id === String(product.category || "other").toLowerCase())
      ? String(product.category || "other").toLowerCase() : "other") +
    "/" + slugify(product.name);

  root.hidden = home;
  if (categorySection) categorySection.hidden = !home;

  if (!home) {
    document.querySelectorAll("main > *").forEach(el => {
      if (el !== root && !el.contains(root)) el.hidden = true;
    });
    document.querySelectorAll("main section").forEach(el => {
      if (el !== root && el !== categorySection && !el.contains(root)) el.hidden = true;
    });
    if (current) {
      root.innerHTML = `
        <a class="sm-back" href="/">← Back to all categories</a>
        <h1 class="sm-page-title">${current.icon} ${current.name}</h1>
        <p class="sm-page-subtitle">Explore available ${current.name.toLowerCase()}.</p>
        <div class="sm-product-grid" id="sm-product-grid"></div>
        <p class="sm-message" id="sm-product-message">Loading products…</p>`;
    } else {
      root.innerHTML = `
        <a class="sm-back" href="/${escapeHTML(productRoute.categoryId)}">← Back to products</a>
        <div id="sm-product-detail-content" class="sm-product-detail-content">
          <p class="sm-message">Loading product details…</p>
        </div>`;
    }
  }

  // Route category cards and category navigation without changing the homepage layout.
  document.addEventListener("click", event => {
    const card = event.target.closest(".category");
    const nav = event.target.closest("[data-filter]");
    const name = card?.dataset.name || nav?.dataset.filter;
    if (!name) return;
    const category = categories.find(c =>
      c.name.toLowerCase() === name.trim().toLowerCase() ||
      c.id === name.trim().toLowerCase()
    );
    if (!category) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = "/" + category.id;
  }, true);

  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) throw new Error("Products API returned " + response.status);
    const data = await response.json();
    const products = Array.isArray(data) ? data :
      Array.isArray(data.products) ? data.products :
      Array.isArray(data.results) ? data.results : [];


  style.textContent += `
    .sm-product-detail-content{max-width:1000px;margin:24px auto 50px}
    .sm-detail-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:30px;align-items:start}
    .sm-detail-image-wrap{background:#0a101a;border:1px solid #29364b;border-radius:18px;min-height:280px;display:grid;place-items:center;overflow:hidden}
    .sm-detail-image{width:100%;max-height:430px;object-fit:contain}
    .sm-detail-placeholder{font-size:90px;padding:60px 0}
    .sm-detail-info h1{font-size:clamp(24px,4vw,34px);margin:4px 0 14px;overflow-wrap:anywhere}
    .sm-detail-price{font-size:27px;font-weight:800;color:#78bdff;margin:16px 0}
    .sm-detail-description{color:#c1cce0;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:22px 0}
    .sm-detail-label{display:block;font-size:13px;color:#aab6cc;margin:18px 0 8px}
    .sm-detail-quantity{width:110px;padding:11px;border-radius:9px;border:1px solid #35445c;background:#0c111b;color:white;font:inherit}
    .sm-detail-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
    .sm-detail-actions button{flex:1;min-width:130px;padding:13px 12px;border:0;border-radius:10px;font:inherit;font-weight:700}
    .sm-detail-actions button:disabled{opacity:.48;cursor:not-allowed}
    .sm-detail-buy{background:#478bff;color:white}.sm-detail-cart{background:#26364d;color:white}
    @media(max-width:650px){.sm-product-detail-content{margin:18px 0 35px}.sm-detail-layout{grid-template-columns:1fr;gap:20px}.sm-detail-image-wrap{min-height:200px}.sm-detail-image{max-height:300px}.sm-detail-placeholder{font-size:65px;padding:35px 0}}
  `;

    // Homepage: category cards only, enriched with product counts and price ranges.
    categories.forEach(category => {
      const items = products.filter(p =>
        String(p.category || "other").toLowerCase() === category.id
      );
      document.querySelectorAll(".category").forEach(card => {
        if ((card.dataset.name || "").toLowerCase() !== category.name.toLowerCase()) return;
        let meta = card.querySelector(".sm-category-meta");
        if (!meta) {
          meta = document.createElement("span");
          meta.className = "sm-category-meta";
          card.appendChild(meta);
        }
        if (!items.length) {
          meta.textContent = "0 products";
        } else {
          const prices = items.map(p => Number(p.price) || 0);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          meta.textContent = `${items.length} product${items.length === 1 ? "" : "s"} · ${min === max ? money(min) : money(min) + " – " + money(max)}`;
        }
      });
    });

    // Category pages: show ONLY the selected category's products.
    if (productRoute) {
      const product = products.find(p =>
        String(p.category || "other").toLowerCase() === productRoute.categoryId &&
        slugify(p.name) === productRoute.slug
      );
      const detail = document.getElementById("sm-product-detail-content");
      if (!product) {
        detail.innerHTML = `<h1 class="sm-page-title">Product not found</h1>
          <p class="sm-message">This product may be unavailable or the link may be incorrect.</p>
          <a class="sm-back" href="/${escapeHTML(productRoute.categoryId)}">← Back to products</a>`;
        return;
      }
      document.title = product.name + " | SHIT MART";
      const category = categories.find(c => c.id === productRoute.categoryId);
      const image = product.image_url && /^https:\/\//i.test(product.image_url)
        ? `<img class="sm-detail-image" src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}">`
        : `<div class="sm-detail-placeholder">${category?.icon || "✦"}</div>`;
      detail.innerHTML = `
        <div class="sm-detail-layout">
          <div class="sm-detail-image-wrap">${image}</div>
          <div class="sm-detail-info">
            <span class="sm-available">Available</span>
            <h1>${escapeHTML(product.name)}</h1>
            <div class="sm-detail-price">${money(product.price)}</div>
            <label class="sm-detail-label" for="sm-detail-quantity">Quantity</label>
            <select class="sm-detail-quantity" id="sm-detail-quantity" aria-label="Select quantity">
              ${Array.from({length:10},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}
            </select>
            <div class="sm-detail-actions">
              <button class="sm-detail-buy" type="button" disabled aria-disabled="true">Buy Now</button>
              <button class="sm-detail-cart" type="button" disabled aria-disabled="true">Add to Cart</button>
            </div>
            <h2 style="font-size:18px;margin-top:28px">Description</h2>
            <div class="sm-detail-description">${product.description ? escapeHTML(product.description) : "No description provided yet."}</div>
          </div>
        </div>`;
      return;
    }
    if (!current) return;
    const items = products.filter(p =>
      String(p.category || "other").toLowerCase() === current.id
    );
    const grid = document.getElementById("sm-product-grid");
    const message = document.getElementById("sm-product-message");

    if (!items.length) {
      message.textContent = "No products available in this category yet. Check back soon!";
      return;
    }

    grid.innerHTML = items.map(p => `
      <article class="sm-product-card" data-product-id="${escapeHTML(p.id)}" role="button" tabindex="0" aria-label="View details for ${escapeHTML(p.name)}">
        ${p.image_url && /^https:\/\//i.test(p.image_url)
          ? `<img class="sm-product-image" src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}" loading="lazy">`
          : `<div class="sm-product-placeholder">${current.icon}</div>`}
        <h3>${escapeHTML(p.name)}</h3>
        ${p.description ? `<div class="sm-product-description">${escapeHTML(p.description)}</div>` : ""}
        <div class="sm-product-price">${money(p.price)}</div>
        <span class="sm-available">Available</span>
      </article>
    `).join("");
    
    // Product cards navigate to their shareable detail URLs.
    function handleProductCard(event) {
      const card = event.target.closest(".sm-product-card[data-product-id]");
      if (!card || !grid.contains(card)) return;
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      if (event.type === "keydown") event.preventDefault();
      const product = items.find(item => String(item.id) === card.dataset.productId);
      if (product) location.href = productURL(product);
    }
    grid.addEventListener("click", handleProductCard);
    grid.addEventListener("keydown", handleProductCard);
    message.textContent = `${items.length} product${items.length === 1 ? "" : "s"} available`;
  } catch (error) {
    console.error("SHIT MART catalog:", error);
    const message = document.getElementById("sm-product-message");
    if (message) message.textContent = "Couldn't load products. Please refresh and try again.";
  }
})();
