/*
 * assets/js/toolkit/probability-explorer.js
 *
 * Probability Explorer. Two parts. The coin toss shows
 * probability as a long-run relative frequency: an animated coin, single or
 * batched tosses, an adjustable chance of heads and a running chart of the
 * share of heads against that chance, after Kerrich (1946), who tossed a
 * coin 10,000 times by hand and counted 5,067 heads. The contingency table part reads
 * probability-basics-data.csv (Attendance, Ticket_Type and
 * Payment_Method, all categorical), cross-tabulates any 2 of its columns
 * and reports joint, marginal and conditional probabilities, the addition
 * rule and an independence check for a chosen pair of events.
 *
 * Usage: window.ProbExplorer.mount("prob-app"). The pure functions in
 * window.ProbExplorer.compute are also run by R/test_toolkit_data_tools.R.
 */
(function () {
  "use strict";
  const TK = window.TK;
  const VARS = ["Attendance", "Ticket_Type", "Payment_Method"];
  const label = (s) => String(s).replace(/_/g, " ");

  // ---------- pure calculations ----------
  function levels(rows, v) {
    const out = [];
    rows.forEach((r) => { if (r[v] !== "" && !out.includes(r[v])) out.push(r[v]); });
    return out.sort();
  }
  // Cross-tab of 2 categorical columns with every probability table.
  function table(rows, a, b) {
    const ra = levels(rows, a), cb = levels(rows, b), n = rows.length;
    const counts = ra.map((x) => cb.map((y) => rows.filter((r) => r[a] === x && r[b] === y).length));
    const rowTot = counts.map((r) => r.reduce((s, x) => s + x, 0));
    const colTot = cb.map((_, j) => counts.reduce((s, r) => s + r[j], 0));
    return { a, b, rows: ra, cols: cb, n, counts, rowTot, colTot,
      joint: counts.map((r) => r.map((x) => x / n)),
      rowMarg: rowTot.map((x) => x / n), colMarg: colTot.map((x) => x / n),
      givenRow: counts.map((r, i) => r.map((x) => (rowTot[i] ? x / rowTot[i] : NaN))),
      givenCol: counts.map((r) => r.map((x, j) => (colTot[j] ? x / colTot[j] : NaN))) };
  }
  // Event A is row level i, event B is column level j.
  function events(t, i, j) {
    const pA = t.rowMarg[i], pB = t.colMarg[j], pAB = t.joint[i][j];
    return { pA, pB, pAB, pAorB: pA + pB - pAB, pAgivenB: pB ? pAB / pB : NaN, pBgivenA: pA ? pAB / pA : NaN,
      product: pA * pB, expected: pA * pB * t.n, observed: t.counts[i][j] };
  }
  // n tosses with chance p of heads, from a seeded generator.
  function toss(n, p, rand) {
    const out = [];
    for (let k = 0; k < n; k++) out.push(rand() < p ? 1 : 0);
    return out;
  }

  // ---------- the tool ----------
  function mount(rootId) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK || !window.TKData) return;
    let tab = 0, flips = [], p = 0.5, seed = Date.now() % 100000, rand = window.TKData.rng(seed);
    let rows = [], va = "Ticket_Type", vb = "Attendance", ei = 0, ej = 0, busy = false, lastN = 0;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);

    root.innerHTML = `
      <div class="pe-pane" data-pane="0">
        <div class="pe-coin-wrap"><div class="pe-coin" aria-hidden="true"><span class="pe-face pe-heads">H</span><span class="pe-face pe-tails">T</span></div>
          <p class="pe-last" role="status" aria-live="polite">Toss the coin to begin.</p></div>
        <div class="tk-row">
          <button type="button" class="toolkit-btn" data-a="t1">Toss once</button>
          <button type="button" class="toolkit-btn secondary" data-a="t10">Toss 10</button>
          <button type="button" class="toolkit-btn secondary" data-a="t100">Toss 100</button>
          <button type="button" class="toolkit-btn secondary" data-a="t1000">Toss 1,000</button>
          <button type="button" class="toolkit-btn secondary" data-a="t10000">Toss 10,000</button>
          <button type="button" class="toolkit-btn secondary" data-a="reset">Reset</button>
        </div>
        <label class="tk-inline">Chance of heads <span><input type="number" data-k="p" min="0" max="1" step="0.05" value="0.5"></span></label>
        <p class="tk-help">0.5 is a fair coin. Pressing the same button again adds to the run. A different button, or a new chance, starts a new run.</p>
      </div>
      <div class="pe-pane" data-pane="1" hidden>
        <div class="pe-loader"></div>
        <div class="tk-grid">
          <label>Rows, event A from <select data-k="va">${VARS.map((v) => `<option value="${v}">${label(v)}</option>`).join("")}</select></label>
          <label>Columns, event B from <select data-k="vb">${VARS.map((v) => `<option value="${v}">${label(v)}</option>`).join("")}</select></label>
          <label>Event A <select data-k="ei"></select></label>
          <label>Event B <select data-k="ej"></select></label>
          <label>Show <select data-k="view"><option value="counts">Counts</option><option value="joint">Joint probabilities</option><option value="givenRow">Conditional on the row, P(B | A)</option><option value="givenCol">Conditional on the column, P(A | B)</option></select></label>
        </div>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="tk-kpis pe-kpis"></div>
        <div class="tk-chart-box pe-chart"></div>
        <div class="tk-table-wrap"><table class="tk-table pe-table"></table></div>
        <div class="tk-formula pe-formula"></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    root.prepend(window.TKData.tabs(["Coin toss", "Sample data"], (i) => { tab = i; root.querySelectorAll(".pe-pane").forEach((x) => (x.hidden = Number(x.dataset.pane) !== i)); render(); }));
    const loader = window.TKData.loader({ file: "probability-basics-data.csv", label: "the sample file", required: VARS,
      onLoad(parsed) { rows = parsed.rows; fillEvents(); render(); } });
    root.querySelector(".pe-loader").appendChild(loader);
    root.appendChild(TK.exportRow(report, () => (tab ? "probability-week-3" : "coin-toss")));
    q("va").value = va;
    q("vb").value = vb;

    function fillEvents() {
      if (!rows.length) return;
      const la = levels(rows, va), lb = levels(rows, vb);
      q("ei").innerHTML = la.map((x, i) => `<option value="${i}">${TK.esc(label(x))}</option>`).join("");
      q("ej").innerHTML = lb.map((x, i) => `<option value="${i}">${TK.esc(label(x))}</option>`).join("");
      ei = Math.min(ei, la.length - 1); ej = Math.min(ej, lb.length - 1);
      q("ei").value = ei; q("ej").value = ej;
    }
    ["va", "vb"].forEach((k) => q(k).addEventListener("change", () => {
      const other = k === "va" ? "vb" : "va";
      if (q(k).value === q(other).value) q(other).value = VARS.find((v) => v !== q(k).value);
      va = q("va").value; vb = q("vb").value; ei = 0; ej = 0;
      fillEvents(); render();
    }));
    ["ei", "ej", "view"].forEach((k) => q(k).addEventListener("change", () => { ei = Number(q("ei").value); ej = Number(q("ej").value); render(); }));
    q("p").addEventListener("change", () => { p = Math.min(1, Math.max(0, TK.num(q("p").value, 0.5))); q("p").value = p; flips = []; lastN = 0; rand = window.TKData.rng(++seed); setCoin(null); render(); });

    const coin = root.querySelector(".pe-coin"), last = root.querySelector(".pe-last");
    function setCoin(face, text) {
      coin.classList.remove("pe-spin-h", "pe-spin-t", "pe-show-t");
      if (face === 0) coin.classList.add("pe-show-t");
      last.textContent = text || "Toss the coin to begin.";
    }
    function animate(face, text, done) {
      coin.classList.remove("pe-spin-h", "pe-spin-t", "pe-show-t");
      void coin.offsetWidth; // restart the animation
      coin.classList.add(face ? "pe-spin-h" : "pe-spin-t");
      const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => { setCoin(face, text); done(); }, still ? 0 : 900);
    }
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a || busy) return;
      const k = a.dataset.a;
      if (k === "reset") { flips = []; lastN = 0; rand = window.TKData.rng(++seed); setCoin(null); render(); return; }
      const n = { t1: 1, t10: 10, t100: 100, t1000: 1000, t10000: 10000 }[k];
      if (!n) return;
      // A different batch size starts a new run, so 1 toss after 10,000 is not lost in the chart.
      if (lastN && n !== lastN) { flips = []; render(); }
      lastN = n;
      const got = toss(n, p, rand), h = got.reduce((s, x) => s + x, 0), face = got[got.length - 1];
      busy = true;
      animate(face, n === 1 ? (face ? "Heads." : "Tails.") : `${h} heads and ${n - h} tails in ${TK.fmtInt(n)} tosses. The last one was ${face ? "heads" : "tails"}.`, () => {
        flips = flips.concat(got);
        busy = false;
        render();
      });
    });

    function tiles(items) { return items.map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join(""); }
    const fitW = (box) => Math.max(300, Math.min(760, box.clientWidth || 760));

    function renderCoin() {
      const title = report.querySelector(".tk-report-title"), box = report.querySelector(".pe-chart");
      const n = flips.length, h = flips.reduce((s, x) => s + x, 0);
      title.textContent = "Share of heads as the tosses add up";
      report.querySelector(".pe-kpis").innerHTML = tiles([[TK.fmtInt(n), "Tosses"], [TK.fmtInt(h), "Heads"], [TK.fmtInt(n - h), "Tails"], [n ? TK.fmt(h / n, 3) : "n/a", "Share of heads so far"], [TK.fmt(p, 2), "Chance of heads"]]);
      box.innerHTML = "";
      const W = fitW(box), H = 280, M = { l: 44, r: 16, t: 14, b: 40 };
      const svg = TK.svg(box, W, H, "Running share of heads against the chance of heads");
      const x = d3.scaleLinear().domain([1, Math.max(10, n)]).range([M.l, W - M.r]), y = d3.scaleLinear().domain([0, 1]).range([H - M.b, M.t]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(W < 520 ? 4 : 8).tickFormat(d3.format("~s"))));
      TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5)));
      svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(p)).attr("y2", y(p)).attr("stroke", TK.BAD).attr("stroke-dasharray", "5 4").attr("stroke-width", 2);
      svg.append("text").attr("x", W - M.r).attr("y", y(p) - 6).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.BAD).text(`Chance of heads ${TK.fmt(p, 2)}`);
      svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text("Number of tosses");
      if (n) {
        let run = 0;
        const step = Math.max(1, Math.floor(n / 600));
        const pts = [];
        flips.forEach((f, i) => { run += f; if (i % step === 0 || i === n - 1) pts.push([x(i + 1), y(run / (i + 1))]); });
        svg.append("path").attr("d", d3.line()(pts)).attr("fill", "none").attr("stroke", TK.PALETTE[0]).attr("stroke-width", 2);
        svg.append("circle").attr("cx", pts[pts.length - 1][0]).attr("cy", pts[pts.length - 1][1]).attr("r", 4).attr("fill", TK.INK);
      }
      report.querySelector(".pe-table").innerHTML = n ? `<tbody><tr><td>Last ${Math.min(n, 30)} tosses</td><td class="tk-mono">${flips.slice(-30).map((f) => (f ? "H" : "T")).join(" ")}</td></tr></tbody>` : "";
      report.querySelector(".pe-formula").innerHTML = `Probability as a long-run relative frequency: share of heads = heads / tosses. Short runs wander, and the share settles towards the chance of heads as the tosses add up. Each toss is independent, so a run of tails leaves the next toss at ${TK.fmt(p, 2)}.<br>The experiment follows Kerrich, J. E. (1946), <em>An Experimental Introduction to the Theory of Probability</em>, Copenhagen: Einar Munksgaard. Kerrich tossed a coin 10,000 times by hand and counted 502 heads after 1,000 tosses, 2,533 after 5,000 and 5,067 after 10,000, a share of 0.507.`;
    }

    function renderData() {
      const title = report.querySelector(".tk-report-title"), box = report.querySelector(".pe-chart"), tbl = report.querySelector(".pe-table"), fx = report.querySelector(".pe-formula"), kp = report.querySelector(".pe-kpis");
      box.innerHTML = "";
      title.textContent = `${label(va)} by ${label(vb)}`;
      if (!rows.length) { kp.innerHTML = `<p class="tk-help">Load the sample file.</p>`; tbl.innerHTML = ""; fx.innerHTML = ""; return; }
      const t = table(rows, va, vb), e = events(t, ei, ej), A = label(t.rows[ei]), B = label(t.cols[ej]), view = q("view").value;
      const f3 = (v) => TK.fmt(v, 3);
      kp.innerHTML = tiles([[f3(e.pA), `P(A), ${TK.esc(A)}`], [f3(e.pB), `P(B), ${TK.esc(B)}`], [f3(e.pAB), "P(A and B), joint"], [f3(e.pAorB), "P(A or B)"], [f3(e.pBgivenA), "P(B | A)"], [f3(e.pAgivenB), "P(A | B)"]]);
      const cell = (i, j) => (view === "counts" ? t.counts[i][j] : f3(t[view][i][j]));
      const rowEnd = (i) => (view === "counts" ? t.rowTot[i] : view === "joint" ? f3(t.rowMarg[i]) : view === "givenRow" ? "1.000" : "");
      const colEnd = (j) => (view === "counts" ? t.colTot[j] : view === "joint" ? f3(t.colMarg[j]) : view === "givenCol" ? "1.000" : "");
      tbl.innerHTML = `<thead><tr><th>${label(va)}</th>${t.cols.map((c) => `<th class="tk-num">${TK.esc(label(c))}</th>`).join("")}<th class="tk-num">${view === "joint" ? "Marginal" : "Total"}</th></tr></thead><tbody>
        ${t.rows.map((r, i) => `<tr><td>${TK.esc(label(r))}</td>${t.cols.map((_, j) => `<td class="tk-num${i === ei && j === ej ? " pe-pick" : ""}">${cell(i, j)}</td>`).join("")}<td class="tk-num">${rowEnd(i)}</td></tr>`).join("")}
        <tr class="tk-group"><td>${view === "joint" ? "Marginal" : "Total"}</td>${t.cols.map((_, j) => `<td class="tk-num">${colEnd(j)}</td>`).join("")}<td class="tk-num">${view === "counts" ? t.n : view === "joint" ? "1.000" : ""}</td></tr></tbody>`;
      const gap = Math.abs(e.pAB - e.product);
      fx.innerHTML = `Joint: P(A and B) = ${e.observed} / ${t.n} = ${f3(e.pAB)}.<br>Addition rule: P(A or B) = P(A) + P(B) &minus; P(A and B) = ${f3(e.pA)} + ${f3(e.pB)} &minus; ${f3(e.pAB)} = ${f3(e.pAorB)}.<br>Conditional: P(B | A) = P(A and B) / P(A) = ${f3(e.pAB)} / ${f3(e.pA)} = ${f3(e.pBgivenA)}.<br>Independence check: P(A) &times; P(B) = ${f3(e.product)} against P(A and B) = ${f3(e.pAB)}. ${Math.abs(e.observed - e.expected) < 1 ? `The 2 are close: independent events would give about ${TK.fmt(e.expected, 1)} cases in this cell and the file has ${e.observed}, so these events look nearly independent here.` : `They differ by ${f3(gap)}. Independent events would give about ${TK.fmt(e.expected, 1)} cases in this cell, and the file has ${e.observed}.`} A chi-square test judges whether a gap this size could be chance.`;
    }

    function render() { if (tab) renderData(); else renderCoin(); }
    render();
    loader.loadServed();
    let timer = null, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(render, 150);
    });
  }

  window.ProbExplorer = { mount, compute: { levels, table, events, toss } };
})();
