/*
 * assets/js/toolkit/life-cycle.js
 *
 * Product Life Cycle Stage Identifier and Diffusion of Innovation
 * Adopter Calculator.
 *
 * Life cycle: fits a logistic curve S(t) = K / (1 + e^(-r(t - t0))) to
 * sales per period by grid search over r and t0, with K solved by least
 * squares at each step. The stage comes from how far the latest period
 * sits along the fitted curve, and from recent growth, since a logistic
 * curve cannot turn down and decline has to be read from the data.
 *
 * Diffusion: places a cumulative adoption share on Rogers' adopter
 * curve, and fits the Bass model to new adopters per period by the
 * ordinary least squares method of Bass (1969).
 *
 * Usage: window.LifeCycle.plc({ rootId }), window.LifeCycle.diffusion({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;

  function readSeries(text) {
    const rows = TK.parseCSV(text);
    const body = rows.length && !Number.isFinite(TK.num(rows[0][rows[0].length - 1])) ? rows.slice(1) : rows;
    return body.map((r, i) => ({ label: r.length > 1 ? r[0] : String(i + 1), v: TK.num(r[r.length - 1]) })).filter((d) => Number.isFinite(d.v));
  }

  // ---------------- Product life cycle ----------------
  const MIX = {
    Introduction: { product: "Core version, fix early faults fast", price: "Skim or penetration, chosen deliberately", place: "Selective, a few partners who can explain it", promotion: "Build awareness and trial among early buyers" },
    Growth: { product: "Add features, variants, and service", price: "Hold or trim to widen the market", place: "Expand distribution quickly", promotion: "Build preference over new competitors" },
    Maturity: { product: "Differentiate and refresh, cut weak variants", price: "Match or beat competitors, protect margin", place: "Intensive, defend shelf and listing space", promotion: "Stress differences and reward loyalty" },
    Decline: { product: "Prune the range, keep the profitable core", price: "Cut, or hold for a loyal niche", place: "Phase out unprofitable outlets", promotion: "Reduce to the level that keeps loyal buyers" }
  };
  const STAGE_COLOR = { Introduction: TK.PALETTE[0], Growth: TK.PALETTE[2], Maturity: TK.PALETTE[3], Decline: TK.PALETTE[1] };

  function fitLogistic(ys) {
    const n = ys.length, t = d3.range(n);
    let best = null;
    const rs = d3.range(60).map((i) => 0.03 * Math.pow(1.1, i));
    for (const r of rs) {
      for (let t0 = -n; t0 <= 2 * n; t0 += 0.25) {
        const g = t.map((ti) => 1 / (1 + Math.exp(-r * (ti - t0))));
        const K = d3.sum(g, (gi, i) => gi * ys[i]) / d3.sum(g, (gi) => gi * gi);
        if (!(K > 0)) continue;
        const sse = d3.sum(g, (gi, i) => (ys[i] - K * gi) ** 2);
        if (!best || sse < best.sse) best = { r, t0, K, sse };
      }
    }
    const ym = d3.mean(ys);
    best.r2 = 1 - best.sse / d3.sum(ys, (y) => (y - ym) ** 2);
    best.at = (ti) => best.K / (1 + Math.exp(-best.r * (ti - best.t0)));
    best.frac = (ti) => 1 / (1 + Math.exp(-best.r * (ti - best.t0)));
    // Periods where the curve reaches 10% and 80% of its ceiling.
    best.tIntro = best.t0 - Math.log(9) / best.r;
    best.tMature = best.t0 + Math.log(4) / best.r;
    return best;
  }

  function plc(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const SAMPLE = "quarter,bookings\n2023 Q1,40\n2023 Q2,55\n2023 Q3,80\n2023 Q4,120\n2024 Q1,190\n2024 Q2,280\n2024 Q3,390\n2024 Q4,500\n2025 Q1,610\n2025 Q2,690\n2025 Q3,750\n2025 Q4,790\n2026 Q1,815\n2026 Q2,828\n2026 Q3,832";
    root.innerHTML = `
      <p class="tk-help">One row per period, oldest first: a period label and sales for that period. Use at least 6 periods. The sample is quarterly bookings of serviced apartments at a hotel group.</p>
      <textarea class="tk-mono" rows="7" data-k="csv">${SAMPLE}</textarea>
      <div class="tk-row"><button type="button" class="toolkit-btn" data-a="run">Identify the stage</button><span class="tk-status" data-k="msg"></span></div>
      <div class="tk-report">
        <h3 class="tk-report-title">Product life cycle</h3>
        <div class="tk-kpis"></div>
        <div class="tk-chart-box plc-chart"></div>
        <h4>Marketing mix priorities for this stage</h4>
        <div class="tk-table-wrap"><table class="tk-table plc-mix"></table></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, "product-life-cycle"));
    root.querySelector('[data-a="run"]').addEventListener("click", run);

    function run() {
      const msg = root.querySelector('[data-k="msg"]');
      const data = readSeries(root.querySelector('[data-k="csv"]').value);
      if (data.length < 6) { TK.status(msg, "Enter at least 6 periods of sales."); return; }
      const ys = data.map((d) => d.v), n = ys.length;
      // Decline: the last two periods both fall more than 5%.
      const g = (i) => (ys[i - 1] > 0 ? ys[i] / ys[i - 1] - 1 : NaN);
      const peak = d3.maxIndex(ys);
      const declining = n >= 3 && g(n - 1) < -0.05 && g(n - 2) < -0.05;
      const fit = fitLogistic(declining ? ys.slice(0, peak + 1) : ys);
      const recent = TK.mean([g(n - 1), g(n - 2), g(n - 3)]);
      const f = fit.frac(n - 1);
      const stage = declining ? "Decline" : f < 0.1 ? "Introduction" : f < 0.8 && recent > 0.05 ? "Growth" : "Maturity";
      report.querySelector(".tk-kpis").innerHTML = [
        [stage, "Estimated stage"], [TK.fmtPct(recent, 1), "Mean growth, last 3 periods"],
        [declining ? "n/a" : TK.fmtPct(f, 0), "Share of fitted ceiling reached"], [TK.fmt(fit.r2, 2), "Curve fit (R²)"]
      ].map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      report.querySelector(".plc-mix").innerHTML = `<thead><tr><th>Product</th><th>Price</th><th>Place</th><th>Promotion</th></tr></thead><tbody><tr>${["product", "price", "place", "promotion"].map((k) => `<td>${MIX[stage][k]}</td>`).join("")}</tr></tbody>`;
      draw(data, fit, stage, declining ? peak : null);
    }

    function draw(data, fit, stage, peak) {
      const box = report.querySelector(".plc-chart");
      box.innerHTML = "";
      const n = data.length, ext = Math.ceil(n * 0.3);
      const W = 760, H = 380, M = { l: 60, r: 20, t: 30, b: 56 };
      const svg = TK.svg(box, W, H, "Sales per period with the fitted life cycle curve and stage bands");
      const x = d3.scaleLinear().domain([0, n - 1 + ext]).range([M.l, W - M.r]);
      const y = d3.scaleLinear().domain([0, Math.max(d3.max(data, (d) => d.v), fit.K) * 1.08]).nice().range([H - M.b, M.t]);
      const bands = [["Introduction", 0, fit.tIntro], ["Growth", fit.tIntro, fit.tMature], ["Maturity", fit.tMature, peak != null ? peak : n - 1 + ext]];
      if (peak != null) bands.push(["Decline", peak, n - 1 + ext]);
      bands.forEach(([name, a, b]) => {
        const x0 = x(Math.max(0, a)), x1 = x(Math.min(n - 1 + ext, b));
        if (x1 <= x0) return;
        svg.append("rect").attr("x", x0).attr("y", M.t).attr("width", x1 - x0).attr("height", H - M.b - M.t).attr("fill", STAGE_COLOR[name]).attr("fill-opacity", name === stage ? 0.16 : 0.06);
        svg.append("text").attr("x", (x0 + x1) / 2).attr("y", M.t - 10).attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", name === stage ? 700 : 400).attr("fill", TK.INK).text(name);
      });
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(Math.min(10, n + ext)).tickFormat((i) => (Number.isInteger(i) && i < n ? data[i].label : ""))))
        .selectAll("text").attr("transform", "rotate(-30)").attr("text-anchor", "end");
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6)));
      const curve = d3.range(0, n - 1 + ext + 0.01, 0.1).map((t) => [x(t), y(fit.at(t))]);
      svg.append("path").attr("d", d3.line()(curve)).attr("fill", "none").attr("stroke", TK.INK).attr("stroke-width", 2).attr("stroke-dasharray", "6 4");
      svg.append("path").attr("d", d3.line()(data.map((d, i) => [x(i), y(d.v)]))).attr("fill", "none").attr("stroke", TK.PALETTE[0]).attr("stroke-width", 2.5);
      data.forEach((d, i) => svg.append("circle").attr("cx", x(i)).attr("cy", y(d.v)).attr("r", i === n - 1 ? 7 : 3.5).attr("fill", i === n - 1 ? STAGE_COLOR[stage] : TK.PALETTE[0]).attr("stroke", "#fff").attr("stroke-width", 1.5)
        .append("title").text(`${d.label}: ${TK.fmt(d.v, 0)}`));
      svg.append("text").attr("x", x(n - 1)).attr("y", y(data[n - 1].v) - 14).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).text(`Now: ${stage}`);
      svg.append("text").attr("x", W - M.r).attr("y", H - 6).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text("Solid: actual sales. Dashed: fitted curve, extended forward.");
    }
    run();
  }

  // ---------------- Diffusion of innovations ----------------
  const ADOPTERS = [
    { label: "Innovators", from: 0, to: 0.025, z: [-4, -2], color: TK.PALETTE[6] },
    { label: "Early adopters", from: 0.025, to: 0.16, z: [-2, -1], color: TK.PALETTE[0] },
    { label: "Early majority", from: 0.16, to: 0.5, z: [-1, 0], color: TK.PALETTE[2] },
    { label: "Late majority", from: 0.5, to: 0.84, z: [0, 1], color: TK.PALETTE[3] },
    { label: "Laggards", from: 0.84, to: 1, z: [1, 4], color: TK.PALETTE[1] }
  ];
  const NEXT = {
    Innovators: "Win the next group, early adopters, with a clear advantage and visible use by respected peers.",
    "Early adopters": "Prepare to cross to the early majority: proof that it works, references, and a complete, easy offer.",
    "Early majority": "Reduce risk and effort for pragmatic buyers: standards, support, and social proof at scale.",
    "Late majority": "Lower the price and complexity, and show that most people already use it.",
    Laggards: "Serve with minimal cost, or plan the successor product."
  };

  function fitBass(news) {
    // n_t = a + b N_{t-1} + c N_{t-1}^2, with N the cumulative adopters before period t.
    let cum = 0;
    const X = [], y = [];
    news.forEach((v) => { X.push([1, cum, cum * cum]); y.push(v); cum += v; });
    const fit = TK.ols(X, y);
    if (!fit) return null;
    const [a, b, c] = fit.beta;
    if (!(c < 0)) return null;
    const m = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * c);
    const p = a / m, q = p + b;
    if (!(m > 0 && p > 0 && q > 0)) return null;
    const F = (t) => (1 - Math.exp(-(p + q) * t)) / (1 + (q / p) * Math.exp(-(p + q) * t));
    return { m, p, q, r2: fit.r2, F, peak: Math.log(q / p) / (p + q), cumTotal: cum };
  }

  function diffusion(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const SAMPLE = "quarter,new_users\n2024 Q1,11\n2024 Q2,15\n2024 Q3,21\n2024 Q4,28\n2025 Q1,36\n2025 Q2,45\n2025 Q3,53\n2025 Q4,58\n2026 Q1,60\n2026 Q2,57";
    root.innerHTML = `
      <div class="tk-split">
        <div class="tk-panel"><h3>Where are you now?</h3>
          <div class="tk-grid">
            <label>Adopters so far <input type="number" min="0" data-k="adopters" value="384"></label>
            <label>Market potential <input type="number" min="1" data-k="potential" value="900"></label>
          </div>
          <p class="tk-help">Adopters are customers who have taken up the product. Market potential is how many could eventually adopt. Fitting the Bass model below fills both in.</p>
        </div>
        <div class="tk-panel"><h3>Fit the Bass model</h3>
          <p class="tk-help">New adopters per period, oldest first. The sample is mobile check-in users (thousands) across a hotel group.</p>
          <textarea class="tk-mono" rows="6" data-k="csv">${SAMPLE}</textarea>
          <div class="tk-row"><button type="button" class="toolkit-btn" data-a="fit">Fit and use</button><span class="tk-status" data-k="msg"></span></div>
        </div>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title">Diffusion of innovations</h3>
        <div class="tk-kpis"></div>
        <h4>Rogers' adopter categories</h4>
        <div class="tk-chart-box dif-bell"></div>
        <div class="dif-bass-wrap"><h4>Bass model: new adopters per period</h4><div class="tk-chart-box dif-bass"></div><div class="tk-kpis dif-bass-kpis"></div></div>
      </div>`;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, "diffusion-of-innovations"));
    let bass = null, series = [];
    ["adopters", "potential"].forEach((k) => q(k).addEventListener("input", render));
    root.querySelector('[data-a="fit"]').addEventListener("click", fit);

    function fit() {
      const data = readSeries(q("csv").value);
      series = data;
      bass = data.length >= 4 ? fitBass(data.map((d) => d.v)) : null;
      if (!bass) {
        TK.status(q("msg"), "The Bass model did not fit. It needs at least 4 periods that rise and then begin to level off.");
      } else {
        q("adopters").value = Math.round(bass.cumTotal);
        q("potential").value = Math.round(bass.m);
        TK.status(q("msg"), "Fitted. Adopters and potential updated.");
      }
      render();
    }

    function render() {
      const a = TK.num(q("adopters").value), m = TK.num(q("potential").value);
      const share = Math.min(0.999, Math.max(0.001, a / m));
      const cat = ADOPTERS.find((c) => share < c.to) || ADOPTERS[4];
      report.querySelector(".tk-kpis").innerHTML = [
        [TK.fmtPct(share, 1), "Cumulative adoption"], [cat.label, "Now adopting"], [NEXT[cat.label], "Next move"]
      ].map(([v, l], i) => `<div class="tk-kpi"${i === 2 ? ' style="grid-column: span 2"' : ""}><span class="tk-kpi-v${i === 2 ? " tk-kpi-note" : ""}">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      drawBell(share);
      drawBass();
    }

    function drawBell(share) {
      const box = report.querySelector(".dif-bell");
      box.innerHTML = "";
      const W = 760, H = 300, M = { l: 20, r: 20, t: 40, b: 50 };
      const svg = TK.svg(box, W, H, "Normal adoption curve divided into Rogers' five adopter categories");
      const x = d3.scaleLinear().domain([-3.2, 3.2]).range([M.l, W - M.r]);
      const y = d3.scaleLinear().domain([0, 0.42]).range([H - M.b, M.t]);
      ADOPTERS.forEach((c) => {
        const zs = d3.range(Math.max(-3.2, c.z[0]), Math.min(3.2, c.z[1]) + 0.001, 0.02);
        const area = d3.area().x((z) => x(z)).y0(y(0)).y1((z) => y(TK.normPdf(z)));
        svg.append("path").attr("d", area(zs)).attr("fill", c.color).attr("fill-opacity", 0.35);
        const mid = (Math.max(-3.2, c.z[0]) + Math.min(3.2, c.z[1])) / 2;
        svg.append("text").attr("x", x(mid)).attr("y", H - M.b + 18).attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", 700).text(c.label);
        svg.append("text").attr("x", x(mid)).attr("y", H - M.b + 33).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text(TK.fmtPct(c.to - c.from, 1));
      });
      svg.append("path").attr("d", d3.line().x((z) => x(z)).y((z) => y(TK.normPdf(z)))(d3.range(-3.2, 3.21, 0.02))).attr("fill", "none").attr("stroke", TK.INK).attr("stroke-width", 2);
      const z = TK.normInv(share);
      svg.append("line").attr("x1", x(z)).attr("x2", x(z)).attr("y1", y(0)).attr("y2", M.t - 6).attr("stroke", TK.INK).attr("stroke-width", 2).attr("stroke-dasharray", "4 3");
      svg.append("text").attr("x", x(z)).attr("y", M.t - 12).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).text(`You are here: ${TK.fmtPct(share, 1)} adopted`);
    }

    function drawBass() {
      const wrap = report.querySelector(".dif-bass-wrap");
      if (!bass) { wrap.hidden = true; return; }
      wrap.hidden = false;
      const box = report.querySelector(".dif-bass");
      box.innerHTML = "";
      const n = series.length, T = Math.max(n + 4, Math.ceil(bass.peak * 2) + 1);
      const W = 760, H = 300, M = { l: 56, r: 20, t: 20, b: 40 };
      const svg = TK.svg(box, W, H, "New adopters per period with the fitted Bass model forecast");
      const pred = d3.range(T).map((t) => bass.m * (bass.F(t + 1) - bass.F(t)));
      const x = d3.scaleBand().domain(d3.range(T)).range([M.l, W - M.r]).padding(0.2);
      const y = d3.scaleLinear().domain([0, Math.max(d3.max(series, (d) => d.v), d3.max(pred)) * 1.1]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5)));
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).tickFormat((i) => (i < n ? series[i].label : "+" + (i - n + 1))).tickValues(d3.range(0, T, Math.ceil(T / 12)))));
      series.forEach((d, i) => svg.append("rect").attr("x", x(i)).attr("y", y(d.v)).attr("width", x.bandwidth()).attr("height", y(0) - y(d.v)).attr("fill", TK.PALETTE[0]).attr("fill-opacity", 0.7)
        .append("title").text(`${d.label}: ${TK.fmt(d.v, 0)}`));
      svg.append("path").attr("d", d3.line().x((v, i) => x(i) + x.bandwidth() / 2).y((v) => y(v))(pred)).attr("fill", "none").attr("stroke", TK.INK).attr("stroke-width", 2).attr("stroke-dasharray", "6 4");
      svg.append("text").attr("x", W - M.r).attr("y", 14).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text("Bars: actual. Dashed line: Bass model, with periods after the data marked +1, +2");
      report.querySelector(".dif-bass-kpis").innerHTML = [
        [TK.fmt(bass.p, 4), "p, innovation coefficient"], [TK.fmt(bass.q, 3), "q, imitation coefficient"],
        [TK.fmtInt(bass.m), "m, market potential"], [`period ${TK.fmt(bass.peak + 1, 1)}`, "Peak adoption"], [TK.fmt(bass.r2, 2), "Fit (R²)"]
      ].map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
    }
    fit();
  }

  window.LifeCycle = { plc, diffusion };
})();
