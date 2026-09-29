/*
 * assets/js/toolkit/servqual.js
 *
 * SERVQUAL Gap Analysis. Expectation and perception scores (1 to 7) for
 * 22 items across the five SERVQUAL dimensions, the gap P minus E per item
 * and per dimension, an importance weighting that shares 100 points across
 * the dimensions, and the weighted overall score. Scores come from typed
 * averages or from pasted survey responses (columns E1 to E22 and P1 to
 * P22). Item wording is FlairMI's own, written against the five
 * dimensions of Parasuraman, Zeithaml and Berry (1988).
 *
 * Pain points tagged to gaps 1 to 4 in the Customer Journey Mapper are
 * listed alongside, since those provider gaps are what drive the customer
 * gap this tool measures.
 *
 * Usage: window.Servqual.mount({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;
  const STORE = "flairmi-servqual-v1";
  const JOURNEY_STORE = "flairmi-journey-mapper-v3";

  const DIMENSIONS = [
    { id: "tan", label: "Tangibles", color: TK.PALETTE[0], items: ["Equipment looks modern and well kept", "Facilities are visually appealing", "Staff look neat and professional", "Printed and digital materials are clear and attractive"] },
    { id: "rel", label: "Reliability", color: TK.PALETTE[1], items: ["Services are delivered as promised", "Staff show a sincere interest in solving problems", "The service is right the first time", "Services are delivered at the promised time", "Records and bills are accurate"] },
    { id: "res", label: "Responsiveness", color: TK.PALETTE[2], items: ["Customers are told exactly when services will happen", "Service is prompt", "Staff are always willing to help", "Staff make time to respond to requests"] },
    { id: "ass", label: "Assurance", color: TK.PALETTE[3], items: ["Staff behaviour builds confidence", "Customers feel safe in their dealings", "Staff are courteous every time", "Staff have the knowledge to answer questions"] },
    { id: "emp", label: "Empathy", color: TK.PALETTE[6], items: ["Customers get individual attention", "Opening hours suit customers", "Staff give personal attention", "The business has customers' best interests at heart", "Staff understand customers' specific needs"] }
  ];

  // Illustrative hotel figures: high expectations everywhere, perceptions
  // that fall short most on responsiveness and empathy.
  const SAMPLE = {
    E: [6.2, 6.0, 6.1, 5.8, 6.7, 6.4, 6.5, 6.6, 6.3, 6.2, 6.5, 6.4, 6.3, 6.4, 6.5, 6.3, 6.4, 6.1, 5.9, 6.2, 6.3, 6.2],
    P: [6.0, 6.2, 5.9, 5.6, 6.0, 5.7, 5.8, 6.1, 6.2, 5.3, 5.2, 5.6, 5.0, 6.0, 6.3, 6.1, 5.9, 5.1, 5.6, 5.0, 5.3, 4.9],
    weights: { tan: 11, rel: 32, res: 22, ass: 19, emp: 16 }
  };

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;

    const items = [];
    DIMENSIONS.forEach((d) => d.items.forEach((text) => items.push({ dim: d.id, text })));

    let state = TK.store.get(STORE, null) || fresh(true);

    function fresh(sample) {
      return {
        title: sample ? "Hotel service quality, sample figures" : "",
        texts: items.map((i) => i.text),
        E: sample ? SAMPLE.E.slice() : items.map(() => null),
        P: sample ? SAMPLE.P.slice() : items.map(() => null),
        weights: sample ? Object.assign({}, SAMPLE.weights) : { tan: 20, rel: 20, res: 20, ass: 20, emp: 20 },
        n: null
      };
    }
    function save() { TK.store.set(STORE, state); }

    root.innerHTML = `
      <div class="tk-toolbar">
        <label class="tk-grow">Study title <input type="text" data-k="title"></label>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="clear">Start blank</button>
      </div>
      <details class="tk-details">
        <summary>Import survey responses (CSV)</summary>
        <p class="tk-help">One row per respondent, with columns E1 to E22 for expectations and P1 to P22 for perceptions, each scored 1 to 7. The tool averages each column. Items follow the order in the table below.</p>
        <textarea class="tk-mono" rows="5" data-k="csv" placeholder="E1,E2,...,E22,P1,P2,...,P22"></textarea>
        <div class="tk-row"><button type="button" class="toolkit-btn" data-a="import">Average the responses</button>
        <button type="button" class="toolkit-btn secondary" data-a="template">Download a blank template</button></div>
      </details>
      <div class="tk-split">
        <div class="tk-panel">
          <h3>Importance weights</h3>
          <p class="tk-help">Share 100 points across the five dimensions, by how much each matters to your customers.</p>
          <div class="sq-weights"></div>
        </div>
        <div class="tk-panel sq-journey"></div>
      </div>
      <div class="tk-table-wrap"><table class="tk-table sq-items"></table></div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="tk-kpis"></div>
        <h4>Expectation and perception by dimension</h4><div class="sq-dumbbell tk-chart-box"></div>
        <h4>Largest item gaps</h4><div class="sq-bars tk-chart-box"></div>
      </div>
    `;
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, () => TK.slug(state.title, "servqual")));

    root.querySelector('[data-k="title"]').addEventListener("input", (e) => { state.title = e.target.value; save(); renderReport(); });

    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "sample") { state = fresh(true); save(); renderAll(); }
      if (a.dataset.a === "clear") { state = fresh(false); save(); renderAll(); }
      if (a.dataset.a === "template") {
        const head = items.map((_, i) => "E" + (i + 1)).concat(items.map((_, i) => "P" + (i + 1)));
        TK.downloadText(head.join(",") + "\n", "servqual-template.csv", "text/csv");
      }
      if (a.dataset.a === "import") importCSV();
    });

    function importCSV() {
      const box = root.querySelector('[data-k="csv"]');
      const { headers, rows } = TK.csvObjects(box.value);
      const find = (p, i) => headers.find((h) => h.toUpperCase() === p + (i + 1));
      if (!rows.length || !find("E", 0)) {
        box.setCustomValidity("Paste rows with a header line of E1 to E22 and P1 to P22.");
        box.reportValidity();
        return;
      }
      box.setCustomValidity("");
      ["E", "P"].forEach((p) => {
        state[p] = items.map((_, i) => {
          const h = find(p, i);
          if (!h) return null;
          const m = TK.mean(rows.map((r) => TK.num(r[h])).filter((v) => v >= 1 && v <= 7));
          return Number.isFinite(m) ? Math.round(m * 100) / 100 : null;
        });
      });
      state.n = rows.length;
      save();
      renderAll();
    }

    function renderWeights() {
      const box = root.querySelector(".sq-weights");
      const total = DIMENSIONS.reduce((s, d) => s + TK.num(state.weights[d.id], 0), 0);
      box.innerHTML = DIMENSIONS.map((d) => `
        <label class="tk-inline"><span><span class="swatch" style="background:${d.color}"></span>${d.label}</span>
          <input type="number" min="0" max="100" step="1" data-w="${d.id}" value="${TK.num(state.weights[d.id], 0)}"></label>`).join("") +
        `<p class="tk-help ${total === 100 ? "" : "tk-warn"}">Total ${total} of 100${total === 100 ? "" : ". Weights are rescaled to 100 in the results."}</p>`;
      box.querySelectorAll("[data-w]").forEach((inp) => inp.addEventListener("change", () => {
        state.weights[inp.dataset.w] = Math.max(0, TK.num(inp.value, 0));
        save();
        renderWeights();
        renderReport();
      }));
    }

    function renderItems() {
      const t = root.querySelector(".sq-items");
      let i = 0;
      t.innerHTML = `<thead><tr><th>#</th><th>Item</th><th>Expectation</th><th>Perception</th><th>Gap</th></tr></thead><tbody>` +
        DIMENSIONS.map((d) => `<tr class="tk-group"><td colspan="5"><span class="swatch" style="background:${d.color}"></span>${d.label}</td></tr>` +
          d.items.map(() => {
            const k = i++;
            return `<tr data-i="${k}"><td>${k + 1}</td>
              <td><input type="text" data-f="text" value="${TK.esc(state.texts[k])}" aria-label="Item ${k + 1} wording"></td>
              <td><input type="number" min="1" max="7" step="0.1" data-f="E" value="${state.E[k] == null ? "" : state.E[k]}" aria-label="Expectation for item ${k + 1}"></td>
              <td><input type="number" min="1" max="7" step="0.1" data-f="P" value="${state.P[k] == null ? "" : state.P[k]}" aria-label="Perception for item ${k + 1}"></td>
              <td class="sq-gap">${gapCell(k)}</td></tr>`;
          }).join("")).join("") + "</tbody>";
      t.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
        const k = Number(inp.closest("tr").dataset.i), f = inp.dataset.f;
        if (f === "text") state.texts[k] = inp.value;
        else {
          const v = TK.num(inp.value);
          state[f][k] = Number.isFinite(v) ? Math.min(7, Math.max(1, v)) : null;
          inp.closest("tr").querySelector(".sq-gap").innerHTML = gapCell(k);
        }
        save();
        renderReport();
      }));
    }
    function gapOf(k) {
      return state.E[k] == null || state.P[k] == null ? null : state.P[k] - state.E[k];
    }
    function gapCell(k) {
      const g = gapOf(k);
      return g == null ? "" : `<span class="${g < 0 ? "tk-neg" : "tk-pos"}">${g > 0 ? "+" : ""}${TK.fmt(g, 2)}</span>`;
    }

    function dimensionStats() {
      const wTotal = DIMENSIONS.reduce((s, d) => s + TK.num(state.weights[d.id], 0), 0) || 1;
      return DIMENSIONS.map((d) => {
        const ks = items.map((it, k) => (it.dim === d.id ? k : -1)).filter((k) => k >= 0);
        const e = TK.mean(ks.map((k) => state.E[k] == null ? NaN : state.E[k]));
        const p = TK.mean(ks.map((k) => state.P[k] == null ? NaN : state.P[k]));
        const pairs = ks.map(gapOf).filter((g) => g != null);
        return { d, e, p, gap: TK.mean(pairs), w: TK.num(state.weights[d.id], 0) / wTotal };
      });
    }

    function renderJourney() {
      const box = root.querySelector(".sq-journey");
      const map = TK.store.get(JOURNEY_STORE, null);
      const pains = map && Array.isArray(map.pains) ? map.pains.filter((p) => p.gap) : [];
      const names = { 1: "Gap 1, listening", 2: "Gap 2, service design and standards", 3: "Gap 3, service performance", 4: "Gap 4, communication" };
      box.innerHTML = `<h3>From your journey map</h3>` + (pains.length
        ? `<p class="tk-help">Provider gaps tagged in the <a href="customer-journey-mapper.qmd">Customer Journey Mapper</a> on this device. These are the causes. The scores here measure their effect on customers.</p>
           <ul class="tk-list">${[1, 2, 3, 4].map((g) => {
             const ps = pains.filter((p) => String(p.gap) === String(g));
             return ps.length ? `<li><strong>${names[g]}</strong>: ${ps.map((p) => TK.esc(p.text)).join(", ")}</li>` : "";
           }).join("")}</ul>`
        : `<p class="tk-help">Pain points you tag to gaps 1 to 4 in the <a href="customer-journey-mapper.qmd">Customer Journey Mapper</a> appear here, next to the customer gap they produce.</p>`);
    }

    function renderReport() {
      const stats = dimensionStats();
      report.querySelector(".tk-report-title").textContent = state.title || "SERVQUAL gap analysis";
      const valid = stats.filter((s) => Number.isFinite(s.gap));
      const unweighted = TK.mean(valid.map((s) => s.gap));
      const weighted = valid.length === stats.length ? stats.reduce((s, x) => s + x.gap * x.w, 0) : NaN;
      const worst = valid.slice().sort((a, b) => a.gap * a.w - b.gap * b.w)[0];
      report.querySelector(".tk-kpis").innerHTML = [
        ["Unweighted SERVQUAL score", Number.isFinite(unweighted) ? signed(unweighted) : "n/a"],
        ["Weighted SERVQUAL score", Number.isFinite(weighted) ? signed(weighted) : "n/a"],
        ["Priority dimension", worst ? worst.d.label : "n/a"],
        ["Respondents", state.n ? TK.fmtInt(state.n) : "Averages typed in"]
      ].map(([l, v]) => `<div class="tk-kpi"><span class="tk-kpi-v${String(v).length > 9 ? " tk-kpi-text" : ""}">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      drawDumbbell(stats);
      drawBars();
    }
    function signed(v) { return (v > 0 ? "+" : "") + TK.fmt(v, 2); }

    function drawDumbbell(stats) {
      const box = report.querySelector(".sq-dumbbell");
      box.innerHTML = "";
      const W = 760, H = 250, M = { l: 120, r: 60, t: 20, b: 34 };
      const svg = TK.svg(box, W, H, "Expectation and perception means for each SERVQUAL dimension");
      const lowest = d3.min(stats, (s) => Math.min(s.e, s.p));
      const x = d3.scaleLinear().domain([Math.max(1, Math.floor(Number.isFinite(lowest) ? lowest : 1) - 1), 7]).range([M.l, W - M.r]);
      const y = d3.scaleBand().domain(stats.map((s) => s.d.label)).range([M.t, H - M.b]).padding(0.4);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(6)));
      svg.append("g").selectAll("text").data(stats).join("text")
        .attr("x", M.l - 10).attr("y", (s) => y(s.d.label) + y.bandwidth() / 2 + 4).attr("text-anchor", "end")
        .attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK).text((s) => s.d.label);
      stats.forEach((s) => {
        if (!Number.isFinite(s.e) || !Number.isFinite(s.p)) return;
        const cy = y(s.d.label) + y.bandwidth() / 2;
        svg.append("line").attr("x1", x(s.e)).attr("x2", x(s.p)).attr("y1", cy).attr("y2", cy)
          .attr("stroke", s.p < s.e ? TK.BAD : TK.GOOD).attr("stroke-width", 3);
        svg.append("circle").attr("cx", x(s.e)).attr("cy", cy).attr("r", 6).attr("fill", "#fff").attr("stroke", TK.INK).attr("stroke-width", 2)
          .append("title").text(`${s.d.label} expectation ${TK.fmt(s.e, 2)}`);
        svg.append("circle").attr("cx", x(s.p)).attr("cy", cy).attr("r", 6).attr("fill", TK.INK)
          .append("title").text(`${s.d.label} perception ${TK.fmt(s.p, 2)}`);
        svg.append("text").attr("x", Math.max(x(s.e), x(s.p)) + 10).attr("y", cy + 4).attr("font-size", 11)
          .attr("fill", s.gap < 0 ? TK.BAD : TK.GOOD).attr("font-weight", 700).text(signed(s.gap));
      });
      svg.append("g").attr("transform", `translate(${M.l},${H - 6})`).call((g) => {
        g.append("circle").attr("cx", 4).attr("cy", -4).attr("r", 5).attr("fill", "#fff").attr("stroke", TK.INK).attr("stroke-width", 2);
        g.append("text").attr("x", 14).attr("y", 0).attr("font-size", 11).attr("fill", TK.MUTED).text("Expectation");
        g.append("circle").attr("cx", 104).attr("cy", -4).attr("r", 5).attr("fill", TK.INK);
        g.append("text").attr("x", 114).attr("y", 0).attr("font-size", 11).attr("fill", TK.MUTED).text("Perception");
      });
    }

    function drawBars() {
      const box = report.querySelector(".sq-bars");
      box.innerHTML = "";
      const rows = items.map((it, k) => ({ k, text: state.texts[k], dim: DIMENSIONS.find((d) => d.id === it.dim), g: gapOf(k) }))
        .filter((r) => r.g != null).sort((a, b) => a.g - b.g).slice(0, 8);
      if (!rows.length) { box.innerHTML = `<p class="tk-help">Enter expectation and perception scores to rank the gaps.</p>`; return; }
      const W = 760, H = 36 + rows.length * 28, M = { l: 12, r: 30, t: 8, b: 24 };
      const svg = TK.svg(box, W, H, "Items with the largest gaps between perception and expectation");
      const lo = Math.min(0, d3.min(rows, (r) => r.g)), hi = Math.max(0.5, d3.max(rows, (r) => r.g));
      const x = d3.scaleLinear().domain([lo, hi]).nice().range([M.l + 380, W - M.r]);
      const y = d3.scaleBand().domain(rows.map((r) => r.k)).range([M.t, H - M.b]).padding(0.25);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5)));
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", M.t).attr("y2", H - M.b).attr("stroke", TK.MUTED);
      rows.forEach((r) => {
        const yy = y(r.k);
        svg.append("rect").attr("x", Math.min(x(0), x(r.g))).attr("width", Math.abs(x(r.g) - x(0))).attr("y", yy).attr("height", y.bandwidth())
          .attr("fill", r.dim.color).append("title").text(`${r.text}: ${signed(r.g)}`);
        svg.append("text").attr("x", M.l).attr("y", yy + y.bandwidth() / 2 + 4).attr("font-size", 11).attr("fill", TK.INK)
          .text(`${r.k + 1}. ${r.text}`);
        svg.append("text").attr("x", x(Math.min(r.g, 0)) - 4).attr("y", yy + y.bandwidth() / 2 + 4).attr("text-anchor", "end")
          .attr("font-size", 11).attr("font-weight", 700).attr("fill", r.g < 0 ? TK.BAD : TK.GOOD).text(signed(r.g));
      });
    }

    function renderAll() {
      root.querySelector('[data-k="title"]').value = state.title || "";
      renderWeights();
      renderItems();
      renderJourney();
      renderReport();
    }
    renderAll();
  }

  window.Servqual = { mount };
})();
