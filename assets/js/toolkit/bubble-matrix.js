/*
 * assets/js/toolkit/bubble-matrix.js
 *
 * Shared engine for the matrix tools: BCG Growth-Share Matrix,
 * GE-McKinsey Matrix, Ansoff Matrix, and the Importance-Performance
 * Analysis matrix. Each tool supplies its input fields, how an item maps
 * to x, y, and bubble size, the background regions, and how a position is
 * classified. Optional weighted factors (GE-McKinsey) score each item on
 * more than one factor per axis and combine them with editable weights.
 *
 * Usage: window.BubbleMatrix.mount({ rootId, storeKey, itemLabel,
 *   fields, factors, settings, compute, x, y, regions, classify, sizeLabel,
 *   sample, defaultTitle, notes }).
 */
(function () {
  "use strict";
  const TK = window.TK;

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;

    let state = TK.store.get(config.storeKey, null) || sample();
    function sample() { return JSON.parse(JSON.stringify(config.sample)); }
    function blank() {
      const s = sample();
      s.title = "";
      s.items = [];
      return s;
    }
    function save() { TK.store.set(config.storeKey, state); }
    function setting(k) {
      const def = (config.settings || []).find((x) => x.key === k);
      const v = state.settings && state.settings[k];
      return v === undefined || v === "" ? (def ? def.default : undefined) : v;
    }

    root.innerHTML = `
      <div class="tk-toolbar">
        <label class="tk-grow">Title <input type="text" data-k="title"></label>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="clear">Start blank</button>
      </div>
      <div class="bm-settings"></div>
      <div class="bm-factors"></div>
      <div class="tk-table-wrap"><table class="tk-table bm-input"></table></div>
      <div class="tk-row"><button type="button" class="toolkit-btn" data-a="add">Add ${TK.esc(config.itemLabel.toLowerCase())}</button></div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="tk-chart-box bm-chart"></div>
        <div class="tk-table-wrap"><table class="tk-table bm-out"></table></div>
        ${config.notes ? `<p class="tk-help">${config.notes}</p>` : ""}
      </div>
    `;
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, () => TK.slug(state.title, config.rootId), [
      { label: "Download CSV", run: (st) => { TK.downloadText(TK.toCSV(csvRows()), TK.slug(state.title, config.rootId) + ".csv", "text/csv"); TK.status(st, "CSV saved."); } }
    ]));
    const titleEl = root.querySelector('[data-k="title"]');
    titleEl.addEventListener("input", () => { state.title = titleEl.value; save(); renderOut(); });
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "sample") state = sample();
      if (a.dataset.a === "clear") state = blank();
      if (a.dataset.a === "add") state.items.push(newItem());
      save();
      renderAll();
    });

    function newItem() {
      const it = { name: config.itemLabel + " " + (state.items.length + 1) };
      config.fields.forEach((f) => { if (f.key !== "name") it[f.key] = f.default !== undefined ? f.default : ""; });
      if (config.factors) Object.keys(config.factors).forEach((ax) => (it["f_" + ax] = state.factors[ax].map(() => 3)));
      return it;
    }

    function renderSettings() {
      const box = root.querySelector(".bm-settings");
      if (!config.settings) { box.innerHTML = ""; return; }
      box.innerHTML = `<div class="tk-grid">${config.settings.map((s) => `<label>${TK.esc(s.label)}
        ${s.options ? `<select data-s="${s.key}">${s.options.map((o) => `<option value="${o[0]}"${String(setting(s.key)) === String(o[0]) ? " selected" : ""}>${TK.esc(o[1])}</option>`).join("")}</select>`
          : `<input type="number" data-s="${s.key}" step="${s.step || "any"}" value="${setting(s.key)}">`}</label>`).join("")}</div>`;
      box.querySelectorAll("[data-s]").forEach((inp) => inp.addEventListener("change", () => {
        state.settings = state.settings || {};
        state.settings[inp.dataset.s] = inp.tagName === "SELECT" ? inp.value : TK.num(inp.value);
        save();
        renderOut();
      }));
    }

    function renderFactors() {
      const box = root.querySelector(".bm-factors");
      if (!config.factors) { box.innerHTML = ""; return; }
      box.innerHTML = `<div class="tk-split">${Object.keys(config.factors).map((ax) => `
        <div class="tk-panel"><h3>${TK.esc(config.factors[ax].label)} factors</h3>
          <p class="tk-help">Weights are shares of 100. Score each ${TK.esc(config.itemLabel.toLowerCase())} on every factor from 1 (poor) to 5 (strong) in the table below.</p>
          ${state.factors[ax].map((f, i) => `<div class="bm-factor-row" data-ax="${ax}" data-i="${i}">
            <input type="text" data-ff="name" value="${TK.esc(f.name)}" aria-label="Factor name">
            <input type="number" data-ff="weight" min="0" max="100" value="${f.weight}" aria-label="Weight">
          </div>`).join("")}
          <p class="tk-help">Total ${state.factors[ax].reduce((s, f) => s + TK.num(f.weight, 0), 0)} of 100</p>
        </div>`).join("")}</div>`;
      box.querySelectorAll(".bm-factor-row input").forEach((inp) => inp.addEventListener("change", () => {
        const row = inp.closest(".bm-factor-row");
        const f = state.factors[row.dataset.ax][Number(row.dataset.i)];
        if (inp.dataset.ff === "name") f.name = inp.value;
        else f.weight = Math.max(0, TK.num(inp.value, 0));
        save();
        renderFactors();
        renderInput();
        renderOut();
      }));
    }

    function renderInput() {
      const t = root.querySelector(".bm-input");
      const fcols = config.factors ? Object.keys(config.factors).flatMap((ax) => state.factors[ax].map((f, i) => ({ ax, i, name: f.name }))) : [];
      t.innerHTML = `<thead><tr>${config.fields.map((f) => `<th title="${TK.esc(f.help || "")}">${TK.esc(f.label)}</th>`).join("")}
        ${fcols.map((c) => `<th>${TK.esc(c.name)}</th>`).join("")}<th></th></tr></thead><tbody>` +
        (state.items.length ? state.items.map((it, r) => `<tr data-r="${r}">${config.fields.map((f) => `<td>${
          f.type === "select" ? `<select data-f="${f.key}">${f.options.map((o) => `<option value="${o[0]}"${String(it[f.key]) === String(o[0]) ? " selected" : ""}>${TK.esc(o[1])}</option>`).join("")}</select>`
          : `<input type="${f.type || "number"}" data-f="${f.key}" value="${TK.esc(it[f.key])}" ${f.min !== undefined ? `min="${f.min}"` : ""} ${f.max !== undefined ? `max="${f.max}"` : ""} step="${f.step || "any"}" aria-label="${TK.esc(f.label)}">`
        }</td>`).join("")}
        ${fcols.map((c) => `<td><input type="number" min="1" max="5" step="1" data-fx="${c.ax}" data-fi="${c.i}" value="${(it["f_" + c.ax] || [])[c.i] || 3}" aria-label="${TK.esc(c.name)}"></td>`).join("")}
        <td><button type="button" class="scored-item-remove" data-rm="${r}" aria-label="Remove">&times;</button></td></tr>`).join("")
        : `<tr><td colspan="${config.fields.length + fcols.length + 1}" class="tk-help">No ${TK.esc(config.itemLabel.toLowerCase())}s yet. Add one or load the sample.</td></tr>`) + "</tbody>";
      t.querySelectorAll("input,select").forEach((inp) => inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", () => {
        const it = state.items[Number(inp.closest("tr").dataset.r)];
        if (inp.dataset.fx) {
          it["f_" + inp.dataset.fx] = it["f_" + inp.dataset.fx] || [];
          it["f_" + inp.dataset.fx][Number(inp.dataset.fi)] = Math.min(5, Math.max(1, TK.num(inp.value, 3)));
        } else {
          const f = config.fields.find((x) => x.key === inp.dataset.f);
          it[f.key] = f.type === "text" || f.type === "select" ? inp.value : TK.num(inp.value);
        }
        save();
        renderOut();
      }));
      t.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => {
        state.items.splice(Number(b.dataset.rm), 1);
        save();
        renderAll();
      }));
    }

    // Weighted factor score for one item on one axis, on the 1 to 5 scale.
    function factorScore(it, ax) {
      const fs = state.factors[ax];
      const tw = fs.reduce((s, f) => s + TK.num(f.weight, 0), 0) || 1;
      return fs.reduce((s, f, i) => s + TK.num(f.weight, 0) * TK.num((it["f_" + ax] || [])[i], 3), 0) / tw;
    }

    function points() {
      const ctx = { setting, factorScore };
      return state.items.map((it, i) => {
        const p = config.compute(it, ctx);
        return Object.assign({ it, i, name: it.name }, p);
      }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }

    function csvRows() {
      const pts = points(), ctx = { setting, points: pts };
      return [["Name", config.x.label, config.y.label, config.sizeLabel || "Size", "Position", "Suggested action"]]
        .concat(pts.map((p) => { const c = config.classify(p, ctx); return [p.name, p.x, p.y, p.size || "", c.label, c.advice]; }));
    }

    function renderOut() {
      report.querySelector(".tk-report-title").textContent = state.title || config.defaultTitle;
      const pts = points();
      const ctx = { setting, points: pts };
      drawChart(pts, ctx);
      root.querySelector(".bm-out").innerHTML = pts.length ? `<thead><tr><th>${TK.esc(config.itemLabel)}</th><th class="tk-num">${TK.esc(config.x.short || config.x.label)}</th><th class="tk-num">${TK.esc(config.y.short || config.y.label)}</th><th>Position</th><th>Suggested action</th></tr></thead><tbody>` +
        pts.map((p, k) => { const c = config.classify(p, ctx); return `<tr><td><span class="swatch" style="background:${TK.PALETTE[k % TK.PALETTE.length]}"></span>${TK.esc(p.name)}</td><td class="tk-num">${(config.x.format || ((v) => TK.fmt(v, 2)))(p.x)}</td><td class="tk-num">${(config.y.format || ((v) => TK.fmt(v, 2)))(p.y)}</td><td><strong>${TK.esc(c.label)}</strong></td><td>${TK.esc(c.advice)}</td></tr>`; }).join("") + "</tbody>" : "";
    }

    function drawChart(pts, ctx) {
      const box = report.querySelector(".bm-chart");
      box.innerHTML = "";
      const W = 760, H = 500, M = { l: 64, r: 24, t: 20, b: 56 };
      const svg = TK.svg(box, W, H, `${config.defaultTitle} chart`);
      const xd = typeof config.x.domain === "function" ? config.x.domain(pts, ctx) : config.x.domain;
      const yd = typeof config.y.domain === "function" ? config.y.domain(pts, ctx) : config.y.domain;
      const xr = config.x.reverse ? [W - M.r, M.l] : [M.l, W - M.r];
      const x = (config.x.log ? d3.scaleLog() : d3.scaleLinear()).domain(xd).range(xr).clamp(true);
      const y = (config.y.log ? d3.scaleLog() : d3.scaleLinear()).domain(yd).range([H - M.b, M.t]).clamp(true);
      const regions = typeof config.regions === "function" ? config.regions(ctx, xd, yd) : config.regions;
      regions.forEach((r) => {
        const x0 = x(r.x0), x1 = x(r.x1), y0 = y(r.y0), y1 = y(r.y1);
        svg.append("rect").attr("x", Math.min(x0, x1)).attr("y", Math.min(y0, y1)).attr("width", Math.abs(x1 - x0)).attr("height", Math.abs(y1 - y0))
          .attr("fill", r.fill || "#f4f4f4").attr("stroke", "#fff").attr("stroke-width", 2);
        if (r.label) {
          const tx = r.labelAt === "right" ? Math.max(x0, x1) - 8 : Math.min(x0, x1) + 8;
          svg.append("text").attr("x", tx).attr("y", Math.min(y0, y1) + 18).attr("text-anchor", r.labelAt === "right" ? "end" : "start")
            .attr("font-size", 12).attr("font-weight", 700).attr("fill", r.ink || TK.MUTED).text(r.label);
        }
      });
      const xAxis = config.x.log ? d3.axisBottom(x).tickValues(config.x.ticks || null).tickFormat(config.x.tickFormat || d3.format("~g")) : d3.axisBottom(x).ticks(6).tickFormat(config.x.tickFormat || null);
      const yAxis = config.y.log ? d3.axisLeft(y).tickFormat(config.y.tickFormat || d3.format("~g")) : d3.axisLeft(y).ticks(6).tickFormat(config.y.tickFormat || null);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(xAxis));
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(yAxis));
      svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 14).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK).text(config.x.label + (config.x.reverse ? " (high on the left)" : ""));
      svg.append("text").attr("transform", `translate(16,${(M.t + H - M.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK).text(config.y.label);
      (config.lines ? config.lines(ctx) : []).forEach((l) => {
        if (l.x !== undefined) svg.append("line").attr("x1", x(l.x)).attr("x2", x(l.x)).attr("y1", M.t).attr("y2", H - M.b).attr("stroke", TK.INK).attr("stroke-dasharray", "4 3");
        if (l.y !== undefined) svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(l.y)).attr("y2", y(l.y)).attr("stroke", TK.INK).attr("stroke-dasharray", "4 3");
      });
      if (!pts.length) {
        svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").attr("fill", TK.MUTED).text(`Add a ${config.itemLabel.toLowerCase()} to plot it`);
        return;
      }
      const maxSize = d3.max(pts, (p) => p.size || 0) || 1;
      const rs = d3.scaleSqrt().domain([0, maxSize]).range([0, config.sizeLabel ? 38 : 0]);
      const sorted = pts.map((p, k) => Object.assign({ k }, p)).sort((a, b) => (b.size || 0) - (a.size || 0));
      // Labels try above, below, right, then left of each bubble, and take
      // the first spot that overlaps no label already placed.
      const placed = [];
      const overlaps = (bx) => placed.some((o) => bx.x < o.x + o.w && bx.x + bx.w > o.x && bx.y < o.y + o.h && bx.y + bx.h > o.y);
      sorted.forEach((p) => {
        const r = config.sizeLabel ? Math.max(6, rs(p.size || 0)) : 7;
        const g = svg.append("g");
        g.append("circle").attr("cx", x(p.x)).attr("cy", y(p.y)).attr("r", r).attr("fill", TK.PALETTE[p.k % TK.PALETTE.length]).attr("fill-opacity", 0.75).attr("stroke", "#fff").attr("stroke-width", 1.5)
          .append("title").text(`${p.name}\n${config.x.label}: ${(config.x.format || ((v) => TK.fmt(v, 2)))(p.x)}\n${config.y.label}: ${(config.y.format || ((v) => TK.fmt(v, 2)))(p.y)}${config.sizeLabel ? `\n${config.sizeLabel}: ${TK.fmt(p.size || 0, 0)}` : ""}`);
        const tw = p.name.length * 6.1, cx = x(p.x), cy = y(p.y);
        const spots = [[cx, cy - r - 4, "middle"], [cx, cy + r + 13, "middle"], [cx + r + 4, cy + 4, "start"], [cx - r - 4, cy + 4, "end"], [cx, cy - r - 17, "middle"], [cx, cy + r + 26, "middle"]];
        const boxOf = ([lx, ly, anchor]) => ({ x: anchor === "middle" ? lx - tw / 2 : anchor === "end" ? lx - tw : lx, y: ly - 10, w: tw, h: 12 });
        const spot = spots.find((sp) => !overlaps(boxOf(sp))) || spots[0];
        placed.push(boxOf(spot));
        g.append("text").attr("x", spot[0]).attr("y", spot[1]).attr("text-anchor", spot[2]).attr("font-size", 11).attr("font-weight", 700).attr("fill", TK.INK)
          .attr("paint-order", "stroke").attr("stroke", "#fff").attr("stroke-width", 3).text(p.name);
      });
      if (config.sizeLabel) svg.append("text").attr("x", W - M.r).attr("y", H - 14).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text(`Bubble area: ${config.sizeLabel.toLowerCase()}`);
    }

    function renderAll() {
      titleEl.value = state.title || "";
      renderSettings();
      renderFactors();
      renderInput();
      renderOut();
    }
    renderAll();
  }

  window.BubbleMatrix = { mount };
})();
