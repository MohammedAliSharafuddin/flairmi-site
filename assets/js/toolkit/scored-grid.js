/*
 * Scored grid: shared engine for Phase 2 of the Marketing Toolkit Hub
 * (SWOT, PESTEL, and eventually Porter's Five Forces and the Ansoff
 * Matrix). Config-driven so each tool supplies its own categories and
 * copy, not a separate implementation. See
 * plans/FlairMI_Marketing_Toolkit_Hub_Master_Plan.md.
 *
 * Each category collects items scored on two axes, impact and
 * likelihood (1-5 each). The point of the tool, per the master plan, is
 * to force ranking rather than just listing: every item gets a priority
 * score (impact times likelihood) driving a live scatter plot and a
 * cross-category "top priorities" list, not just a static box of
 * sticky notes.
 *
 * Usage: window.ScoredGrid.mount({ rootId, categories, itemPlaceholder }).
 * categories: [{ id, label, color }], color from the dataviz skill's
 * validated categorical palette (or the site's status-badge colours,
 * where a category maps naturally onto good/bad, as SWOT's does).
 */
(function () {
  "use strict";

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined") return;

    const categories = config.categories;
    const itemPlaceholder = config.itemPlaceholder || "e.g. A specific, checkable observation";
    let items = []; // { id, categoryId, text, impact, likelihood }
    let nextId = 0;

    const W = 480, H = 380;
    const PAD = 40;

    root.innerHTML = `
      <div class="scored-grid" id="${config.rootId}-grid"></div>
      <div class="scored-lower">
        <div class="scored-chart-wrap">
          <h3>Impact vs. likelihood</h3>
          <svg id="${config.rootId}-scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter plot of every item by impact and likelihood"></svg>
        </div>
        <div class="scored-priorities-wrap">
          <h3>Top priorities</h3>
          <ol class="scored-priorities" id="${config.rootId}-priorities"></ol>
        </div>
      </div>
    `;

    const gridEl = document.getElementById(config.rootId + "-grid");
    const svg = d3.select("#" + config.rootId + "-scatter");
    const prioritiesEl = document.getElementById(config.rootId + "-priorities");

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
      );
    }
    function categoryOf(id) {
      return categories.find((c) => c.id === id);
    }
    function priorityOf(item) {
      return item.impact * item.likelihood;
    }

    function renderGrid() {
      gridEl.innerHTML = categories
        .map((cat) => {
          const catItems = items
            .filter((i) => i.categoryId === cat.id)
            .sort((a, b) => priorityOf(b) - priorityOf(a));
          return `
        <div class="scored-category" style="border-top-color:${cat.color}">
          <h4>${escapeHtml(cat.label)}</h4>
          <ul class="scored-item-list">
            ${
              catItems.length
                ? catItems
                    .map(
                      (i) => `
              <li class="scored-item">
                <span class="scored-item-text">${escapeHtml(i.text)}</span>
                <span class="scored-item-score" title="Impact ${i.impact} &times; likelihood ${i.likelihood}">${priorityOf(i)}</span>
                <button type="button" class="scored-item-remove" data-remove="${i.id}" aria-label="Remove">&times;</button>
              </li>`
                    )
                    .join("")
                : `<li class="scored-item-empty">Nothing added yet.</li>`
            }
          </ul>
          <form class="scored-add-form" data-category="${cat.id}">
            <input type="text" class="scored-add-text" placeholder="${escapeHtml(itemPlaceholder)}" aria-label="${escapeHtml(cat.label)} item">
            <div class="scored-add-row">
              <label>Impact
                <select class="scored-add-impact">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}"${n === 3 ? " selected" : ""}>${n}</option>`).join("")}</select>
              </label>
              <label>Likelihood
                <select class="scored-add-likelihood">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}"${n === 3 ? " selected" : ""}>${n}</option>`).join("")}</select>
              </label>
              <button type="submit" class="toolkit-btn secondary">Add</button>
            </div>
          </form>
        </div>`;
        })
        .join("");

      gridEl.querySelectorAll(".scored-add-form").forEach((form) => {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const text = form.querySelector(".scored-add-text").value.trim();
          if (!text) return;
          items.push({
            id: nextId++,
            categoryId: form.getAttribute("data-category"),
            text,
            impact: Number(form.querySelector(".scored-add-impact").value),
            likelihood: Number(form.querySelector(".scored-add-likelihood").value),
          });
          render();
        });
      });
      gridEl.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-remove"));
          items = items.filter((i) => i.id !== id);
          render();
        });
      });
    }

    function scaleX(v) {
      return PAD + ((v - 1) / 4) * (W - PAD * 2);
    }
    function scaleY(v) {
      return H - PAD - ((v - 1) / 4) * (H - PAD * 2);
    }

    function renderScatter() {
      svg.selectAll("*").remove();
      // axes
      svg
        .append("line")
        .attr("x1", PAD)
        .attr("x2", W - PAD)
        .attr("y1", H - PAD)
        .attr("y2", H - PAD)
        .attr("stroke", "var(--toolkit-border, #e5e5e5)");
      svg
        .append("line")
        .attr("x1", PAD)
        .attr("x2", PAD)
        .attr("y1", PAD)
        .attr("y2", H - PAD)
        .attr("stroke", "var(--toolkit-border, #e5e5e5)");
      svg
        .append("text")
        .attr("x", (PAD + W - PAD) / 2)
        .attr("y", H - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "var(--toolkit-muted, #6b6b6b)")
        .text("Impact →");
      svg
        .append("text")
        .attr("x", -(PAD + H - PAD) / 2)
        .attr("y", 14)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "var(--toolkit-muted, #6b6b6b)")
        .text("Likelihood →");

      // deterministic jitter so identical scores don't stack exactly
      const jitter = (id, spread) => (((id * 53) % 100) / 100 - 0.5) * spread;

      svg
        .selectAll("circle")
        .data(items, (d) => d.id)
        .join("circle")
        .attr("cx", (d) => scaleX(d.impact) + jitter(d.id, 14))
        .attr("cy", (d) => scaleY(d.likelihood) + jitter(d.id * 7, 14))
        .attr("r", 7)
        .attr("fill", (d) => categoryOf(d.categoryId).color)
        .attr("opacity", 0.85)
        .append("title")
        .text((d) => `${d.text} (impact ${d.impact}, likelihood ${d.likelihood})`);
    }

    function renderPriorities() {
      const top = [...items].sort((a, b) => priorityOf(b) - priorityOf(a)).slice(0, 5);
      prioritiesEl.innerHTML = top.length
        ? top
            .map((i) => {
              const cat = categoryOf(i.categoryId);
              return `<li><span class="swatch" style="background:${cat.color}"></span><strong>${escapeHtml(i.text)}</strong> <span class="scored-priorities-meta">${escapeHtml(cat.label)} &middot; score ${priorityOf(i)}</span></li>`;
            })
            .join("")
        : `<li class="scored-item-empty">Add a few items to see your top priorities.</li>`;
    }

    function render() {
      renderGrid();
      renderScatter();
      renderPriorities();
    }

    render();
  }

  window.ScoredGrid = { mount };
})();
