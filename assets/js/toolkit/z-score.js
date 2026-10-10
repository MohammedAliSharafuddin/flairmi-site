/*
 * assets/js/toolkit/z-score.js
 *
 * Z-Score Calculator. Four ways in: one or more data points against a mean
 * and standard deviation, a sample mean with its size, a pasted data sample,
 * and the reverse route from a z-score back to a value. Each answer shows
 * its working, the area of the standard normal curve below and above it and
 * a shaded curve.
 *
 *   data point   z = (x - mean) / sd
 *   sample mean  z = (xbar - mean) / (sd / sqrt(n))
 *   back again   x = mean + z * sd
 *
 * The normal CDF here is a series accurate to about 1e-15 over the range a
 * z-table covers, so areas agree with R's pnorm(). Inputs can be preset from
 * the address, for example ?x=77&mean=45.455&sd=11.905, which is how a page
 * that frames the calculator opens it on its own example. ?modes=point,value
 * limits the choices offered.
 *
 * Usage: window.ZScore.mount("z-app", { embed: false }). The pure functions
 * in window.ZScore.compute are also run by R/test_toolkit_data_tools.R.
 */
(function () {
  "use strict";
  const TK = window.TK;

  // ---------- pure calculations ----------
  // Standard normal CDF: phi(z) * (z + z^3/3 + z^5/(3*5) + ...), Marsaglia (2004).
  function cdf(z) {
    if (!Number.isFinite(z)) return z > 0 ? 1 : z < 0 ? 0 : NaN;
    if (z < -8) return 0;
    if (z > 8) return 1;
    let sum = z, term = z;
    for (let i = 3; i < 400; i += 2) {
      term = (term * z * z) / i;
      sum += term;
      if (Math.abs(term) < 1e-17 * Math.abs(sum)) break;
    }
    return 0.5 + sum * Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }
  function parseValues(text) {
    return String(text || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).map((s) => Number(s)).filter(Number.isFinite);
  }
  function zPoint(x, mean, sd) { return (x - mean) / sd; }
  function zMean(xbar, mean, sd, n) { return (xbar - mean) / (sd / Math.sqrt(n)); }
  function xFromZ(z, mean, sd) { return mean + z * sd; }
  function areas(z) {
    const below = cdf(z);
    return { below, above: 1 - below, within: cdf(Math.abs(z)) - cdf(-Math.abs(z)), beyond: 2 * cdf(-Math.abs(z)) };
  }
  function band(z) {
    const a = Math.abs(z);
    return a >= 3 ? "Extreme" : a >= 2 ? "Unusual" : "Typical";
  }
  function sampleStats(values) {
    return { n: values.length, mean: TK.mean(values), sd: TK.sd(values) };
  }

  // ---------- drawing ----------
  function curve(box, z, opts) {
    box.innerHTML = "";
    const W = Math.max(300, Math.min(720, box.clientWidth || 720)), H = 230, M = { l: 14, r: 14, t: 26, b: 44 };
    const svg = TK.svg(box, W, H, `Standard normal curve with the area below z = ${TK.fmt(z, 2)} shaded`);
    const lim = Math.max(3.5, Math.min(6, Math.ceil(Math.abs(z)) + 0.5));
    const x = d3.scaleLinear().domain([-lim, lim]).range([M.l, W - M.r]);
    const y = d3.scaleLinear().domain([0, TK.normPdf(0) * 1.08]).range([H - M.b, M.t]);
    const pts = (a, b) => d3.range(0, 121).map((k) => { const v = a + ((b - a) * k) / 120; return [x(v), y(TK.normPdf(v))]; });
    const zc = Math.max(-lim, Math.min(lim, z));
    const shade = (a, b, fill) => svg.append("path").attr("d", d3.line()(pts(a, b)) + `L${x(b)},${y(0)}L${x(a)},${y(0)}Z`).attr("fill", fill);
    shade(-lim, zc, TK.PALETTE[0]).attr("fill-opacity", 0.55);
    shade(zc, lim, "#d9d9d9").attr("fill-opacity", 0.7);
    svg.append("path").attr("d", d3.line()(pts(-lim, lim))).attr("fill", "none").attr("stroke", TK.INK).attr("stroke-width", 1.5);
    const ticks = d3.range(-Math.floor(lim), Math.floor(lim) + 1);
    TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("d"))));
    if (opts && Number.isFinite(opts.mean) && Number.isFinite(opts.scale)) {
      ticks.forEach((t) => svg.append("text").attr("x", x(t)).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 10).attr("fill", TK.MUTED).text(d3.format("~g")(+(opts.mean + t * opts.scale).toFixed(2))));
    }
    svg.append("line").attr("x1", x(zc)).attr("x2", x(zc)).attr("y1", M.t - 6).attr("y2", H - M.b).attr("stroke", TK.BAD).attr("stroke-width", 2);
    const right = zc > 0;
    svg.append("text").attr("x", x(zc) + (right ? -6 : 6)).attr("y", M.t - 10).attr("text-anchor", right ? "end" : "start").attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.BAD).text(`z = ${TK.fmt(z, 2)}`);
    const a = areas(z);
    svg.append("text").attr("x", M.l + 4).attr("y", M.t + 6).attr("font-size", 11).attr("fill", TK.PALETTE[0]).attr("font-weight", 700).text(`Below ${TK.fmtPct(a.below, 2)}`);
    svg.append("text").attr("x", W - M.r - 4).attr("y", M.t + 6).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).attr("font-weight", 700).text(`Above ${TK.fmtPct(a.above, 2)}`);
  }

  // ---------- the tool ----------
  function mount(rootId, options) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const embed = !!(options && options.embed);
    const qs = new URLSearchParams(window.location.search);
    const pre = (k, d) => (qs.has(k) && qs.get(k) !== "" ? qs.get(k) : d);
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const num = (k) => TK.num(q(k).value);

    root.innerHTML = `
      <div class="tk-grid">
        <label>Calculate <select data-k="mode">
          <option value="point">z from data point(s)</option>
          <option value="mean">z from a sample mean and size</option>
          <option value="sample">z from a data sample</option>
          <option value="value">A value from a z-score</option></select></label>
        <label>Population mean, &mu; <input type="number" data-k="mean" step="any"></label>
        <label>Population standard deviation, &sigma; <input type="number" data-k="sd" min="0" step="any"></label>
      </div>
      <div class="zs-in" data-in="point"><label>Data point(s), x <textarea data-k="x" rows="2" class="tk-mono" aria-label="Data points"></textarea></label>
        <p class="tk-help">One value, or more separated by commas, spaces or new lines.</p></div>
      <div class="zs-in tk-grid" data-in="mean" hidden>
        <label>Sample mean, x&#772; <input type="number" data-k="xbar" step="any"></label>
        <label>Sample size, n <input type="number" data-k="n" min="1" step="1"></label>
        <p class="tk-help" style="grid-column:1/-1">The sample mean is compared with the population mean &mu; above.</p></div>
      <div class="zs-in" data-in="sample" hidden><label>Data sample <textarea data-k="values" rows="3" class="tk-mono" aria-label="Data sample"></textarea></label>
        <p class="tk-help">Paste the sample. The calculator finds its mean and size, then the z-score of that mean against the population mean &mu; above. &mu; and &sigma; describe the population the sample is compared with, so they stay as you set them.</p></div>
      <div class="zs-in tk-grid" data-in="value" hidden><label>z-score <input type="number" data-k="z" step="any"></label></div>
      <div class="tk-report">
        <h3 class="tk-report-title">Answer</h3>
        <div class="tk-kpis zs-kpis"></div>
        <div class="tk-formula zs-steps"></div>
        <div class="tk-chart-box zs-chart"></div>
        <div class="tk-table-wrap"><table class="tk-table zs-table"></table></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    if (!embed) root.appendChild(TK.exportRow(report, "z-score"));
    // ?modes=point,value limits the choices, for a page that teaches only those.
    const ALL = ["point", "mean", "sample", "value"];
    const allowed = pre("modes", "").split(",").map((m) => m.trim()).filter((m) => ALL.includes(m));
    if (allowed.length) [...q("mode").options].forEach((o) => { if (!allowed.includes(o.value)) o.remove(); });
    const modes = allowed.length ? allowed : ALL;
    q("mode").value = modes.includes(pre("mode", "")) ? pre("mode", "") : modes[0];
    // The built-in example is a score of 82 with mean 70 and SD 8. When a page
    // presets its own mean or SD, the other example values would belong to a
    // different dataset, so they start empty unless that page presets them too.
    const own = qs.has("mean") || qs.has("sd");
    q("mean").value = pre("mean", "70");
    q("sd").value = pre("sd", "8");
    q("x").value = pre("x", own ? "" : "82");
    q("xbar").value = pre("xbar", own ? "" : "73");
    q("n").value = pre("n", own ? "" : "25");
    q("values").value = pre("values", own ? "" : "72, 81, 69, 77, 74, 68, 79, 75");
    q("z").value = pre("z", own ? "" : "1.5");

    const f = (v, d) => TK.fmt(v, d === undefined ? 3 : d);
    const g = (v) => d3.format("~g")(+v.toPrecision(8));
    const tail = (p) => (p < 0.0001 ? "below 0.0001" : f(p, 4));
    const tiles = (items) => items.map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
    const clear = (msg) => { report.querySelector(".zs-kpis").innerHTML = `<p class="tk-help">${msg}</p>`; [".zs-steps", ".zs-chart", ".zs-table"].forEach((s) => (report.querySelector(s).innerHTML = "")); };
    const areaTiles = (z) => { const a = areas(z); return [[f(z), "z-score"], [TK.fmtPct(a.below, 2), "Area below"], [TK.fmtPct(a.above, 2), "Area above"], [band(z), "|z| under 2 typical, 2 to 3 unusual, 3 or more extreme"]]; };

    function render() {
      const mode = q("mode").value, mean = num("mean"), sd = num("sd");
      root.querySelectorAll(".zs-in").forEach((el) => (el.hidden = el.dataset.in !== mode));
      const steps = report.querySelector(".zs-steps"), tbl = report.querySelector(".zs-table"), kp = report.querySelector(".zs-kpis"), chart = report.querySelector(".zs-chart");
      tbl.innerHTML = "";
      if (!Number.isFinite(mean) || !(sd > 0)) return clear("Enter a mean and a standard deviation above 0.");
      if (mode === "point") {
        const xs = parseValues(q("x").value);
        if (!xs.length) return clear("Enter at least one data point.");
        const zs = xs.map((x) => zPoint(x, mean, sd)), z = zs[0];
        kp.innerHTML = tiles(areaTiles(z));
        steps.innerHTML = `z = (x &minus; &mu;) / &sigma; = (${g(xs[0])} &minus; ${g(mean)}) / ${g(sd)} = ${g(xs[0] - mean)} / ${g(sd)} = <strong>${f(z)}</strong><br>${g(xs[0])} lies ${f(Math.abs(z), 2)} standard deviations ${z < 0 ? "below" : "above"} the mean.`;
        curve(chart, z, { mean, scale: sd });
        if (xs.length > 1) tbl.innerHTML = `<thead><tr><th class="tk-num">x</th><th class="tk-num">x &minus; &mu;</th><th class="tk-num">z</th><th class="tk-num">Area below</th><th class="tk-num">Area above</th><th>Band</th></tr></thead><tbody>${xs.map((x, i) => { const a = areas(zs[i]); return `<tr><td class="tk-num">${g(x)}</td><td class="tk-num">${g(x - mean)}</td><td class="tk-num">${f(zs[i])}</td><td class="tk-num">${f(a.below, 4)}</td><td class="tk-num">${f(a.above, 4)}</td><td>${band(zs[i])}</td></tr>`; }).join("")}</tbody>`;
      } else if (mode === "mean" || mode === "sample") {
        let xbar = num("xbar"), n = num("n"), note = "";
        if (mode === "sample") {
          const v = parseValues(q("values").value);
          if (v.length < 1) return clear("Paste at least one value.");
          const s = sampleStats(v);
          xbar = s.mean; n = s.n;
          note = `The sample has n = ${n}, mean x&#772; = ${g(+xbar.toFixed(6))}${n > 1 ? ` and standard deviation s = ${g(+s.sd.toFixed(6))}` : ""}.<br>`;
        }
        if (!Number.isFinite(xbar) || !(n >= 1)) return clear("Enter a sample mean and a sample size of 1 or more.");
        const se = sd / Math.sqrt(n), z = zMean(xbar, mean, sd, n);
        kp.innerHTML = tiles(areaTiles(z).slice(0, 3).concat([[f(se), "Standard error, &sigma; / &radic;n"]]));
        steps.innerHTML = `${note}z = (x&#772; &minus; &mu;) / (&sigma; / &radic;n) = (${g(+xbar.toFixed(6))} &minus; ${g(mean)}) / (${g(sd)} / &radic;${n}) = ${g(+(xbar - mean).toFixed(6))} / ${f(se)} = <strong>${f(z)}</strong><br>A sample mean this far ${z < 0 ? "below" : "above"} &mu;, or further, has probability ${tail(z < 0 ? areas(z).below : areas(z).above)} when the population mean is ${g(mean)}.`;
        curve(chart, z, { mean, scale: se });
      } else {
        const z = num("z");
        if (!Number.isFinite(z)) return clear("Enter a z-score.");
        const x = xFromZ(z, mean, sd), a = areas(z);
        kp.innerHTML = tiles([[f(x), "Value, x"], [TK.fmtPct(a.below, 2), "Area below, the percentile"], [TK.fmtPct(a.above, 2), "Area above"], [band(z), "Band"]]);
        steps.innerHTML = `x = &mu; + z &times; &sigma; = ${g(mean)} + (${g(z)}) &times; ${g(sd)} = ${g(mean)} ${z < 0 ? "&minus;" : "+"} ${g(Math.abs(z) * sd)} = <strong>${f(x)}</strong>`;
        curve(chart, z, { mean, scale: sd });
      }
    }
    root.querySelectorAll("input, select, textarea").forEach((el) => el.addEventListener("input", render));
    render();
    let timer = null, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(render, 150);
    });
  }

  window.ZScore = { mount, compute: { cdf, parseValues, zPoint, zMean, xFromZ, areas, band, sampleStats } };
})();
