(() => {
  const input = document.getElementById("search");
  if (!input) return;

  input.placeholder = "Search products by name...";
  input.setAttribute("aria-label", "Search products");

  const style = document.createElement("style");
  style.textContent = `
    .search{z-index:30}
    .home-product-results{position:absolute;top:calc(100% + 8px);left:0;right:0;max-height: min(65vh,420px);overflow:auto;background:#0d1522;border:1px solid #293b54;border-radius:13px;box-shadow:0 16px 40px #0009;z-index:100}
    .home-product-results[hidden]{display:none}
    .home-product-result{display:block;width:100%;padding:13px 15px;text-align:left;color:#f3f7ff;background:transparent;border:0;border-bottom:1px solid #223047;cursor:pointer}
    .home-product-result:last-child{border-bottom:0}
    .home-product-result:active,.home-product-result:hover{background:#172740}
    .home-product-result strong{display:block;font-size:14px;line-height:1.4}
    .home-product-result small{display:block;color:#aabbd1;font-size:12px;margin-top:5px;line-height:1.5}
    .home-product-empty{padding:15px;color:#aabbd1;font-size:13px}
    @media(max-width:720px){.home-product-results{max-height:55vh}}
  `;
  document.head.appendChild(style);

  const results = document.createElement("div");
  results.className = "home-product-results";
  results.hidden = true;
  results.setAttribute("role", "listbox");
  input.parentElement.appendChild(results);

  const categoryNames = {
    subscriptions: "Subscriptions",
    topups: "Game Top-ups",
    giftcards: "Gift Cards",
    software: "Software",
    accounts: "Gaming Accounts",
    other: "Other Products"
  };

  let products = [];
  let loaded = false;
  let loading = false;
  let request = 0;

  function message(text) {
    results.replaceChildren();
    const item = document.createElement("div");
    item.className = "home-product-empty";
    item.textContent = text;
    results.appendChild(item);
    results.hidden = false;
  }

  function hide() {
    results.hidden = true;
  }

  function showMatches() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      hide();
      return;
    }
    if (!loaded) {
      message(loading ? "Loading products…" : "Loading products…");
      return;
    }

    const matches = products.filter(p =>
      [p.name, p.description, categoryNames[String(p.category || "other").toLowerCase()]]
        .some(v => String(v || "").toLowerCase().includes(query))
    ).slice(0, 8);

    results.replaceChildren();
    if (!matches.length) {
      message("No matching products found. Try another search.");
      return;
    }

    matches.forEach(p => {
      const category = String(p.category || "other").toLowerCase();
      const link = document.createElement("a");
      link.className = "home-product-result";
      const productCategory = ["subscriptions","topups","giftcards","software","accounts","other"].includes(String(p.category || "other").toLowerCase()) ? String(p.category || "other").toLowerCase() : "other";
      const productSlug = String(p.name || "product").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
      link.href = ("/" + (categoryNames[String(p.category || "other").toLowerCase()] ? String(p.category || "other").toLowerCase() : "other") + "/" + (String(p.name || "product").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"));

      const name = document.createElement("strong");
      name.textContent = p.name || "Untitled product";
      const detail = document.createElement("small");
      const price = Number(p.price);
      detail.textContent =
        (Number.isFinite(price) ? "Rs. " + price.toLocaleString("en-IN") : "Price on request") +
        " · " + (categoryNames[category] || "Other Products");

      link.append(name, detail);
      results.appendChild(link);
    });
    results.hidden = false;
  }

  async function loadProducts() {
    if (loaded || loading) return;
    loading = true;
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) throw new Error("Product request failed");
      const data = await response.json();
      products = Array.isArray(data) ? data :
        (Array.isArray(data.products) ? data.products : []);
      loaded = true;
    } catch {
      message("Couldn't load products. Please try again.");
    } finally {
      loading = false;
    }
    if (input.value.trim()) showMatches();
  }

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      showMatches();
      loadProducts();
    }
  });

  input.addEventListener("input", () => {
    const current = ++request;
    if (!input.value.trim()) {
      hide();
      return;
    }
    if (loaded) {
      showMatches();
    } else {
      message("Loading products…");
      loadProducts();
    }
    // Ignore stale asynchronous UI updates.
    Promise.resolve().then(() => {
      if (current !== request) return;
      if (loaded) showMatches();
    });
  });

  document.addEventListener("click", event => {
    if (!input.parentElement.contains(event.target)) hide();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Escape") hide();
    if (event.key === "Enter" && !results.hidden) {
      const first = results.querySelector("a");
      if (first) {
        event.preventDefault();
        location.href = first.href;
      }
    }
  });
})();
