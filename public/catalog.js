(async function () {
  const categories = [
    { id: "subscriptions", name: "Subscriptions", icon: "📺" },
    { id: "topups", name: "Game Top-ups", icon: "🎮" },
    { id: "giftcards", name: "Gift Cards", icon: "🎁" },
    { id: "software", name: "Software", icon: "💻" },
    { id: "accounts", name: "Gaming Accounts", icon: "👾" },
    { id: "other", name: "Other Products", icon: "✦" }
  ];

  const style = document.createElement("style");
  style.textContent = `
    #sm-store-products{max-width:1200px;margin:30px auto;padding:0 20px;color:inherit}
    .sm-product-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:16px}
    .sm-product-card{border:1px solid var(--line,#29364b);border-radius:15px;padding:14px;background:linear-gradient(145deg,#121b2a,#0c111b);color:#f4f7ff;overflow-wrap:anywhere}
    .sm-product-image{width:100%;height:170px;object-fit:contain;border-radius:10px}
    .sm-product-card h3{font-size:16px;margin:12px 0 7px}
    .sm-product-description{font-size:13px;line-height:1.6;color:#aab6cc;white-space:pre-wrap}
    .sm-product-price{font-size:19px;font-weight:800;margin-top:12px;color:#78bdff}
    .sm-back{display:inline-block;margin:0 0 20px;color:#78bdff;text-decoration:none}
    .sm-page-title{font-size:clamp(25px,5vw,36px);margin:5px 0 22px}
    .sm-message{color:#aab6cc;padding:18px 0}
  `;
  document.head.appendChild(style);

  const root = document.getElementById("sm-store-products") ||
    document.createElement("section");
  root.id = "sm-store-products";

  const categorySection = document.getElementById("categories");
  if (categorySection && !root.isConnected) {
    categorySection.insertAdjacentElement("afterend", root);
  } else if (!root.isConnected) {
    document.querySelector("main")?.appendChild(root);
  }

  const getCategory = () => {
    const slug = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    return categories.find(c => c.id === slug) || null;
  };

  function card(p) {
    const el = document.createElement("article");
    el.className = "sm-product-card";
    if (p.image_url) {
      const img = document.createElement("img");
      img.className = "sm-product-image";
      img.src = p.image_url;
      img.alt = p.name;
      img.loading = "lazy";
      img.onerror = () => img.remove();
      el.appendChild(img);
    }
    const title = document.createElement("h3");
    title.textContent = p.name;
    const desc = document.createElement("p");
    desc.className = "sm-product-description";
    desc.textContent = p.description || "";
    const price = document.createElement("div");
    price.className = "sm-product-price";
    price.textContent = "NPR " + Number(p.price).toLocaleString("en-NP");
    el.append(title, desc, price);
    return el;
  }

  function navigate(path) {
    if (location.pathname !== path) history.pushState({}, "", path);
    renderRoute();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function renderRoute() {
    const current = getCategory();
    const home = !current && (
      location.pathname === "/" ||
      location.pathname.endsWith("/index.html")
    );

    if (categorySection) categorySection.hidden = !home;
    root.replaceChildren();
    root.hidden = home;

    if (home) return;

    if (!current) {
      root.hidden = false;
      const h = document.createElement("h1");
      h.className = "sm-page-title";
      h.textContent = "Page not found";
      root.appendChild(h);
      const back = document.createElement("a");
      back.className = "sm-back";
      back.href = "/";
      back.textContent = "← Back to home";
      back.onclick = e => { e.preventDefault(); navigate("/"); };
      root.appendChild(back);
      return;
    }

    const back = document.createElement("a");
    back.className = "sm-back";
    back.href = "/";
    back.textContent = "← All categories";
    back.onclick = e => { e.preventDefault(); navigate("/"); };
    root.appendChild(back);

    const title = document.createElement("h1");
    title.className = "sm-page-title";
    title.textContent = current.icon + " " + current.name;
    root.appendChild(title);

    const loading = document.createElement("p");
    loading.className = "sm-message";
    loading.textContent = "Loading products…";
    root.appendChild(loading);

    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (getCategory()?.id !== current.id) return;

      const products = (data.products || []).filter(
        p => (p.category || "other").toLowerCase() === current.id
      );

      root.replaceChildren(back, title);

      if (!products.length) {
        const msg = document.createElement("p");
        msg.className = "sm-message";
        msg.textContent = "No products in this category yet. Check back soon!";
        root.appendChild(msg);
        return;
      }

      const grid = document.createElement("div");
      grid.className = "sm-product-grid";
      products.forEach(p => grid.appendChild(card(p)));
      root.appendChild(grid);
    } catch (e) {
      loading.textContent = "Couldn't load products. Please refresh the page.";
      console.error("SHIT MART products:", e);
    }
  }

  // Category cards navigate to their own URLs.
  categories.forEach(c => {
    const button = document.querySelector(
      '#categoryGrid .category[data-name="' + c.name + '"]'
    );
    if (button) {
      button.onclick = () => navigate("/" + c.id);
      button.style.cursor = "pointer";
    }
  });

  // Header category links navigate instead of filtering the homepage.
  document.querySelectorAll("[data-filter]").forEach(link => {
    const c = categories.find(x => x.name === link.dataset.filter);
    if (c) link.addEventListener("click", e => {
      e.preventDefault();
      navigate("/" + c.id);
    });
  });

  window.addEventListener("popstate", renderRoute);
  await renderRoute();
})();
