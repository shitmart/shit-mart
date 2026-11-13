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
    #sm-store-products{margin-top:34px}
    .sm-category-products{margin:32px 0;scroll-margin-top:100px}
    .sm-category-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}
    .sm-category-heading h2{margin:0;font-size:clamp(20px,4vw,28px)}
    .sm-product-count{font-size:12px;color:#9eabc0}
    .sm-product-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:15px}
    .sm-product-card{border:1px solid var(--line,#29364b);border-radius:15px;padding:13px;background:linear-gradient(145deg,#121b2a,#0c111b);color:#f4f7ff;overflow-wrap:anywhere}
    .sm-product-image{width:100%;height:155px;object-fit:contain;border-radius:10px}
    .sm-product-card h3{font-size:16px;margin:12px 0 7px}
    .sm-product-description{font-size:13px;line-height:1.6;color:#aab6cc;white-space:pre-wrap}
    .sm-product-price{font-size:19px;font-weight:800;margin-top:12px;color:#78bdff}
    .sm-category-button{cursor:pointer}
    .sm-no-products{color:#aab6cc;padding:12px 0}
  `;
  document.head.appendChild(style);

  const categoryGrid = document.getElementById("categoryGrid");
  if (!categoryGrid) return;

  let root = document.getElementById("sm-store-products");
  if (!root) {
    root = document.createElement("div");
    root.id = "sm-store-products";
    categoryGrid.insertAdjacentElement("afterend", root);
  }

  const escapeText = value => String(value ?? "");

  function makeCard(product) {
    const card = document.createElement("article");
    card.className = "sm-product-card";

    if (product.image_url) {
      const image = document.createElement("img");
      image.className = "sm-product-image";
      image.src = product.image_url;
      image.alt = escapeText(product.name);
      image.loading = "lazy";
      image.onerror = () => image.remove();
      card.appendChild(image);
    }

    const name = document.createElement("h3");
    name.textContent = product.name;

    const description = document.createElement("p");
    description.className = "sm-product-description";
    description.textContent = product.description || "";

    const price = document.createElement("div");
    price.className = "sm-product-price";
    price.textContent = "NPR " + Number(product.price).toLocaleString("en-NP");

    card.append(name, description, price);
    return card;
  }

  function showCategory(id) {
    const section = document.getElementById("sm-cat-" + id);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) throw new Error("Product API: " + response.status);

    const data = await response.json();
    const products = data.products || [];

    root.replaceChildren();

    categories.forEach(category => {
      const categoryProducts = products.filter(
        product => (product.category || "other").toLowerCase() === category.id
      );

      const button = categoryGrid.querySelector(
        '.category[data-name="' + category.name + '"]'
      );

      if (button) {
        button.classList.add("sm-category-button");

        const small = button.querySelector("small");
        if (small) {
          small.textContent = categoryProducts.length
            ? categoryProducts.length + " product" +
              (categoryProducts.length === 1 ? "" : "s") + " available."
            : "New digital products coming soon.";
        }

        button.onclick = () => showCategory(category.id);
      }

      const section = document.createElement("section");
      section.className = "sm-category-products";
      section.id = "sm-cat-" + category.id;

      const heading = document.createElement("div");
      heading.className = "sm-category-heading";

      const title = document.createElement("h2");
      title.textContent = category.icon + " " + category.name;

      const count = document.createElement("span");
      count.className = "sm-product-count";
      count.textContent = categoryProducts.length + " products";

      heading.append(title, count);
      section.appendChild(heading);

      if (!categoryProducts.length) {
        const empty = document.createElement("p");
        empty.className = "sm-no-products";
        empty.textContent = "No products in this category yet.";
        section.appendChild(empty);
      } else {
        const grid = document.createElement("div");
        grid.className = "sm-product-grid";
        categoryProducts.forEach(product => grid.appendChild(makeCard(product)));
        section.appendChild(grid);
      }

      root.appendChild(section);
    });

    document.querySelectorAll("[data-filter]").forEach(link => {
      link.addEventListener("click", () => {
        const filter = link.dataset.filter;
        const category = categories.find(item => item.name === filter);
        if (category) setTimeout(() => showCategory(category.id), 50);
      });
    });

    console.log("SHIT MART catalog loaded:", products.length, "products");
  } catch (error) {
    root.replaceChildren();
    const message = document.createElement("p");
    message.className = "sm-no-products";
    message.textContent = "Products could not load. Please refresh later.";
    root.appendChild(message);
    console.error("SHIT MART catalog error:", error);
  }
})();
