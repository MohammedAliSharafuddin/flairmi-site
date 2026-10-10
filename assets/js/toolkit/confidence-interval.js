/*
 * assets/js/toolkit/confidence-interval.js
 *
 * Confidence Interval and Sample Size Calculator with a Central Limit
 * Theorem simulator. Mean intervals use the t distribution, proportion
 * intervals show both the Wald and the Wilson score interval, and sample
 * sizes use the normal quantile. The simulator treats a column of
 * event-survey-data.csv as the population, draws repeated samples with
 * replacement and plots the sampling distribution of the mean.
 *
 * The t quantile is computed here: Student's t CDF from the regularised
 * incomplete beta function (continued fraction, Lentz's method), inverted by
 * bisection. R/test_toolkit_data_tools.R checks it against R's qt().
 *
 * Usage: window.ConfInt.mount("ci-app").
 */
(function () {
  "use strict";
  const TK = window.TK;
  const VARS = ["Satisfaction", "Spending", "Waiting_Time_Mins"];

  // ---------- distributions ----------
  function lgamma(x) {
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    const FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
  }
  function tCdf(t, df) {
    const p = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);
    return t >= 0 ? 1 - p : p;
  }
  function tInv(p, df) {
    if (p <= 0 || p >= 1 || !(df > 0)) return NaN;
    if (p < 0.5) return -tInv(1 - p, df);
    let lo = 0, hi = 1;
    while (tCdf(hi, df) < p) hi *= 2;
    for (let i = 0; i < 200 && hi - lo > 1e-13; i++) {
      const mid = (lo + hi) / 2;
      if (tCdf(mid, df) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ---------- intervals and sample sizes ----------
  function meanCI(n, mean, sd, conf) {
    const se = sd / Math.sqrt(n), t = tInv(1 - (1 - conf) / 2, n - 1), moe = t * se;
    return { n, mean, sd, se, t, moe, lo: mean - moe, hi: mean + moe };
  }
  function propCI(x, n, conf) {
    const p = x / n, z = TK.normInv(1 - (1 - conf) / 2), se = Math.sqrt((p * (1 - p)) / n);
    const den = 1 + (z * z) / n, centre = (p + (z * z) / (2 * n)) / den;
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
    return { p, n, x, z, se, wald: { lo: p - z * se, hi: p + z * se, moe: z * se }, wilson: { lo: centre - half, hi: centre + half } };
  }
  function fpc(n0, N) {
    return N > 0 ? Math.ceil(n0 / (1 + (n0 - 1) / N)) : n0;
  }
  function nMean(sd, E, conf, N) {
    const z = TK.normInv(1 - (1 - conf) / 2);
    return fpc(Math.ceil(Math.pow((z * sd) / E, 2) - 1e-9), N);
  }
  function nProp(p, E, conf, N) {
    const z = TK.normInv(1 - (1 - conf) / 2);
    return fpc(Math.ceil((z * z * p * (1 - p)) / (E * E) - 1e-9), N);
  }
  // Repeated samples with replacement from a population of values.
  function simulate(pop, n, reps, seed, conf) {
    const r = window.TKData.rng(seed), N = pop.length, mu = TK.mean(pop);
    const tq = tInv(1 - (1 - conf) / 2, n - 1);
    const means = [];
    let covered = 0;
    for (let k = 0; k < reps; k++) {
      let s = 0, ss = 0;
      const draw = [];
      for (let i = 0; i < n; i++) { const v = pop[Math.floor(r() * N)]; draw.push(v); s += v; }
      const m = s / n;
      draw.forEach((v) => (ss += (v - m) * (v - m)));
      const se = Math.sqrt(ss / (n - 1)) / Math.sqrt(n);
      if (Math.abs(m - mu) <= tq * se) covered++;
      means.push(m);
    }
    return { means, mu, coverage: covered / reps };
  }

  // ---------- drawing ----------
  // Charts draw at their box width, so text keeps its size on a phone.
  function fitW(box) {
    return Math.max(300, Math.min(760, box.clientWidth || 760));
  }
  function intervalChart(box, rows, unit) {
    box.innerHTML = "";
    const W = fitW(box), rowH = 46, M = { l: W < 520 ? 64 : 150, r: 30, t: 14, b: 34 }, H = M.t + M.b + rows.length * rowH;
    const svg = TK.svg(box, W, H, "Confidence interval on a number line");
    const lo = d3.min(rows, (r) => r.lo), hi = d3.max(rows, (r) => r.hi), pad = (hi - lo) * 0.25 || 1;
    const x = d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range([M.l, W - M.r]);
    TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(W < 520 ? 4 : 6).tickFormat(unit === "%" ? (d) => d3.format(".0%")(d) : null)));
    rows.forEach((r, i) => {
      const y = M.t + i * rowH + rowH / 2, c = TK.PALETTE[i % TK.PALETTE.length];
      svg.append("text").attr("x", M.l - 10).attr("y", y + 4).attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK).text(r.label);
      svg.append("line").attr("x1", x(r.lo)).attr("x2", x(r.hi)).attr("y1", y).attr("y2", y).attr("stroke", c).attr("stroke-width", 4);
      [r.lo, r.hi].forEach((v) => svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", y - 9).attr("y2", y + 9).attr("stroke", c).attr("stroke-width", 2));
      svg.append("circle").attr("cx", x(r.est)).attr("cy", y).attr("r", 6).attr("fill", TK.INK);
      const f = (v) => (unit === "%" ? TK.fmtPct(v, 1) : TK.fmt(v, 2));
      svg.append("text").attr("x", x(r.lo)).attr("y", y - 13).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text(f(r.lo));
      svg.append("text").attr("x", x(r.hi)).attr("y", y - 13).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text(f(r.hi));
    });
  }
  function histogram(box, values, opts) {
    box.innerHTML = "";
    const W = fitW(box), H = opts.h || 280, M = { l: 20, r: 20, t: 26, b: 40 };
    const svg = TK.svg(box, W, H, opts.label);
    const ext = opts.domain || d3.extent(values);
    const x = d3.scaleLinear().domain(ext).nice().range([M.l, W - M.r]);
    // d3.bin can return an empty last bin of zero width, which would divide by 0.
    const bins = d3.bin().domain(x.domain()).thresholds(x.ticks(opts.bins || 30))(values).filter((b) => b.x1 > b.x0);
    const dens = bins.map((b) => b.length / values.length / (b.x1 - b.x0));
    let ymax = d3.max(dens);
    if (opts.normal) ymax = Math.max(ymax, TK.normPdf(0) / opts.normal.sd);
    const y = d3.scaleLinear().domain([0, ymax * 1.08]).range([H - M.b, M.t]);
    TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(W < 520 ? 4 : 8)));
    bins.forEach((b, i) => svg.append("rect").attr("x", x(b.x0) + 0.5).attr("y", y(dens[i])).attr("width", Math.max(0, x(b.x1) - x(b.x0) - 1)).attr("height", y(0) - y(dens[i])).attr("fill", opts.color || TK.PALETTE[0]).attr("fill-opacity", 0.7));
    if (opts.normal) {
      const pts = d3.range(0, 201).map((k) => { const v = x.domain()[0] + ((x.domain()[1] - x.domain()[0]) * k) / 200; return [x(v), y(TK.normPdf((v - opts.normal.mean) / opts.normal.sd) / opts.normal.sd)]; });
      svg.append("path").attr("d", d3.line()(pts)).attr("fill", "none").attr("stroke", TK.INK).attr("stroke-width", 2);
    }
    if (opts.mark !== undefined) svg.append("line").attr("x1", x(opts.mark)).attr("x2", x(opts.mark)).attr("y1", M.t).attr("y2", H - M.b).attr("stroke", TK.BAD).attr("stroke-dasharray", "5 4").attr("stroke-width", 2);
    svg.append("text").attr("x", M.l).attr("y", 16).attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK).text(opts.title);
  }

  // ---------- the tool ----------
  function mount(rootId) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK || !window.TKData) return;
    let rows = [], tab = 0, seed = 2026;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const num = (k, f) => TK.num(q(k).value, f);
    const confSel = (k) => `<label>Confidence level <select data-k="${k}"><option value="0.9">90%</option><option value="0.95" selected>95%</option><option value="0.99">99%</option></select></label>`;

    root.innerHTML = `<div class="ci-loader"></div>
      <div class="ci-pane" data-pane="0">
        <div class="tk-grid">
          <label>Variable from the file <select data-k="mvar">${VARS.map((v) => `<option>${v}</option>`).join("")}</select></label>
          <label>Sample size n <input type="number" data-k="mn" min="2" step="1"></label>
          <label>Sample mean <input type="number" data-k="mm" step="any"></label>
          <label>Sample standard deviation <input type="number" data-k="ms" min="0" step="any"></label>
          ${confSel("mc")}
        </div>
        <p class="tk-help">Choosing a variable fills n, mean and standard deviation from the loaded file. Type over them to use your own summary figures.</p>
      </div>
      <div class="ci-pane" data-pane="1" hidden>
        <div class="tk-grid">
          <label>Successes x <input type="number" data-k="px" min="0" step="1"></label>
          <label>Sample size n <input type="number" data-k="pn" min="1" step="1"></label>
          ${confSel("pc")}
        </div>
        <p class="tk-help">The sample opens on attendance in the sample survey file: respondents who attended out of all respondents.</p>
      </div>
      <div class="ci-pane" data-pane="2" hidden>
        <div class="tk-grid">
          <label>Target margin of error for a mean <input type="number" data-k="se" min="0" step="any" value="0.1"></label>
          <label>Standard deviation, a guess or a pilot <input type="number" data-k="ss" min="0" step="any"></label>
          <label>Target margin of error for a proportion <input type="number" data-k="pe" min="0" max="1" step="0.01" value="0.05"></label>
          <label>Expected proportion, 0.5 if unknown <input type="number" data-k="pp" min="0" max="1" step="0.01" value="0.5"></label>
          <label>Population size, blank if large <input type="number" data-k="pop" min="0" step="1"></label>
          ${confSel("sc")}
        </div>
      </div>
      <div class="ci-pane" data-pane="3" hidden>
        <div class="tk-grid">
          <label>Population column <select data-k="cvar">${VARS.map((v) => `<option>${v}</option>`).join("")}</select></label>
          <label>Sample size n <input type="number" data-k="cn" min="2" max="200" step="1" value="5"></label>
          <label>Number of samples <select data-k="cr"><option>200</option><option selected>1000</option><option>5000</option></select></label>
        </div>
        <div class="tk-row"><button type="button" class="toolkit-btn" data-a="draw">Draw new samples</button></div>
        <p class="tk-help">The 200 rows of the file act as the population. Each sample draws n of them at random with replacement.</p>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="tk-kpis ci-kpis"></div>
        <div class="tk-chart-box ci-chart"></div>
        <div class="tk-chart-box ci-chart2"></div>
        <div class="tk-formula ci-formula"></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    root.prepend(window.TKData.tabs(["Mean", "Proportion", "Sample size", "CLT simulator"], (i) => { tab = i; root.querySelectorAll(".ci-pane").forEach((p) => (p.hidden = Number(p.dataset.pane) !== i)); render(); }));
    const loader = window.TKData.loader({ file: "event-survey-data.csv", label: "the sample survey file", required: VARS.concat(["Attendance"]),
      onLoad(parsed) { rows = parsed.rows; fillMean(); fillProp(); if (!q("ss").value) q("ss").value = (+TK.sd(col("Satisfaction")).toFixed(4)); render(); } });
    root.querySelector(".ci-loader").appendChild(loader);
    root.appendChild(TK.exportRow(report, () => "confidence-interval"));
    const col = (v) => rows.map((r) => TK.num(r[v])).filter(Number.isFinite);
    function fillMean() {
      const x = col(q("mvar").value);
      if (!x.length) return;
      q("mn").value = x.length; q("mm").value = +TK.mean(x).toFixed(4); q("ms").value = +TK.sd(x).toFixed(4);
    }
    function fillProp() {
      if (!rows.length) return;
      q("px").value = rows.filter((r) => r.Attendance === "Attended").length; q("pn").value = rows.length;
    }
    q("mvar").addEventListener("change", () => { fillMean(); render(); });
    root.querySelectorAll(".ci-pane input, .ci-pane select").forEach((el) => { if (el.dataset.k !== "mvar") el.addEventListener("input", () => render()); });
    root.addEventListener("click", (e) => { if (e.target.closest('[data-a="draw"]')) { seed += 7919; render(); } });

    function tiles(items) { return items.map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join(""); }
    function render() {
      const title = report.querySelector(".tk-report-title"), k = report.querySelector(".ci-kpis"), c1 = report.querySelector(".ci-chart"), c2 = report.querySelector(".ci-chart2"), fx = report.querySelector(".ci-formula");
      c2.innerHTML = "";
      if (tab === 0) {
        const n = num("mn"), m = num("mm"), s = num("ms"), conf = num("mc");
        title.textContent = `${Math.round(conf * 100)}% confidence interval for the mean of ${q("mvar").value.replace(/_/g, " ")}`;
        if (!(n >= 2 && Number.isFinite(m) && s >= 0)) { k.innerHTML = `<p class="tk-help">Enter n of at least 2, a mean and a standard deviation.</p>`; c1.innerHTML = ""; fx.innerHTML = ""; return; }
        const r = meanCI(n, m, s, conf);
        k.innerHTML = tiles([[`${TK.fmt(r.lo, 3)} to ${TK.fmt(r.hi, 3)}`, "Confidence interval"], [TK.fmt(r.moe, 3), "Margin of error"], [TK.fmt(r.se, 4), "Standard error, s / &radic;n"], [TK.fmt(r.t, 4), `t critical value, ${n - 1} df`]]);
        intervalChart(c1, [{ label: "Mean", est: m, lo: r.lo, hi: r.hi }]);
        fx.innerHTML = `Interval = x&#772; &plusmn; t &times; s / &radic;n = ${TK.fmt(m, 3)} &plusmn; ${TK.fmt(r.t, 3)} &times; ${TK.fmt(s, 3)} / &radic;${n}. Across repeated samples, ${Math.round(conf * 100)}% of intervals built this way contain the population mean.`;
      } else if (tab === 1) {
        const x = num("px"), n = num("pn"), conf = num("pc");
        title.textContent = `${Math.round(conf * 100)}% confidence interval for a proportion`;
        if (!(n >= 1 && x >= 0 && x <= n)) { k.innerHTML = `<p class="tk-help">Enter successes between 0 and n.</p>`; c1.innerHTML = ""; fx.innerHTML = ""; return; }
        const r = propCI(x, n, conf);
        k.innerHTML = tiles([[TK.fmtPct(r.p, 1), "Sample proportion"], [`${TK.fmtPct(r.wilson.lo, 1)} to ${TK.fmtPct(r.wilson.hi, 1)}`, "Wilson interval"], [`${TK.fmtPct(r.wald.lo, 1)} to ${TK.fmtPct(r.wald.hi, 1)}`, "Wald interval"], [TK.fmtPct(r.wald.moe, 1), "Wald margin of error"]]);
        intervalChart(c1, [{ label: "Wilson", est: r.p, lo: r.wilson.lo, hi: r.wilson.hi }, { label: "Wald", est: r.p, lo: r.wald.lo, hi: r.wald.hi }], "%");
        const warn = n * r.p < 10 || n * (1 - r.p) < 10 ? " With fewer than 10 successes or failures the Wald interval is unreliable, so report Wilson." : "";
        fx.innerHTML = `Wald: p&#770; &plusmn; z &radic;(p&#770;(1 &minus; p&#770;) / n), z = ${TK.fmt(r.z, 3)}. Wilson centres the interval at (p&#770; + z&sup2;/2n) / (1 + z&sup2;/n) and stays inside 0 to 1.${warn}`;
      } else if (tab === 2) {
        const conf = num("sc"), N = num("pop", 0), E = num("se"), s = num("ss"), pe = num("pe"), pp = num("pp");
        title.textContent = `Sample size at ${Math.round(conf * 100)}% confidence`;
        const nm = s > 0 && E > 0 ? nMean(s, E, conf, N) : NaN, np = pe > 0 && pp >= 0 && pp <= 1 ? nProp(pp, pe, conf, N) : NaN;
        k.innerHTML = tiles([[TK.fmtInt(nm), `n to estimate a mean within &plusmn;${TK.fmt(E, 3)}`], [TK.fmtInt(np), `n to estimate a proportion within &plusmn;${TK.fmtPct(pe, 1)}`]]);
        c1.innerHTML = "";
        if (pe > 0) {
          const pts = d3.range(0.01, 0.1001, 0.0025).map((e) => [e, nProp(pp, e, conf, N)]);
          const W = fitW(c1), H = 260, M = { l: 64, r: 20, t: 20, b: 40 }, svg = TK.svg(c1, W, H, "Sample size needed against margin of error for a proportion");
          const x = d3.scaleLinear().domain([0.01, 0.1]).range([M.l, W - M.r]), y = d3.scaleLinear().domain([0, d3.max(pts, (p) => p[1])]).nice().range([H - M.b, M.t]);
          TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).tickFormat(d3.format(".0%"))));
          TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5)));
          svg.append("path").attr("d", d3.line()(pts.map((p) => [x(p[0]), y(p[1])]))).attr("fill", "none").attr("stroke", TK.PALETTE[0]).attr("stroke-width", 2.5);
          if (pe >= 0.01 && pe <= 0.1) svg.append("circle").attr("cx", x(pe)).attr("cy", y(np)).attr("r", 6).attr("fill", TK.INK);
          svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", TK.INK).text("Margin of error for a proportion");
        }
        fx.innerHTML = `Mean: n = (z &times; &sigma; / E)&sup2;. Proportion: n = z&sup2; p(1 &minus; p) / E&sup2;. Both round up. With a population size N, n is adjusted to n / (1 + (n &minus; 1) / N). Halving the margin of error roughly quadruples n.`;
      } else {
        const v = q("cvar").value, pop = col(v), n = Math.max(2, Math.round(num("cn", 5))), reps = Number(q("cr").value);
        title.textContent = `Sampling distribution of the mean of ${v.replace(/_/g, " ")}, n = ${n}`;
        if (!pop.length) { k.innerHTML = `<p class="tk-help">Load the sample survey file to run the simulator.</p>`; c1.innerHTML = ""; fx.innerHTML = ""; return; }
        const mu = TK.mean(pop), sigma = Math.sqrt(pop.reduce((s, x) => s + (x - mu) * (x - mu), 0) / pop.length);
        const sim = simulate(pop, n, reps, seed, 0.95);
        const se = sigma / Math.sqrt(n);
        k.innerHTML = tiles([[TK.fmt(mu, 3), "Population mean &mu;"], [TK.fmt(TK.mean(sim.means), 3), `Mean of ${reps} sample means`], [TK.fmt(se, 3), "&sigma; / &radic;n, predicted"], [TK.fmt(Math.sqrt(sim.means.reduce((s, x) => s + Math.pow(x - TK.mean(sim.means), 2), 0) / sim.means.length), 3), "SD of the sample means"], [TK.fmtPct(sim.coverage, 1), "95% t intervals that contain &mu;"]]);
        histogram(c1, pop, { title: `Population, ${pop.length} values`, label: "Histogram of the population", h: 220, color: "#9a9a9a", mark: mu });
        histogram(c2, sim.means, { title: `${reps} sample means and the normal curve`, label: "Histogram of sample means", domain: d3.extent(pop), normal: { mean: mu, sd: se }, mark: mu });
        fx.innerHTML = `The Central Limit Theorem: for a large enough n the sample mean is close to normal with mean &mu; and standard error &sigma; / &radic;n, whatever the population's shape. Raise n to watch the spread shrink and the shape settle.`;
      }
    }
    render();
    loader.loadServed();
    let resizeTimer = null, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 150);
    });
  }

  window.ConfInt = { mount, compute: { lgamma, ibeta, tCdf, tInv, meanCI, propCI, nMean, nProp, simulate } };
})();
