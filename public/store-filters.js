(() => {
  const style = document.createElement("style");
  style.textContent = `
  .sm-filter-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(125px,.6fr);gap:10px;margin:0 14px 16px;padding:13px;background:#101827;border:1px solid #26364d;border-radius:14px}
  .sm-filter-panel input,.sm-filter-panel select{width:100%;min-width:0;box-sizing:border-box;padding:12px 10px;background:#080e18;color:#f3f7ff;border:1px solid #33445c;border-radius:9px;font:inherit;font-size:14px}
  .sm-filter-panel .sm-filter-search{grid-column:1/-1}
  .sm-filter-panel .sm-filter-meta{grid-column:1/-1;color:#aab6cc;font-size:12px}
  .sm-filter-panel [hidden],.sm-filter-card-hidden{display:none!important}
  @media(min-width:700px){.sm-filter-panel{grid-template-columns:minmax(0,2fr) 1fr 1fr 1fr;margin:0 0 18px}.sm-filter-panel .sm-filter-search,.sm-filter-panel .sm-filter-meta{grid-column:auto}}
  `;
  document.head.appendChild(style);

  function init() {
    const root = document.querySelector("#sm-store-products");
    if (!root) return;
    const grid = root.querySelector(".sm-product-grid");
    if (!grid || !grid.querySelector(".sm-product-card")) return;
    if (root.querySelector(".sm-filter-panel")) return;

    const panel = document.createElement("div");
    panel.className = "sm-filter-panel";
    panel.innerHTML = `
      <input class="sm-filter-search" type="search" aria-label="Search products" placeholder="🔍 Search products…" autocomplete="off">
      <select class="sm-filter-price" aria-label="Filter by price">
        <option value="all">Any price</option>
        <option value="100">Under Rs. 100</option>
        <option value="250">Under Rs. 250</option>
        <option value="500">Under Rs. 500</option>
        <option value="1000">Under Rs. 1,000</option>
      </select>
      <select class="sm-filter-sort" aria-label="Sort products">
        <option value="default">Default order</option>
        <option value="low">Price: low to high</option>
        <option value="high">Price: high to low</option>
        <option value="az">Name: A to Z</option>
      </select>
      <div class="sm-filter-meta" aria-live="polite"></div>`;
    grid.parentNode.insertBefore(panel, grid);

    const search = panel.querySelector(".sm-filter-search");
    const price = panel.querySelector(".sm-filter-price");
    const sort = panel.querySelector(".sm-filter-sort");
    const meta = panel.querySelector(".sm-filter-meta");
    const cards = Array.from(grid.querySelectorAll(".sm-product-card"));
    const original = new Map(cards.map((card, i) => [card, i]));
    const priceOf = card => {
      const el = card.querySelector(".sm-product-price");
      if (!el) return 0;
      const nums = (el.textContent.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?/g) || []);
      return nums.length ? Number(nums[0].replace(/,/g, "")) : 0;
    };
    function update() {
      const q = search.value.trim().toLowerCase();
      const limit = price.value === "all" ? Infinity : Number(price.value);
      let shown = 0;
      const ordered = [...cards].sort((a,b) => {
        if (sort.value === "low") return priceOf(a)-priceOf(b);
        if (sort.value === "high") return priceOf(b)-priceOf(a);
        if (sort.value === "az") return (a.querySelector("h3")?.textContent || "").localeCompare(b.querySelector("h3")?.textContent || "");
        return original.get(a)-original.get(b);
      });
      ordered.forEach(card => {
        const matches = card.textContent.toLowerCase().includes(q) && priceOf(card) < limit;
        card.classList.toggle("sm-filter-card-hidden", !matches);
        if (matches) shown++;
        grid.appendChild(card);
      });
      meta.textContent = shown + (shown === 1 ? " product found" : " products found");
    }
    [search, price, sort].forEach(el => el.addEventListener("input", update));
    [price, sort].forEach(el => el.addEventListener("change", update));
    update();
  }

  function watch() {
    init();
    const root = document.querySelector("#sm-store-products");
    if (root && !root.dataset.smFilterWatching) {
      root.dataset.smFilterWatching = "1";
      new MutationObserver(() => init()).observe(root, {childList:true, subtree:true});
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
  else watch();
  new MutationObserver(watch).observe(document.documentElement, {childList:true, subtree:true});
})();