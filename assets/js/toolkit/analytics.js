/*
 * assets/js/toolkit/analytics.js
 *
 * Performance and analytics tools: Customer Lifetime Value Calculator,
 * Price Elasticity Calculator, Net Promoter Score Tracker, and the
 * Marketing Attribution Comparison. Each shows its formula on the page it
 * is mounted in, and every calculation runs in the browser.
 *
 * Usage: window.Analytics.<tool>({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;
  const el = (root, k) => root.querySelector(`[data-k="${k}"]`);
  const tiles = (items) => items.map(([v, l, cls]) => `<div class="tk-kpi"><span class="tk-kpi-v ${cls || ""}">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
  function inputs(fields) {
    return `<div class="tk-grid">${fields.map(([k, l, v, step]) => `<label>${l}<input type="number" data-k="${k}" value="${v}" step="${step || "any"}"></label>`).join("")}</div>`;
  }

  // ---------------- CLV ----------------
  function clv(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    root.innerHTML = inputs([["aov", "Average order value", 420], ["freq", "Purchases per year", 2.4, 0.1], ["margin", "Gross margin (%)", 38, 1],
      ["retain", "Customers retained each year (%)", 62, 1], ["disc", "Discount rate (%)", 8, 0.5], ["years", "Horizon (years)", 5, 1], ["cac", "Cost to acquire a customer", 180]]) +
      `<div class="tk-report"><h3 class="tk-report-title">Customer lifetime value</h3><div class="tk-kpis" data-k="tiles"></div>
        <h4>Cumulative value of one new customer</h4><div class="tk-chart-box" data-k="chart"></div>
        <div class="tk-table-wrap"><table class="tk-table" data-k="table"></table></div></div>`;
    root.appendChild(TK.exportRow(root.querySelector(".tk-report"), "customer-lifetime-value"));
    function update() {
      const v = (k) => TK.num(el(root, k).value, 0);
      const m = v("aov") * v("freq") * v("margin") / 100;
      const r = Math.min(0.99, v("retain") / 100), d = v("disc") / 100, T = Math.max(1, Math.round(v("years"))), cac = v("cac");
      const rows = d3.range(T).map((t) => ({ t: t + 1, alive: Math.pow(r, t), value: m * Math.pow(r, t) / Math.pow(1 + d, t) }));
      let cum = 0;
      rows.forEach((x) => (x.cum = cum += x.value));
      const horizon = cum, infinite = m * (1 + d) / (1 + d - r), simple = m / (1 - r);
      const monthly = m / 12, payback = monthly > 0 ? cac / monthly : NaN;
      el(root, "tiles").innerHTML = tiles([[TK.fmtMoney(horizon), `CLV over ${T} years, discounted`], [TK.fmtMoney(infinite), "CLV with no horizon, discounted"],
        [TK.fmtMoney(simple), "Simple CLV, undiscounted"], [cac > 0 ? TK.fmt(horizon / cac, 1) + " : 1" : "n/a", "CLV to CAC", cac > 0 && horizon / cac >= 3 ? "tk-pos" : "tk-neg"],
        [Number.isFinite(payback) ? TK.fmt(payback, 1) + " months" : "n/a", "Months to recover CAC"], [TK.fmt(1 / (1 - r), 1) + " years", "Expected customer lifetime"]]);
      el(root, "table").innerHTML = `<thead><tr><th>Year</th><th class="tk-num">Still a customer</th><th class="tk-num">Margin that year</th><th class="tk-num">Discounted value</th><th class="tk-num">Cumulative</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${x.t}</td><td class="tk-num">${TK.fmtPct(x.alive, 0)}</td><td class="tk-num">${TK.fmtMoney(m * x.alive)}</td><td class="tk-num">${TK.fmtMoney(x.value)}</td><td class="tk-num">${TK.fmtMoney(x.cum)}</td></tr>`).join("")}</tbody>`;
      const box = el(root, "chart");
      box.innerHTML = "";
      const W = 760, H = 300, M = { l: 70, r: 20, t: 20, b: 40 };
      const svg = TK.svg(box, W, H, "Cumulative discounted value per customer by year, against acquisition cost");
      const x = d3.scaleBand().domain(rows.map((x) => x.t)).range([M.l, W - M.r]).padding(0.3);
      const y = d3.scaleLinear().domain([0, Math.max(horizon, cac) * 1.1]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).tickFormat((t) => "Year " + t)));
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5)));
      rows.forEach((row, i) => {
        const base = i ? rows[i - 1].cum : 0;
        svg.append("rect").attr("x", x(row.t)).attr("y", y(row.cum)).attr("width", x.bandwidth()).attr("height", y(base) - y(row.cum)).attr("fill", TK.PALETTE[0]);
        if (i) svg.append("rect").attr("x", x(row.t)).attr("y", y(base)).attr("width", x.bandwidth()).attr("height", y(0) - y(base)).attr("fill", TK.PALETTE[0]).attr("fill-opacity", 0.3);
        svg.append("text").attr("x", x(row.t) + x.bandwidth() / 2).attr("y", y(row.cum) - 6).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.INK).text(TK.fmtMoney(row.cum));
      });
      if (cac > 0) {
        svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(cac)).attr("y2", y(cac)).attr("stroke", TK.BAD).attr("stroke-dasharray", "5 4").attr("stroke-width", 2);
        svg.append("text").attr("x", W - M.r).attr("y", y(cac) - 6).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.BAD).text(`Acquisition cost ${TK.fmtMoney(cac)}`);
      }
    }
    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  }

  // ---------------- Price elasticity ----------------
  function elasticity(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    root.innerHTML = inputs([["p1", "Price before", 165, 0.01], ["q1", "Units sold before", 1200, 1], ["p2", "Price after", 179, 0.01], ["q2", "Units sold after", 1050, 1], ["cost", "Variable cost per unit (optional)", 62, 0.01]]) +
      `<div class="tk-report"><h3 class="tk-report-title">Price elasticity of demand</h3><div class="tk-kpis" data-k="tiles"></div><p data-k="verdict"></p>
        <div class="tk-split"><div><h4>Demand</h4><div data-k="demand"></div></div><div><h4>Revenue and profit by price</h4><div data-k="rev"></div></div></div></div>`;
    root.appendChild(TK.exportRow(root.querySelector(".tk-report"), "price-elasticity"));
    function update() {
      const v = (k) => TK.num(el(root, k).value);
      const p1 = v("p1"), q1 = v("q1"), p2 = v("p2"), q2 = v("q2"), c = TK.num(el(root, "cost").value, 0);
      if (!(p1 > 0 && p2 > 0 && q1 >= 0 && q2 >= 0) || p1 === p2) { el(root, "tiles").innerHTML = `<p class="tk-warn">Enter two different prices and the units sold at each.</p>`; return; }
      const arc = ((q2 - q1) / ((q1 + q2) / 2)) / ((p2 - p1) / ((p1 + p2) / 2));
      const point = ((q2 - q1) / q1) / ((p2 - p1) / p1);
      const kind = Math.abs(arc) > 1.05 ? "Elastic" : Math.abs(arc) < 0.95 ? "Inelastic" : "Unit elastic";
      const b = (q1 - q2) / (p2 - p1), a = q1 + b * p1; // Q = a - bP
      const pRev = b > 0 ? a / (2 * b) : NaN, pProf = b > 0 ? (a + b * c) / (2 * b) : NaN;
      el(root, "tiles").innerHTML = tiles([[TK.fmt(arc, 2), "Arc elasticity"], [TK.fmt(point, 2), "Point elasticity from the first price"], [kind, "Demand is"],
        [TK.fmtMoney(p2 * q2 - p1 * q1), "Change in revenue"], [c ? TK.fmtMoney((p2 - c) * q2 - (p1 - c) * q1) : "n/a", "Change in contribution"],
        [b > 0 ? TK.fmt(c ? pProf : pRev, 2) : "n/a", c ? "Profit-maximising price, linear demand" : "Revenue-maximising price, linear demand"]]);
      el(root, "verdict").innerHTML = kind === "Elastic" ? "Buyers are price sensitive here. A price rise loses proportionally more volume than it gains in price, so revenue falls." :
        kind === "Inelastic" ? "Buyers are not very price sensitive here. A price rise loses proportionally less volume than it gains in price, so revenue rises." : "Revenue barely changes with price in this range.";
      const lo = Math.max(0.01, Math.min(p1, p2) * 0.6), hi = Math.max(p1, p2) * 1.4, prices = d3.range(lo, hi, (hi - lo) / 80);
      const qAt = (p) => Math.max(0, a - b * p);
      // Demand chart.
      const W = 380, H = 260, M = { l: 54, r: 14, t: 14, b: 38 };
      let box = el(root, "demand"); box.innerHTML = "";
      let svg = TK.svg(box, W, H, "Linear demand line through the two observed points");
      let x = d3.scaleLinear().domain([lo, hi]).range([M.l, W - M.r]);
      let y = d3.scaleLinear().domain([0, d3.max(prices, qAt) * 1.05]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5)));
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5)));
      svg.append("path").attr("d", d3.line().x((p) => x(p)).y((p) => y(qAt(p)))(prices)).attr("fill", "none").attr("stroke", TK.MUTED).attr("stroke-dasharray", "5 4");
      [[p1, q1, "Before"], [p2, q2, "After"]].forEach(([p, q, l], i) => {
        svg.append("circle").attr("cx", x(p)).attr("cy", y(q)).attr("r", 6).attr("fill", TK.PALETTE[i]);
        svg.append("text").attr("x", x(p) + 9).attr("y", y(q) - 8).attr("font-size", 11).attr("font-weight", 700).text(l);
      });
      svg.append("text").attr("x", (M.l + W) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text("Price");
      svg.append("text").attr("transform", `translate(12,${H / 2}) rotate(-90)`).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text("Units");
      // Revenue and profit chart.
      box = el(root, "rev"); box.innerHTML = "";
      svg = TK.svg(box, W, H, "Revenue and contribution at each price under linear demand");
      x = d3.scaleLinear().domain([lo, hi]).range([M.l, W - M.r]);
      const rev = (p) => p * qAt(p), prof = (p) => (p - c) * qAt(p);
      y = d3.scaleLinear().domain([Math.min(0, d3.min(prices, prof)), d3.max(prices, rev) * 1.08]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5)));
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))));
      svg.append("path").attr("d", d3.line().x((p) => x(p)).y((p) => y(rev(p)))(prices)).attr("fill", "none").attr("stroke", TK.PALETTE[0]).attr("stroke-width", 2.5);
      if (c) svg.append("path").attr("d", d3.line().x((p) => x(p)).y((p) => y(prof(p)))(prices)).attr("fill", "none").attr("stroke", TK.PALETTE[2]).attr("stroke-width", 2.5);
      [[pRev, rev, TK.PALETTE[0], "Revenue peak"], c ? [pProf, prof, TK.PALETTE[2], "Profit peak"] : null].filter(Boolean).forEach(([p, f, col, l]) => {
        if (!(p > lo && p < hi)) return;
        svg.append("circle").attr("cx", x(p)).attr("cy", y(f(p))).attr("r", 5).attr("fill", col);
        svg.append("text").attr("x", x(p)).attr("y", y(f(p)) - 9).attr("text-anchor", "middle").attr("font-size", 10).attr("fill", col).text(`${l} at ${TK.fmt(p, 0)}`);
      });
      svg.append("text").attr("x", (M.l + W) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text(c ? "Price. Blue: revenue. Green: contribution." : "Price. Blue: revenue.");
    }
    root.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  }

  // ---------------- NPS ----------------
  function nps(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const KEY = "flairmi-nps-v1";
    const SAMPLE = [{ label: "2026 Q1", p: 212, pa: 138, d: 95 }, { label: "2026 Q2", p: 240, pa: 131, d: 88 }, { label: "2026 Q3", p: 251, pa: 140, d: 72 }];
    let waves = TK.store.get(KEY, null) || SAMPLE.slice();
    root.innerHTML = `
      <div class="tk-panel"><h3>Add a survey wave</h3>
        <div class="tk-grid">
          <label>Wave label <input type="text" data-k="label" value="2026 Q4"></label>
          <label>Promoters (9 to 10) <input type="number" min="0" data-k="p"></label>
          <label>Passives (7 to 8) <input type="number" min="0" data-k="pa"></label>
          <label>Detractors (0 to 6) <input type="number" min="0" data-k="d"></label>
        </div>
        <label>Or paste raw scores from 0 to 10, separated by commas, spaces, or new lines <textarea class="tk-mono" rows="3" data-k="raw" placeholder="10, 9, 7, 3, 8, 10"></textarea></label>
        <div class="tk-row"><button type="button" class="toolkit-btn" data-a="add">Add wave</button><button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button><button type="button" class="toolkit-btn secondary" data-a="clear">Clear all waves</button><span class="tk-status" data-k="msg"></span></div>
      </div>
      <div class="tk-report"><h3 class="tk-report-title">Net Promoter Score</h3><div class="tk-kpis" data-k="tiles"></div>
        <h4>Trend with 95% confidence interval</h4><div class="tk-chart-box" data-k="trend"></div>
        <h4>Promoters, passives, and detractors by wave</h4><div class="tk-chart-box" data-k="stack"></div>
        <div class="tk-table-wrap"><table class="tk-table" data-k="table"></table></div></div>`;
    root.appendChild(TK.exportRow(root.querySelector(".tk-report"), "nps-tracker"));
    const save = () => TK.store.set(KEY, waves);
    function stats(w) {
      const n = w.p + w.pa + w.d, pp = w.p / n, pd = w.d / n, score = (pp - pd) * 100;
      const se = Math.sqrt((pp + pd - (pp - pd) ** 2) / n) * 100;
      return { n, pp, pd, pa: w.pa / n, score, lo: score - 1.96 * se, hi: score + 1.96 * se, moe: 1.96 * se };
    }
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      const msg = el(root, "msg");
      if (a.dataset.a === "add") {
        let p = TK.num(el(root, "p").value, 0), pa = TK.num(el(root, "pa").value, 0), d = TK.num(el(root, "d").value, 0);
        const raw = el(root, "raw").value.split(/[\s,;]+/).map((x) => TK.num(x)).filter((x) => Number.isFinite(x) && x >= 0 && x <= 10);
        if (raw.length) { p = raw.filter((x) => x >= 9).length; pa = raw.filter((x) => x >= 7 && x <= 8).length; d = raw.filter((x) => x <= 6).length; }
        if (p + pa + d < 1) { TK.status(msg, "Enter counts or paste scores."); return; }
        waves.push({ label: el(root, "label").value || `Wave ${waves.length + 1}`, p, pa, d });
        ["p", "pa", "d", "raw"].forEach((k) => (el(root, k).value = ""));
        TK.status(msg, "Wave added.");
      }
      if (a.dataset.a === "sample") waves = SAMPLE.slice();
      if (a.dataset.a === "clear") waves = [];
      save();
      render();
    });
    function render() {
      const s = waves.map((w) => Object.assign({ w }, stats(w)));
      const last = s[s.length - 1], prev = s[s.length - 2];
      el(root, "tiles").innerHTML = last ? tiles([[(last.score > 0 ? "+" : "") + TK.fmt(last.score, 0), `NPS, ${TK.esc(last.w.label)}`], [`±${TK.fmt(last.moe, 1)}`, "Margin of error, 95%"],
        [prev ? (last.score - prev.score > 0 ? "+" : "") + TK.fmt(last.score - prev.score, 0) : "n/a", "Change on the previous wave"],
        [prev ? (Math.abs(last.score - prev.score) > Math.sqrt(last.moe ** 2 + prev.moe ** 2) ? "Yes" : "No") : "n/a", "Change larger than the combined margin of error"],
        [TK.fmtInt(last.n), "Responses"]]) : `<p class="tk-help">Add a wave to calculate the score.</p>`;
      el(root, "table").innerHTML = s.length ? `<thead><tr><th>Wave</th><th class="tk-num">Responses</th><th class="tk-num">Promoters</th><th class="tk-num">Passives</th><th class="tk-num">Detractors</th><th class="tk-num">NPS</th><th class="tk-num">95% interval</th><th></th></tr></thead><tbody>${s.map((x, i) => `<tr><td>${TK.esc(x.w.label)}</td><td class="tk-num">${x.n}</td><td class="tk-num">${TK.fmtPct(x.pp, 0)}</td><td class="tk-num">${TK.fmtPct(x.pa, 0)}</td><td class="tk-num">${TK.fmtPct(x.pd, 0)}</td><td class="tk-num"><strong>${TK.fmt(x.score, 0)}</strong></td><td class="tk-num">${TK.fmt(x.lo, 0)} to ${TK.fmt(x.hi, 0)}</td><td><button type="button" class="scored-item-remove" data-rm="${i}" aria-label="Remove wave">&times;</button></td></tr>`).join("")}</tbody>` : "";
      el(root, "table").querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { waves.splice(Number(b.dataset.rm), 1); save(); render(); }));
      drawTrend(s);
      drawStack(s);
    }
    function drawTrend(s) {
      const box = el(root, "trend");
      box.innerHTML = "";
      if (!s.length) return;
      const W = 760, H = 260, M = { l: 50, r: 20, t: 20, b: 36 };
      const svg = TK.svg(box, W, H, "NPS by wave with confidence band");
      const x = d3.scalePoint().domain(s.map((d, i) => i)).range([M.l, W - M.r]).padding(0.5);
      const y = d3.scaleLinear().domain([Math.min(-10, d3.min(s, (d) => d.lo) - 5), Math.max(10, d3.max(s, (d) => d.hi) + 5)]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6)));
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).tickFormat((i) => s[i].w.label)));
      svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", TK.MUTED);
      svg.append("path").attr("d", d3.area().x((d, i) => x(i)).y0((d) => y(d.lo)).y1((d) => y(d.hi))(s)).attr("fill", TK.PALETTE[0]).attr("fill-opacity", 0.15);
      svg.append("path").attr("d", d3.line().x((d, i) => x(i)).y((d) => y(d.score))(s)).attr("fill", "none").attr("stroke", TK.PALETTE[0]).attr("stroke-width", 2.5);
      s.forEach((d, i) => {
        svg.append("circle").attr("cx", x(i)).attr("cy", y(d.score)).attr("r", 5).attr("fill", TK.PALETTE[0]);
        svg.append("text").attr("x", x(i)).attr("y", y(d.score) - 10).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).text(TK.fmt(d.score, 0));
      });
    }
    function drawStack(s) {
      const box = el(root, "stack");
      box.innerHTML = "";
      if (!s.length) return;
      const W = 760, H = 30 + s.length * 34, M = { l: 80, r: 20, t: 10, b: 20 };
      const svg = TK.svg(box, W, H, "Share of promoters, passives, and detractors in each wave");
      const x = d3.scaleLinear().domain([0, 1]).range([M.l, W - M.r]);
      const parts = [["pd", "Detractors", TK.BAD], ["pa", "Passives", "#c9c9c9"], ["pp", "Promoters", TK.GOOD]];
      s.forEach((d, i) => {
        let acc = 0;
        const y0 = M.t + i * 34;
        svg.append("text").attr("x", M.l - 8).attr("y", y0 + 17).attr("text-anchor", "end").attr("font-size", 12).text(d.w.label);
        parts.forEach(([k, l, c]) => {
          svg.append("rect").attr("x", x(acc)).attr("y", y0 + 3).attr("width", x(acc + d[k]) - x(acc)).attr("height", 22).attr("fill", c).append("title").text(`${l}: ${TK.fmtPct(d[k], 0)}`);
          if (d[k] > 0.07) svg.append("text").attr("x", x(acc + d[k] / 2)).attr("y", y0 + 18).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", k === "pa" ? TK.INK : "#fff").text(`${l} ${TK.fmtPct(d[k], 0)}`);
          acc += d[k];
        });
      });
    }
    render();
  }

  // ---------------- Attribution comparison ----------------
  const MODELS = [
    { id: "last", label: "Last click" }, { id: "first", label: "First click" }, { id: "linear", label: "Linear" },
    { id: "decay", label: "Time decay" }, { id: "position", label: "Position-based" }];
  function weights(model, k, half) {
    if (k === 1) return [1];
    if (model === "last") return d3.range(k).map((i) => (i === k - 1 ? 1 : 0));
    if (model === "first") return d3.range(k).map((i) => (i === 0 ? 1 : 0));
    if (model === "linear") return d3.range(k).map(() => 1 / k);
    if (model === "decay") {
      const w = d3.range(k).map((i) => Math.pow(2, -(k - 1 - i) / half));
      const s = d3.sum(w);
      return w.map((x) => x / s);
    }
    if (k === 2) return [0.5, 0.5];
    return d3.range(k).map((i) => (i === 0 || i === k - 1 ? 0.4 : 0.2 / (k - 2)));
  }
  function attribution(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const SAMPLE = `path,conversions,value
Search > Direct,310,52700
Social > Search > Direct,180,30600
Social > Email > Direct,95,17100
Email > Direct,140,21000
Partners > Search > Email > Direct,70,14000
Social > Social > Search,120,19200
Display > Social > Search > Email,60,10800
Partners,85,15300
Search,260,39000
Display > Search,75,11250`;
    root.innerHTML = `
      <p class="tk-help">One row per conversion path: the channels in order, separated by &gt;, then the number of conversions and their value. The sample is hotel bookings.</p>
      <textarea class="tk-mono" rows="8" data-k="csv">${SAMPLE}</textarea>
      <div class="tk-grid"><label>Time-decay half-life, in touches <input type="number" min="0.5" step="0.5" data-k="half" value="1"></label>
        <label>Measure <select data-k="measure"><option value="conv">Conversions</option><option value="value">Value</option></select></label></div>
      <div class="tk-row"><button type="button" class="toolkit-btn" data-a="run">Compare models</button><span class="tk-status" data-k="msg"></span></div>
      <div class="tk-report"><h3 class="tk-report-title">Attribution by model</h3><div class="tk-kpis" data-k="tiles"></div>
        <div class="tk-chart-box" data-k="chart"></div><div class="tk-table-wrap"><table class="tk-table" data-k="table"></table></div></div>`;
    root.appendChild(TK.exportRow(root.querySelector(".tk-report"), "attribution-comparison"));
    root.querySelector('[data-a="run"]').addEventListener("click", run);
    el(root, "measure").addEventListener("change", run);
    el(root, "half").addEventListener("change", run);
    function run() {
      const rows = TK.parseCSV(el(root, "csv").value);
      const body = rows.length && !Number.isFinite(TK.num(rows[0][1])) ? rows.slice(1) : rows;
      const paths = body.map((r) => ({ steps: String(r[0]).split(">").map((s) => s.trim()).filter(Boolean), conv: TK.num(r[1], 0), value: TK.num(r[2], 0) })).filter((p) => p.steps.length && p.conv > 0);
      if (!paths.length) { TK.status(el(root, "msg"), "Paste paths with conversions."); return; }
      const half = Math.max(0.5, TK.num(el(root, "half").value, 1)), measure = el(root, "measure").value;
      const channels = Array.from(new Set(paths.flatMap((p) => p.steps)));
      const credit = {};
      MODELS.forEach((m) => {
        credit[m.id] = Object.fromEntries(channels.map((c) => [c, 0]));
        paths.forEach((p) => weights(m.id, p.steps.length, half).forEach((w, i) => (credit[m.id][p.steps[i]] += w * (measure === "value" ? p.value : p.conv))));
      });
      const total = d3.sum(paths, (p) => (measure === "value" ? p.value : p.conv));
      const tops = MODELS.map((m) => channels.slice().sort((a, b) => credit[m.id][b] - credit[m.id][a])[0]);
      const swing = channels.map((c) => { const v = MODELS.map((m) => credit[m.id][c] / total); return { c, spread: d3.max(v) - d3.min(v) }; }).sort((a, b) => b.spread - a.spread)[0];
      el(root, "tiles").innerHTML = tiles([[TK.fmtInt(total), measure === "value" ? "Total value" : "Total conversions"], [String(channels.length), "Channels"],
        [new Set(tops).size === 1 ? tops[0] : "Depends on the model", "Top channel"], [`${swing.c}, ${TK.fmt(swing.spread * 100, 0)} pts`, "Most model-sensitive channel"]]);
      el(root, "table").innerHTML = `<thead><tr><th>Channel</th>${MODELS.map((m) => `<th class="tk-num">${m.label}</th>`).join("")}</tr></thead><tbody>${channels.map((c) => `<tr><td>${TK.esc(c)}</td>${MODELS.map((m, i) => `<td class="tk-num">${tops[i] === c ? "<strong>" : ""}${TK.fmtInt(credit[m.id][c])} (${TK.fmtPct(credit[m.id][c] / total, 0)})${tops[i] === c ? "</strong>" : ""}</td>`).join("")}</tr>`).join("")}</tbody>`;
      const box = el(root, "chart");
      box.innerHTML = "";
      const W = 760, H = 340, M = { l: 50, r: 20, t: 30, b: 50 };
      const svg = TK.svg(box, W, H, "Share of credit for each channel under each attribution model");
      const x0 = d3.scaleBand().domain(channels).range([M.l, W - M.r]).padding(0.2);
      const x1 = d3.scaleBand().domain(MODELS.map((m) => m.id)).range([0, x0.bandwidth()]).padding(0.08);
      const y = d3.scaleLinear().domain([0, d3.max(MODELS, (m) => d3.max(channels, (c) => credit[m.id][c] / total))]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%"))));
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x0)));
      channels.forEach((c) => MODELS.forEach((m, i) => {
        const v = credit[m.id][c] / total;
        svg.append("rect").attr("x", x0(c) + x1(m.id)).attr("y", y(v)).attr("width", x1.bandwidth()).attr("height", y(0) - y(v)).attr("fill", TK.PALETTE[i]).append("title").text(`${c}, ${m.label}: ${TK.fmtPct(v, 1)}`);
      }));
      MODELS.forEach((m, i) => {
        svg.append("rect").attr("x", M.l + i * 130).attr("y", 6).attr("width", 11).attr("height", 11).attr("fill", TK.PALETTE[i]);
        svg.append("text").attr("x", M.l + i * 130 + 16).attr("y", 16).attr("font-size", 11).text(m.label);
      });
      TK.status(el(root, "msg"), `${paths.length} paths compared.`);
    }
    run();
  }

  window.Analytics = { clv, elasticity, nps, attribution };
})();
