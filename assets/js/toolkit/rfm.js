/*
 * assets/js/toolkit/rfm.js
 *
 * RFM Segmentation Tool. Paste transactions (customer, date, amount),
 * score each customer 1 to 5 on recency, frequency, and monetary value by
 * quintile, and assign a segment from the recency and frequency scores.
 * Output: segment table with suggested actions, a 5 by 5 recency and
 * frequency grid, revenue share by segment, and a scored CSV.
 *
 * Usage: window.RFM.mount({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;
  const DAY = 86400000;

  const SEGMENTS = [
    { id: "champions", label: "Champions", color: TK.PALETTE[2], test: (r, f) => r >= 4 && f >= 4, action: "Reward them, ask for reviews and referrals, and offer early access." },
    { id: "loyal", label: "Loyal customers", color: TK.PALETTE[0], test: (r, f) => r >= 3 && f >= 3, action: "Upsell higher-value options and enrol them in the loyalty programme." },
    { id: "potential", label: "Potential loyalists", color: TK.PALETTE[6], test: (r, f) => r >= 4 && f === 2, action: "Offer a membership or a reason for a second and third purchase soon." },
    { id: "new", label: "New customers", color: TK.PALETTE[4], test: (r, f) => r >= 4 && f === 1, action: "Onboard well. A clear welcome and an early second purchase build the habit." },
    { id: "attention", label: "Need attention", color: TK.PALETTE[3], test: (r, f) => r === 3, action: "Send a limited-time, personalised offer before they drift further." },
    { id: "cantlose", label: "Can't lose them", color: TK.PALETTE[7], test: (r, f, m) => r === 1 && f >= 4 && m >= 4, action: "Win them back personally. Find out what changed, since they were among the best." },
    { id: "risk", label: "At risk", color: TK.PALETTE[1], test: (r, f) => r <= 2 && f >= 3, action: "Reconnect with a relevant offer and a reminder of what they valued." },
    { id: "hibernating", label: "Hibernating", color: "#9a9a9a", test: (r) => r === 2, action: "Low-cost reactivation. Expect only some to return." },
    { id: "lost", label: "Lost", color: "#c9c9c9", test: () => true, action: "Exclude from paid campaigns. Try one low-cost win-back at most." }
  ];

  function sampleCSV() {
    const rand = TK.rng(20260929);
    const end = Date.UTC(2026, 8, 28);
    const lines = ["customer_id,date,amount"];
    for (let c = 1; c <= 420; c++) {
      const type = rand();
      const n = type < 0.12 ? 6 + Math.floor(rand() * 8) : type < 0.4 ? 2 + Math.floor(rand() * 4) : 1;
      const lastAgo = type < 0.12 ? rand() * 90 : type < 0.4 ? rand() * 400 : rand() * 700;
      const base = 120 + rand() * 380;
      for (let k = 0; k < n; k++) {
        const ago = lastAgo + k * (30 + rand() * 90);
        if (ago > 730) break;
        const d = new Date(end - ago * DAY).toISOString().slice(0, 10);
        lines.push(`C${String(c).padStart(4, "0")},${d},${Math.round(base * (0.6 + rand() * 0.9))}`);
      }
    }
    return lines.join("\n");
  }

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    let result = null;

    root.innerHTML = `
      <p class="tk-help">Paste one row per transaction with a customer ID, a date (YYYY-MM-DD), and an amount. A header row is required. The sample is 2 years of hotel bookings for 420 guests.</p>
      <textarea class="tk-mono" rows="7" data-k="csv"></textarea>
      <div class="tk-grid">
        <label>Customer column <select data-k="c-id"></select></label>
        <label>Date column <select data-k="c-date"></select></label>
        <label>Amount column <select data-k="c-amt"></select></label>
        <label>Analysis date <input type="date" data-k="asof"></label>
      </div>
      <div class="tk-row">
        <button type="button" class="toolkit-btn" data-a="run">Score customers</button>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <span class="tk-status" data-k="msg"></span>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title">RFM segmentation</h3>
        <div class="tk-kpis"></div>
        <div class="tk-table-wrap"><table class="tk-table rfm-seg"></table></div>
        <h4>Customers by recency and frequency score</h4>
        <div class="tk-chart-box rfm-grid"></div>
        <h4>Share of customers and revenue by segment</h4>
        <div class="tk-chart-box rfm-bars"></div>
      </div>`;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, "rfm-segments", [
      { label: "Download scored CSV", run: (st) => {
        if (!result) return TK.status(st, "Score customers first.");
        const rows = [["customer_id", "recency_days", "frequency", "monetary", "R", "F", "M", "segment"]].concat(
          result.customers.map((c) => [c.id, c.recency, c.frequency, Math.round(c.monetary * 100) / 100, c.R, c.F, c.M, c.seg.label]));
        TK.downloadText(TK.toCSV(rows), "rfm-scored.csv", "text/csv");
        TK.status(st, "CSV saved.");
      } }]));

    function columns() {
      const { headers } = TK.csvObjects(q("csv").value.split("\n").slice(0, 2).join("\n"));
      const guess = (re) => headers.find((h) => re.test(h)) || "";
      [["c-id", /cust|client|guest|id/i], ["c-date", /date|time|day/i], ["c-amt", /amount|value|revenue|total|spend|price/i]].forEach(([k, re]) => {
        const sel = q(k), cur = sel.value, g = guess(re);
        sel.innerHTML = headers.map((h) => `<option${h === (headers.includes(cur) ? cur : g) ? " selected" : ""}>${TK.esc(h)}</option>`).join("");
      });
    }
    q("csv").addEventListener("change", columns);
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "sample") {
        q("csv").value = sampleCSV();
        q("asof").value = "2026-09-29";
        columns();
      }
      run();
    });

    function scoreOf(values, v, higherIsBetter) {
      // Quintile by position: ties share a score.
      const less = values.lessThan(v);
      const s = 1 + Math.floor((5 * less) / values.n);
      const sc = Math.min(5, Math.max(1, s));
      return higherIsBetter ? sc : 6 - sc;
    }
    function sortedCounter(arr) {
      const sorted = arr.slice().sort((a, b) => a - b);
      return { n: sorted.length, lessThan: (v) => d3.bisectLeft(sorted, v) };
    }

    function run() {
      const msg = q("msg");
      const { rows } = TK.csvObjects(q("csv").value);
      const cid = q("c-id").value, cd = q("c-date").value, ca = q("c-amt").value;
      if (!rows.length || !cid) { TK.status(msg, "Paste transactions with a header row, or load the sample."); return; }
      const by = new Map();
      let maxDate = 0, skipped = 0;
      rows.forEach((r) => {
        const t = Date.parse(r[cd]), amt = TK.num(r[ca]);
        if (!r[cid] || !Number.isFinite(t) || !Number.isFinite(amt)) { skipped++; return; }
        maxDate = Math.max(maxDate, t);
        const c = by.get(r[cid]) || { id: r[cid], last: 0, frequency: 0, monetary: 0 };
        c.last = Math.max(c.last, t);
        c.frequency += 1;
        c.monetary += amt;
        by.set(r[cid], c);
      });
      if (!by.size) { TK.status(msg, "No usable rows. Check the column choices and the date format."); return; }
      const asof = q("asof").value ? Date.parse(q("asof").value) : maxDate + DAY;
      const customers = Array.from(by.values());
      customers.forEach((c) => (c.recency = Math.max(0, Math.round((asof - c.last) / DAY))));
      const rc = sortedCounter(customers.map((c) => c.recency));
      const fc = sortedCounter(customers.map((c) => c.frequency));
      const mc = sortedCounter(customers.map((c) => c.monetary));
      customers.forEach((c) => {
        c.R = scoreOf(rc, c.recency, false);
        c.F = scoreOf(fc, c.frequency, true);
        c.M = scoreOf(mc, c.monetary, true);
        c.seg = SEGMENTS.find((s) => s.test(c.R, c.F, c.M));
      });
      result = { customers, asof };
      TK.status(msg, `Scored ${TK.fmtInt(customers.length)} customers${skipped ? `, skipped ${skipped} unreadable rows` : ""}.`);
      render();
    }

    function render() {
      const cs = result.customers;
      const revenue = d3.sum(cs, (c) => c.monetary);
      report.querySelector(".tk-kpis").innerHTML = [
        [TK.fmtInt(cs.length), "Customers"], [TK.fmtMoney(revenue), "Revenue"],
        [TK.fmt(d3.mean(cs, (c) => c.frequency), 2), "Mean purchases per customer"],
        [new Date(result.asof).toISOString().slice(0, 10), "Analysis date"]
      ].map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      const segs = SEGMENTS.map((s) => {
        const m = cs.filter((c) => c.seg === s);
        return { s, n: m.length, rev: d3.sum(m, (c) => c.monetary), rec: d3.mean(m, (c) => c.recency), freq: d3.mean(m, (c) => c.frequency), mon: d3.mean(m, (c) => c.monetary) };
      }).filter((x) => x.n);
      report.querySelector(".rfm-seg").innerHTML = `<thead><tr><th>Segment</th><th class="tk-num">Customers</th><th class="tk-num">Revenue share</th><th class="tk-num">Days since last</th><th class="tk-num">Purchases</th><th class="tk-num">Spend</th><th>Suggested action</th></tr></thead><tbody>` +
        segs.map((x) => `<tr><td><span class="swatch" style="background:${x.s.color}"></span><strong>${x.s.label}</strong></td><td class="tk-num">${TK.fmtInt(x.n)} (${TK.fmtPct(x.n / cs.length, 0)})</td><td class="tk-num">${TK.fmtPct(x.rev / revenue, 0)}</td><td class="tk-num">${TK.fmtInt(x.rec)}</td><td class="tk-num">${TK.fmt(x.freq, 1)}</td><td class="tk-num">${TK.fmtMoney(x.mon)}</td><td>${x.s.action}</td></tr>`).join("") + "</tbody>";
      drawGrid(cs);
      drawBars(segs, cs.length, revenue);
    }

    function drawGrid(cs) {
      const box = report.querySelector(".rfm-grid");
      box.innerHTML = "";
      const W = 620, H = 380, M = { l: 70, r: 20, t: 16, b: 50 }, cell = Math.min((W - M.l - M.r) / 5, (H - M.t - M.b) / 5);
      const svg = TK.svg(box, W, H, "Grid of customer counts by recency and frequency score");
      const max = d3.max(d3.range(25), (i) => cs.filter((c) => c.R === (i % 5) + 1 && c.F === Math.floor(i / 5) + 1).length) || 1;
      for (let r = 1; r <= 5; r++) for (let f = 1; f <= 5; f++) {
        const n = cs.filter((c) => c.R === r && c.F === f).length;
        const seg = SEGMENTS.find((s) => s.test(r, f, 3));
        const x = M.l + (r - 1) * cell, y = M.t + (5 - f) * cell;
        svg.append("rect").attr("x", x).attr("y", y).attr("width", cell - 3).attr("height", cell - 3).attr("fill", seg.color).attr("fill-opacity", 0.15 + 0.85 * (n / max))
          .append("title").text(`R ${r}, F ${f}: ${n} customers, ${seg.label}`);
        svg.append("text").attr("x", x + cell / 2).attr("y", y + cell / 2 + 4).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700)
          .attr("fill", n / max > 0.55 ? "#fff" : TK.INK).text(n);
      }
      for (let i = 1; i <= 5; i++) {
        svg.append("text").attr("x", M.l + (i - 0.5) * cell).attr("y", M.t + 5 * cell + 16).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text(i);
        svg.append("text").attr("x", M.l - 10).attr("y", M.t + (5 - i + 0.5) * cell + 4).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text(i);
      }
      svg.append("text").attr("x", M.l + 2.5 * cell).attr("y", H - 10).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).text("Recency score (5 = most recent)");
      svg.append("text").attr("transform", `translate(18,${M.t + 2.5 * cell}) rotate(-90)`).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).text("Frequency score");
      const lg = svg.append("g").attr("transform", `translate(${M.l + 5 * cell + 16},${M.t})`);
      SEGMENTS.forEach((s, i) => {
        lg.append("rect").attr("y", i * 20).attr("width", 11).attr("height", 11).attr("fill", s.color);
        lg.append("text").attr("x", 17).attr("y", i * 20 + 10).attr("font-size", 11).attr("fill", TK.INK).text(s.label);
      });
    }

    function drawBars(segs, nCust, revenue) {
      const box = report.querySelector(".rfm-bars");
      box.innerHTML = "";
      const W = 700, H = 40 + segs.length * 34, M = { l: 150, r: 60, t: 24, b: 16 };
      const svg = TK.svg(box, W, H, "Share of customers and of revenue for each segment");
      const x = d3.scaleLinear().domain([0, d3.max(segs, (s) => Math.max(s.n / nCust, s.rev / revenue))]).nice().range([M.l, W - M.r]);
      const y = d3.scaleBand().domain(segs.map((s) => s.s.id)).range([M.t, H - M.b]).padding(0.2);
      segs.forEach((s) => {
        const y0 = y(s.s.id), h = y.bandwidth() / 2;
        svg.append("text").attr("x", M.l - 8).attr("y", y0 + y.bandwidth() / 2 + 4).attr("text-anchor", "end").attr("font-size", 12).attr("fill", TK.INK).text(s.s.label);
        svg.append("rect").attr("x", M.l).attr("y", y0).attr("width", x(s.n / nCust) - M.l).attr("height", h - 1).attr("fill", s.s.color).attr("fill-opacity", 0.45);
        svg.append("rect").attr("x", M.l).attr("y", y0 + h).attr("width", x(s.rev / revenue) - M.l).attr("height", h - 1).attr("fill", s.s.color);
        svg.append("text").attr("x", x(Math.max(s.n / nCust, s.rev / revenue)) + 6).attr("y", y0 + y.bandwidth() / 2 + 4).attr("font-size", 11).attr("fill", TK.MUTED)
          .text(`${TK.fmtPct(s.n / nCust, 0)} / ${TK.fmtPct(s.rev / revenue, 0)}`);
      });
      svg.append("text").attr("x", M.l).attr("y", 14).attr("font-size", 11).attr("fill", TK.MUTED).text("Light bar: share of customers. Solid bar: share of revenue.");
    }

    q("csv").value = sampleCSV();
    q("asof").value = "2026-09-29";
    columns();
    run();
  }

  window.RFM = { mount };
})();
