/*
 * assets/js/toolkit/mmm.js
 *
 * MMM Analyser, a small marketing mix model that runs in the browser.
 *
 * Model, per period t:
 *   sales = b0 + trend + seasonality + gamma * price + sum over channels of beta_c * h_c(A_c,t)
 *   A_c,t = spend_c,t + theta_c * A_c,t-1          (geometric adstock, carryover)
 *   h_c(A) = A / (A + K_c)                           (saturation, diminishing returns)
 * K_c is a multiple of the channel's mean adstock. For fixed theta and K the
 * model is linear in its coefficients and is fitted by ordinary least
 * squares. Theta (0 to 0.8) and the K multiple are chosen per channel by
 * coordinate search to maximise R squared.
 *
 * It covers promotion spend and price. The other five Ps are outside the
 * model and are planned in the 7Ps Planner.
 *
 * Usage: window.MMM.mount({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;
  const THETAS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const KMULTS = [0.5, 1, 2, 4];

  function sampleCSV() {
    const rand = TK.rng(7);
    const n = 104, chans = ["search", "social", "video", "email"];
    const theta = { search: 0.1, social: 0.3, video: 0.6, email: 0 }, beta = { search: 30000, social: 18000, video: 25000, email: 8000 }, kf = { search: 1, social: 1, video: 1.5, email: 0.8 };
    const spend = {}, A = {};
    chans.forEach((c) => { spend[c] = []; A[c] = []; });
    for (let t = 0; t < n; t++) {
      spend.search.push(Math.round(9000 + 4000 * rand() + (t % 13 < 4 ? 5000 : 0)));
      spend.social.push(Math.round(5000 + 5000 * rand()));
      spend.video.push(t % 26 < 6 ? Math.round(18000 + 8000 * rand()) : rand() < 0.2 ? Math.round(6000 * rand()) : 0);
      spend.email.push(Math.round(1500 + 1000 * rand()));
    }
    chans.forEach((c) => spend[c].forEach((s, t) => A[c].push(s + (t ? theta[c] * A[c][t - 1] : 0))));
    const K = Object.fromEntries(chans.map((c) => [c, kf[c] * d3.mean(A[c])]));
    const lines = ["week,sales,search,social,video,email,price"];
    const start = Date.UTC(2024, 9, 7);
    for (let t = 0; t < n; t++) {
      const price = Math.round((100 + 6 * Math.sin(t / 9) + (rand() - 0.5) * 4) * 100) / 100;
      let y = 60000 + 60 * t + 8000 * Math.sin((2 * Math.PI * t) / 52) - 400 * (price - 100);
      chans.forEach((c) => (y += beta[c] * A[c][t] / (A[c][t] + K[c])));
      y += (rand() + rand() + rand() - 1.5) * 4000;
      lines.push([new Date(start + t * 7 * 86400000).toISOString().slice(0, 10), Math.round(y)].concat(chans.map((c) => spend[c][t])).concat([price]).join(","));
    }
    return lines.join("\n");
  }

  function adstock(x, theta) {
    const out = [];
    x.forEach((v, t) => out.push(v + (t ? theta * out[t - 1] : 0)));
    return out;
  }

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    let model = null;
    root.innerHTML = `
      <p class="tk-help">One row per week or month, oldest first, with a date, sales, and spend per channel. A price column is optional. The sample is 2 years of weekly hotel booking revenue generated from known settings, so you can check that the model recovers them. The sample's true carryover is 0.1 for search, 0.3 for social, 0.6 for video, and 0 for email, and sales fall by 400 for each unit of price.</p>
      <textarea class="tk-mono" rows="7" data-k="csv"></textarea>
      <div class="tk-grid">
        <label>Date column <select data-k="date"></select></label>
        <label>Sales column <select data-k="sales"></select></label>
        <label>Price column <select data-k="price"></select></label>
        <label>Periods per year <input type="number" min="1" data-k="season" value="52"></label>
      </div>
      <p class="tk-help">Spend columns</p><div class="tk-row" data-k="chans"></div>
      <div class="tk-row"><label class="tk-check-row"><input type="checkbox" data-k="trend" checked> Include a trend</label><label class="tk-check-row"><input type="checkbox" data-k="seas" checked> Include yearly seasonality</label></div>
      <div class="tk-row"><button type="button" class="toolkit-btn" data-a="fit">Fit the model</button><button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button><span class="tk-status" data-k="msg"></span></div>
      <div class="tk-report">
        <h3 class="tk-report-title">Marketing mix model</h3>
        <div class="tk-kpis" data-k="tiles"></div>
        <ul class="tk-list" data-k="warn"></ul>
        <h4>Channel results</h4><div class="tk-table-wrap"><table class="tk-table" data-k="table"></table></div>
        <h4>Sales explained by base and each channel</h4><div class="tk-chart-box" data-k="stack"></div>
        <h4>Diminishing returns: weekly contribution at each level of steady weekly spend</h4><div class="tk-chart-box" data-k="curves"></div>
      </div>`;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, "mmm-results", [{ label: "Download results CSV", run: (st) => {
      if (!model) return TK.status(st, "Fit the model first.");
      TK.downloadText(TK.toCSV([["channel", "carryover_theta", "half_saturation_K", "spend", "contribution", "roi", "marginal_roi"]].concat(model.channels.map((c) => [c.name, c.theta, Math.round(c.K), Math.round(c.spend), Math.round(c.contrib), TK.fmt(c.roi, 3), TK.fmt(c.mroi, 3)]))), "mmm-results.csv", "text/csv");
      TK.status(st, "CSV saved.");
    } }]));

    function columns() {
      const { headers } = TK.csvObjects(q("csv").value.split("\n").slice(0, 2).join("\n"));
      const opt = (sel, allowNone) => (allowNone ? `<option value="">None</option>` : "") + headers.map((h) => `<option${h === sel ? " selected" : ""}>${TK.esc(h)}</option>`).join("");
      const g = (re) => headers.find((h) => re.test(h)) || "";
      const dateC = g(/date|week|month|period/i) || headers[0], salesC = g(/sales|revenue|bookings|orders/i) || headers[1], priceC = g(/price/i);
      q("date").innerHTML = opt(dateC);
      q("sales").innerHTML = opt(salesC);
      q("price").innerHTML = opt(priceC, true);
      q("chans").innerHTML = headers.filter((h) => h !== dateC && h !== salesC && h !== priceC).map((h) => `<label class="tk-check-row"><input type="checkbox" data-chan="${TK.esc(h)}" checked> ${TK.esc(h)}</label>`).join("");
    }
    q("csv").addEventListener("change", columns);
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "sample") { q("csv").value = sampleCSV(); columns(); }
      fit();
    });

    function fit() {
      const msg = q("msg");
      const { rows } = TK.csvObjects(q("csv").value);
      const chans = Array.from(root.querySelectorAll("[data-chan]:checked")).map((c) => c.dataset.chan);
      const salesC = q("sales").value, priceC = q("price").value, dateC = q("date").value;
      const data = rows.map((r) => ({ date: r[dateC], y: TK.num(r[salesC]), price: priceC ? TK.num(r[priceC]) : 0, x: chans.map((c) => Math.max(0, TK.num(r[c], 0))) }))
        .filter((d) => Number.isFinite(d.y) && (!priceC || Number.isFinite(d.price)));
      if (!chans.length || data.length < 12) { TK.status(msg, "Choose at least one spend column and provide at least 12 periods."); return; }
      const n = data.length, y = data.map((d) => d.y), per = Math.max(2, TK.num(q("season").value, 52));
      const useTrend = q("trend").checked, useSeas = q("seas").checked && n >= per * 0.75;
      const spend = chans.map((c, j) => data.map((d) => d.x[j]));
      function design(params) {
        const hs = params.map((p, j) => {
          const A = adstock(spend[j], p.theta), K = p.km * (d3.mean(A) || 1);
          return { A, K, h: A.map((a) => a / (a + K)) };
        });
        const X = data.map((d, t) => {
          const row = [1];
          if (useTrend) row.push(t);
          if (useSeas) row.push(Math.sin((2 * Math.PI * t) / per), Math.cos((2 * Math.PI * t) / per));
          if (priceC) row.push(d.price);
          hs.forEach((h) => row.push(h.h[t]));
          return row;
        });
        return { X, hs };
      }
      let params = chans.map(() => ({ theta: 0.3, km: 1 }));
      let best = null;
      const tryFit = (ps) => { const d = design(ps); const f = TK.ols(d.X, y); return f ? { f, d, ps } : null; };
      best = tryFit(params);
      for (let pass = 0; pass < 3; pass++) {
        chans.forEach((c, j) => {
          THETAS.forEach((theta) => KMULTS.forEach((km) => {
            const ps = params.map((p, k) => (k === j ? { theta, km } : p));
            const r = tryFit(ps);
            if (r && (!best || r.f.r2 > best.f.r2)) { best = r; params = ps; }
          }));
        });
      }
      if (!best) { TK.status(msg, "The model could not be fitted. Check for columns that never change."); return; }
      const off = 1 + (useTrend ? 1 : 0) + (useSeas ? 2 : 0) + (priceC ? 1 : 0);
      const beta = best.f.beta;
      const channels = chans.map((name, j) => {
        const b = beta[off + j], h = best.d.hs[j], p = params[j];
        const contribSeries = h.h.map((v) => b * v);
        const meanA = d3.mean(h.A);
        return { name, theta: p.theta, K: h.K, beta: b, spend: d3.sum(spend[j]), contrib: d3.sum(contribSeries), series: contribSeries,
          roi: d3.sum(contribSeries) / (d3.sum(spend[j]) || 1), mroi: (b * h.K) / Math.pow(meanA + h.K, 2) / (1 - p.theta), meanSpend: d3.mean(spend[j]), color: TK.PALETTE[j % TK.PALETTE.length] };
      });
      const fitted = best.f.fitted;
      const base = fitted.map((f, t) => f - d3.sum(channels, (c) => c.series[t]));
      const mape = d3.mean(y, (v, t) => Math.abs((v - fitted[t]) / v));
      const k = beta.length;
      model = { channels, fitted, base, y, data, r2: best.f.r2, mape, n, k, gamma: priceC ? beta[off - 1] : null };
      TK.status(msg, "Model fitted.");
      render();
    }

    function render() {
      const m = model, totalY = d3.sum(m.y);
      q("tiles").innerHTML = [[TK.fmt(m.r2, 3), "R²"], [TK.fmtPct(m.mape, 1), "Mean absolute percentage error"], [String(m.n), "Periods"], [String(m.k), "Coefficients estimated"],
        [TK.fmtPct(d3.sum(m.channels, (c) => c.contrib) / totalY, 0), "Share of sales from the channels"], [m.gamma != null ? TK.fmt(m.gamma, 1) : "n/a", "Sales change per unit of price"]]
        .map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      const warns = [];
      if (m.n < 10 * m.k) warns.push(`With ${m.n} periods and ${m.k} coefficients, estimates are unstable. Aim for at least ${10 * m.k} periods.`);
      m.channels.filter((c) => c.beta < 0).forEach((c) => warns.push(`${c.name} has a negative effect. That usually means its spend moves with something the model leaves out, such as a seasonal push, and the estimate should not be used for budgeting.`));
      m.channels.forEach((a, i) => m.channels.slice(i + 1).forEach((b) => { const r = corr(spendOf(a), spendOf(b)); if (Math.abs(r) > 0.8) warns.push(`${a.name} and ${b.name} spend move together (correlation ${TK.fmt(r, 2)}). The model cannot separate their effects reliably.`); }));
      q("warn").innerHTML = warns.map((w) => `<li class="tk-warn">${TK.esc(w)}</li>`).join("");
      q("table").innerHTML = `<thead><tr><th>Channel</th><th class="tk-num">Carryover</th><th class="tk-num">Spend</th><th class="tk-num">Contribution</th><th class="tk-num">Share of sales</th><th class="tk-num">ROI</th><th class="tk-num">Marginal ROI</th></tr></thead><tbody>` +
        m.channels.map((c) => `<tr><td><span class="swatch" style="background:${c.color}"></span>${TK.esc(c.name)}</td><td class="tk-num">${TK.fmt(c.theta, 1)}</td><td class="tk-num">${TK.fmtInt(c.spend)}</td><td class="tk-num">${TK.fmtInt(c.contrib)}</td><td class="tk-num">${TK.fmtPct(c.contrib / totalY, 1)}</td><td class="tk-num">${TK.fmt(c.roi, 2)}</td><td class="tk-num ${c.mroi < 1 ? "tk-neg" : "tk-pos"}">${TK.fmt(c.mroi, 2)}</td></tr>`).join("") + "</tbody>";
      drawStack();
      drawCurves();
    }
    function spendOf(c) { return model.data.map((d, t) => { const j = model.channels.indexOf(c); return d.x[j]; }); }
    function corr(a, b) {
      const ma = d3.mean(a), mb = d3.mean(b);
      const num = d3.sum(a, (v, i) => (v - ma) * (b[i] - mb)), den = Math.sqrt(d3.sum(a, (v) => (v - ma) ** 2) * d3.sum(b, (v) => (v - mb) ** 2));
      return den ? num / den : 0;
    }

    function drawStack() {
      const m = model, box = q("stack");
      box.innerHTML = "";
      const W = 760, H = 320, M = { l: 64, r: 20, t: 30, b: 34 };
      const svg = TK.svg(box, W, H, "Stacked contributions of base and channels over time with actual sales");
      const keys = ["base"].concat(m.channels.map((c) => c.name));
      const rows = m.y.map((v, t) => Object.assign({ t }, { base: m.base[t] }, Object.fromEntries(m.channels.map((c) => [c.name, Math.max(0, c.series[t])]))));
      const stack = d3.stack().keys(keys)(rows);
      const x = d3.scaleLinear().domain([0, m.n - 1]).range([M.l, W - M.r]);
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(m.base)), Math.max(d3.max(m.y), d3.max(stack[stack.length - 1], (d) => d[1])) * 1.05]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))));
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(8).tickFormat((t) => (m.data[t] ? m.data[t].date : ""))));
      stack.forEach((s, i) => svg.append("path").attr("d", d3.area().x((d, t) => x(t)).y0((d) => y(d[0])).y1((d) => y(d[1]))(s))
        .attr("fill", i === 0 ? "#d9d9d9" : m.channels[i - 1].color).attr("fill-opacity", i === 0 ? 1 : 0.85));
      svg.append("path").attr("d", d3.line().x((v, t) => x(t)).y((v) => y(v))(m.y)).attr("fill", "none").attr("stroke", TK.INK).attr("stroke-width", 1.5);
      keys.forEach((k, i) => {
        svg.append("rect").attr("x", M.l + i * 110).attr("y", 6).attr("width", 11).attr("height", 11).attr("fill", i === 0 ? "#d9d9d9" : m.channels[i - 1].color);
        svg.append("text").attr("x", M.l + i * 110 + 16).attr("y", 16).attr("font-size", 11).text(i === 0 ? "Base" : k);
      });
      svg.append("text").attr("x", W - M.r).attr("y", 16).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text("Line: actual sales");
    }

    function drawCurves() {
      const m = model, box = q("curves");
      box.innerHTML = "";
      const W = 760, H = 300, M = { l: 64, r: 20, t: 20, b: 40 };
      const svg = TK.svg(box, W, H, "Response curve for each channel showing diminishing returns");
      const maxSpend = d3.max(m.channels, (c) => c.meanSpend) * 2.5 || 1;
      const x = d3.scaleLinear().domain([0, maxSpend]).range([M.l, W - M.r]);
      const resp = (c, s) => { const A = s / (1 - c.theta); return c.beta * A / (A + c.K); };
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(m.channels, (c) => resp(c, maxSpend))), d3.max(m.channels, (c) => resp(c, maxSpend)) * 1.1]).nice().range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s"))));
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("~s"))));
      m.channels.forEach((c) => {
        const pts = d3.range(0, maxSpend * 1.0001, maxSpend / 80);
        svg.append("path").attr("d", d3.line().x((s) => x(s)).y((s) => y(resp(c, s)))(pts)).attr("fill", "none").attr("stroke", c.color).attr("stroke-width", 2.5);
        svg.append("circle").attr("cx", x(c.meanSpend)).attr("cy", y(resp(c, c.meanSpend))).attr("r", 5).attr("fill", c.color).attr("stroke", "#fff").attr("stroke-width", 1.5)
          .append("title").text(`${c.name}: current mean spend ${TK.fmtInt(c.meanSpend)}`);
      });
      // End labels, nudged apart so close curves stay readable.
      const labels = m.channels.map((c) => ({ c, y: y(resp(c, maxSpend)) - 6 })).sort((a, b) => a.y - b.y);
      labels.forEach((l, i) => { if (i && l.y - labels[i - 1].y < 13) l.y = labels[i - 1].y + 13; });
      labels.forEach((l) => svg.append("text").attr("x", x(maxSpend) - 4).attr("y", l.y).attr("text-anchor", "end").attr("font-size", 11).attr("font-weight", 700)
        .attr("fill", l.c.color).attr("paint-order", "stroke").attr("stroke", "#fff").attr("stroke-width", 3).text(l.c.name));
      svg.append("text").attr("x", (M.l + W) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text("Steady spend per period. Dots mark the current mean spend.");
    }

    q("csv").value = sampleCSV();
    columns();
    fit();
  }

  window.MMM = { mount };
})();
