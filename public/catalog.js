(async function () {
  const style = document.createElement("style");
  style.textContent = `
  #sm-db-catalog{max-width:1200px;margin:35px auto;padding:20px;color:inherit}
  #sm-db-catalog h2{font-size:26px;margin:25px 0 15px}
  .sm-db-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:15px}
  .sm-db-card{border:1px solid #354056;border-radius:14px;padding:13px;overflow-wrap:anywhere;background:rgba(100,120,160,.07)}
  .sm-db-card img{width:100%;height:150px;object-fit:contain;border-radius:9px}
  .sm-db-card h3{font-size:16px;margin:12px 0 7px}
  .sm-db-card p{font-size:13px;opacity:.8}
  .sm-db-price{font-size:18px;font-weight:800}
  `;
  document.head.appendChild(style);

  const root = document.createElement("section");
  root.id = "sm-db-catalog";
  root.innerHTML = "<h2>Our Products</h2><p>Loading products...</p>";
  const footer = document.querySelector("footer");
  document.body.insertBefore(root, footer || null);

  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) throw new Error("Product API returned " + response.status);
    const data = await response.json();
    const products = data.products || [];

    function card(p) {
      const el = document.createElement("article");
      el.className = "sm-db-card";
      if (p.image_url) {
        const img = document.createElement("img");
        img.src = p.image_url;
        img.alt = p.name;
        img.loading = "lazy";
        el.appendChild(img);
      }
      const title = document.createElement("h3");
      title.textContent = p.name;
      const desc = document.createElement("p");
      desc.textContent = p.description || "";
      const price = document.createElement("div");
      price.className = "sm-db-price";
      price.textContent = "NPR " + Number(p.price).toLocaleString();
      el.append(title, desc, price);
      return el;
    }

    root.replaceChildren();
    if (!products.length) {
      root.textContent = "No visible products yet. Check that your product is marked Visible in the admin panel.";
      return;
    }

    const featured = products.filter(p => Number(p.featured) === 1);
    const heading = document.createElement("h2");
    heading.textContent = "Featured Products";
    root.appendChild(heading);
    const featureGrid = document.createElement("div");
    featureGrid.className = "sm-db-grid";
    (featured.length ? featured : products).forEach(p => featureGrid.appendChild(card(p)));
    root.appendChild(featureGrid);

    const names = {
      subscriptions: "Subscriptions",
      topups: "Game Top-ups",
      giftcards: "Gift Cards",
      software: "Software",
      accounts: "Accounts",
      other: "Other Products"
    };
    [...new Set(products.map(p => p.category || "other"))].forEach(category => {
      const list = products.filter(p => (p.category || "other") === category);
      const h = document.createElement("h2");
      h.textContent = names[category] || category;
      const grid = document.createElement("div");
      grid.className = "sm-db-grid";
      list.forEach(p => grid.appendChild(card(p)));
      root.append(h, grid);
    });
  } catch (error) {
    root.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "Products could not load. Please refresh later.";
    root.appendChild(message);
    console.error("SHIT MART catalog:", error);
  }
})();
