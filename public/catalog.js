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
    .sm-product-card h3{font-size:16px;margin:13px 0 8px}
    .sm-product-description{font-size:13px;line-height:1.6;color:#aab6cc;white-space:pre-wrap;overflow-wrap:anywhere}
    .sm-product-price{font-size:20px;font-weight:800;margin-top:13px;color:#78bdff}
    .sm-page-title{font-size:clamp(27px,5vw,40px);margin:8px 0}
    .sm-page-subtitle{color:#aab6cc;margin:0 0 24px}
    .sm-back{display:inline-block;margin:0 0 18px;color:#78bdff;text-decoration:none}
    .sm-message{color:#aab6cc;padding:24px 0}
    .sm-category-meta{display:block;font-size:12px;color:#aab6cc;margin-top:7px}
    .sm-available{display:inline-block;font-size:11px;color:#80e6b1;background:#153628;padding:5px 9px;border-radius:20px;margin-top:10px}
    #sm-store-products[hidden]{display:none!important}
    @media(max-width:480px){#sm-store-products{padding:0 14px}.sm-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sm-product-card{padding:9px}.sm-product-image,.sm-product-placeholder{height:135px}.sm-product-card h3{font-size:14px}.sm-product-price{font-size:16px}}
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
  const current = categories.find(c => path === "/" + c.id);
  const home = !current;

  root.hidden = home;
  if (categorySection) categorySection.hidden = !home;

  if (!home) {
    document.querySelectorAll("main > *").forEach(el => {
      if (el !== root && !el.contains(root)) el.hidden = true;
    });
    document.querySelectorAll("main section").forEach(el => {
      if (el !== root && el !== categorySection && !el.contains(root)) el.hidden = true;
    });
    root.innerHTML = `
      <a class="sm-back" href="/">← Back to all categories</a>
      <h1 class="sm-page-title">${current.icon} ${current.name}</h1>
      <p class="sm-page-subtitle">Explore available ${current.name.toLowerCase()}.</p>
      <div class="sm-product-grid" id="sm-product-grid"></div>
      <p class="sm-message" id="sm-product-message">Loading products…</p>`;
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
      <article class="sm-product-card">
        ${p.image_url && /^https:\/\//i.test(p.image_url)
          ? `<img class="sm-product-image" src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}" loading="lazy">`
          : `<div class="sm-product-placeholder">${current.icon}</div>`}
        <h3>${escapeHTML(p.name)}</h3>
        ${p.description ? `<div class="sm-product-description">${escapeHTML(p.description)}</div>` : ""}
        <div class="sm-product-price">${money(p.price)}</div>
        <span class="sm-available">Available</span>
      </article>
    `).join("");
    message.textContent = `${items.length} product${items.length === 1 ? "" : "s"} available`;
  } catch (error) {
    console.error("SHIT MART catalog:", error);
    const message = document.getElementById("sm-product-message");
    if (message) message.textContent = "Couldn't load products. Please refresh and try again.";
  }
})();
