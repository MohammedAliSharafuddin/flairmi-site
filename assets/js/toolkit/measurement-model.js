/*
 * assets/js/toolkit/measurement-model.js
 *
 * Measurement Model Checker. Takes standardised
 * loadings pasted from JASP (or typed as construct, item, loading) and
 * reports average variance extracted (AVE), composite reliability (CR) and,
 * when an item correlation matrix is available, the heterotrait-monotrait
 * ratio (HTMT). The matrix can be pasted or computed from
 * event-survey-data.csv. A fit-index reader compares CFI, TLI, RMSEA
 * and SRMR with published cutoffs.
 *
 *   AVE  = mean of the squared loadings                 (Fornell and Larcker 1981)
 *   CR   = (sum l)^2 / ((sum l)^2 + sum(1 - l^2))
 *   HTMT = mean heterotrait correlation / sqrt(product of the 2 mean
 *          monotrait correlations)                      (Henseler et al. 2015)
 *
 * The sample loadings come from a CFA of the 3 scales in
 * event-survey-data.csv (lavaan, ML, 200 rows, rounded to 3 places).
 * R/test_toolkit_data_tools.R refits that model and checks them.
 *
 * Usage: window.MeasurementModel.mount("mm-app").
 */
(function () {
  "use strict";
  const TK = window.TK;
  const SAMPLE_LOADINGS = [
    ["Content", "Content_Q1", 0.767], ["Content", "Content_Q2", 0.838], ["Content", "Content_Q3", 0.828], ["Content", "Content_Q4", 0.762],
    ["Value", "Value_Q1", 0.732], ["Value", "Value_Q2", 0.738], ["Value", "Value_Q3", 0.740], ["Value", "Value_Q4", 0.828],
    ["Network", "Network_Q1", 0.774], ["Network", "Network_Q2", 0.793], ["Network", "Network_Q3", 0.775], ["Network", "Network_Q4", 0.791]
  ].map(([construct, item, loading]) => ({ construct, item, loading }));
  const SAMPLE_FIT = { cfi: 1.000, tli: 1.010, rmsea: 0.000, srmr: 0.041 };
  const T = { loading: 0.70, ave: 0.50, cr: 0.70, htmt1: 0.85, htmt2: 0.90 };

  // ---------- parsing ----------
  // Accepts a JASP factor loadings table (Factor, Indicator, ..., Std. Est.)
  // or plain lines of construct, item, loading. Rows that repeat a factor
  // name only on the first line inherit it, as JASP's copied tables do.
  function parseLoadings(text) {
    const rows = TK.parseCSV(text);
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.toLowerCase());
    let iC = 0, iI = 1, iL = -1, start = 0;
    if (head.some((h) => /factor|construct|latent/.test(h))) {
      iC = head.findIndex((h) => /factor|construct|latent/.test(h));
      iI = head.findIndex((h) => /indicator|item/.test(h));
      iL = head.findIndex((h) => /std|standard/.test(h));
      start = 1;
    }
    let last = "";
    const out = [];
    rows.slice(start).forEach((r) => {
      const construct = (r[iC] || "").trim() || last;
      const item = (r[iI] || "").trim();
      const lv = iL >= 0 ? TK.num(r[iL]) : TK.num(r.filter((x) => Number.isFinite(TK.num(x))).slice(-1)[0]);
      if (construct) last = construct;
      if (construct && item && Number.isFinite(lv)) out.push({ construct, item, loading: lv });
    });
    return out;
  }
  // A correlation matrix with item names on the first row (and optionally
  // the first column). Blank or dashed cells are filled from the other half.
  function parseMatrix(text) {
    const rows = TK.parseCSV(text);
    if (rows.length < 2) return null;
    const body = rows.slice(1);
    const hasRowNames = body.every((r) => !Number.isFinite(TK.num(r[0])));
    // With row names, the header either has a corner cell (same length as a
    // body row) or starts straight with the first item name.
    const head = rows[0].map((x) => x.trim());
    const names = hasRowNames && head.length === body[0].length ? head.slice(1) : head.filter((x) => x !== "");
    const R = {};
    names.forEach((a) => (R[a] = {}));
    body.forEach((r, i) => {
      const vals = hasRowNames ? r.slice(1) : r, a = hasRowNames ? r[0].trim() : names[i];
      if (!R[a]) return;
      vals.forEach((v, j) => { const x = TK.num(v); if (Number.isFinite(x) && names[j]) R[a][names[j]] = x; });
    });
    names.forEach((a) => names.forEach((b) => {
      if (R[a][b] === undefined && R[b][a] !== undefined) R[a][b] = R[b][a];
      if (a === b && R[a][b] === undefined) R[a][b] = 1;
    }));
    return { names, R };
  }

  // ---------- statistics ----------
  function groups(loadings) {
    const names = [];
    loadings.forEach((l) => { if (!names.includes(l.construct)) names.push(l.construct); });
    return names.map((name) => ({ name, items: loadings.filter((l) => l.construct === name) }));
  }
  function constructStats(loadings) {
    return groups(loadings).map((g) => {
      const l = g.items.map((x) => x.loading), s = l.reduce((a, b) => a + b, 0);
      const err = l.reduce((a, b) => a + (1 - b * b), 0);
      const ave = l.reduce((a, b) => a + b * b, 0) / l.length;
      return { name: g.name, k: l.length, ave, sqrtAve: Math.sqrt(ave), cr: (s * s) / (s * s + err), low: g.items.filter((x) => x.loading < T.loading).map((x) => x.item) };
    });
  }
  function htmt(loadings, R) {
    const g = groups(loadings), out = [], missing = [];
    const r = (a, b) => (R[a] && R[a][b] !== undefined ? R[a][b] : (missing.includes(a + " x " + b) || missing.push(a + " x " + b), NaN));
    const mono = (it) => { const v = []; for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) v.push(r(it[i].item, it[j].item)); return TK.mean(v); };
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const het = [];
      g[i].items.forEach((a) => g[j].items.forEach((b) => het.push(r(a.item, b.item))));
      const value = TK.mean(het) / Math.sqrt(mono(g[i].items) * mono(g[j].items));
      out.push({ a: g[i].name, b: g[j].name, value });
    }
    return { pairs: out, missing };
  }
  function corMatrix(rows, items) {
    const cols = items.map((it) => rows.map((r) => TK.num(r[it])));
    const keep = rows.map((_, i) => cols.every((c) => Number.isFinite(c[i])));
    const x = cols.map((c) => c.filter((_, i) => keep[i]));
    const m = x.map(TK.mean), n = x[0].length;
    const R = {};
    items.forEach((a, i) => {
      R[a] = {};
      items.forEach((b, j) => {
        let sab = 0, saa = 0, sbb = 0;
        for (let k = 0; k < n; k++) { const da = x[i][k] - m[i], db = x[j][k] - m[j]; sab += da * db; saa += da * da; sbb += db * db; }
        R[a][b] = sab / Math.sqrt(saa * sbb);
      });
    });
    return { R, n };
  }
  function fromData(rows, loadings) {
    const c = corMatrix(rows, loadings.map((l) => l.item));
    return { constructs: constructStats(loadings), htmt: htmt(loadings, c.R).pairs, n: c.n };
  }
  function readFit(f) {
    return [
      { key: "cfi", name: "CFI", value: f.cfi, ok: f.cfi >= 0.95, rule: "close to 0.95 or above" },
      { key: "tli", name: "TLI", value: f.tli, ok: f.tli >= 0.95, rule: "close to 0.95 or above" },
      { key: "rmsea", name: "RMSEA", value: f.rmsea, ok: f.rmsea <= 0.06, rule: "close to 0.06 or below" },
      { key: "srmr", name: "SRMR", value: f.srmr, ok: f.srmr <= 0.08, rule: "close to 0.08 or below" }
    ].filter((x) => Number.isFinite(x.value));
  }

  // ---------- the tool ----------
  function mount(rootId) {
    const root = document.getElementById(rootId);
    if (!root || !TK || !window.TKData) return;
    let dataRows = [], corSource = "data";
    const sampleText = "Factor\tIndicator\tStd. Est.\n" + SAMPLE_LOADINGS.map((l) => `${l.construct}\t${l.item}\t${l.loading.toFixed(3)}`).join("\n");

    root.innerHTML = `
      <div class="tk-split">
        <div class="tk-panel">
          <h3>1. Standardised loadings</h3>
          <p class="tk-help">Paste JASP's factor loadings table, or type one line per item: construct, item, standardised loading.</p>
          <textarea class="tk-mono" data-k="loadings" rows="10" aria-label="Standardised loadings"></textarea>
          <div class="tk-row"><button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button><button type="button" class="toolkit-btn secondary" data-a="clear">Clear</button></div>
        </div>
        <div class="tk-panel">
          <h3>2. Item correlations, for HTMT</h3>
          <label class="tk-check-row"><input type="radio" name="${rootId}-cor" value="data" checked> Compute from a data file</label>
          <div class="mm-loader"></div>
          <label class="tk-check-row"><input type="radio" name="${rootId}-cor" value="paste"> Paste a correlation matrix with item names on the first row</label>
          <textarea class="tk-mono" data-k="matrix" rows="5" aria-label="Correlation matrix"></textarea>
        </div>
      </div>
      <div class="tk-panel">
        <h3>3. Fit indices</h3>
        <div class="tk-grid">${["cfi", "tli", "rmsea", "srmr"].map((k) => `<label>${k.toUpperCase()}<input type="number" step="0.001" data-k="${k}" value="${SAMPLE_FIT[k]}"></label>`).join("")}</div>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title">Measurement model check</h3>
        <h4>Convergent validity and reliability</h4>
        <div class="tk-table-wrap"><table class="tk-table mm-con"></table></div>
        <div class="mm-low"></div>
        <h4>Discriminant validity, HTMT</h4>
        <div class="mm-htmt"></div>
        <h4>Model fit</h4>
        <div class="tk-table-wrap"><table class="tk-table mm-fit"></table></div>
        <p class="tk-help">Cutoffs are guidelines from simulation studies and published practice. Report the values themselves, and judge them together with the theory behind the model.</p>
      </div>`;
    const report = root.querySelector(".tk-report");
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    q("loadings").value = sampleText;
    const loader = window.TKData.loader({ file: "event-survey-data.csv", label: "the sample survey file", required: SAMPLE_LOADINGS.map((l) => l.item),
      onLoad(parsed) { dataRows = parsed.rows; render(); } });
    root.querySelector(".mm-loader").appendChild(loader);
    root.appendChild(TK.exportRow(report, "measurement-model-check"));
    root.querySelectorAll("textarea, input").forEach((el) => el.addEventListener("input", () => { if (el.type === "radio") corSource = el.value; render(); }));
    root.querySelectorAll('input[type="radio"]').forEach((el) => el.addEventListener("change", () => { corSource = el.value; render(); }));
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "sample") { q("loadings").value = sampleText; Object.keys(SAMPLE_FIT).forEach((k) => (q(k).value = SAMPLE_FIT[k])); }
      if (a.dataset.a === "clear") { q("loadings").value = ""; q("matrix").value = ""; ["cfi", "tli", "rmsea", "srmr"].forEach((k) => (q(k).value = "")); }
      render();
    });
    const badge = (ok, txt) => `<span class="tk-badge ${ok ? "pass" : "fail"}">${txt || (ok ? "meets" : "below")}</span>`;

    function render() {
      const L = parseLoadings(q("loadings").value);
      const con = constructStats(L);
      root.querySelector(".mm-con").innerHTML = con.length ? `<thead><tr><th>Construct</th><th class="tk-num">Items</th><th class="tk-num">AVE</th><th></th><th class="tk-num">&radic;AVE</th><th class="tk-num">CR</th><th></th></tr></thead><tbody>
        ${con.map((c) => `<tr><td>${TK.esc(c.name)}</td><td class="tk-num">${c.k}</td><td class="tk-num">${TK.fmt(c.ave, 3)}</td><td>${badge(c.ave >= T.ave, c.ave >= T.ave ? "&ge; 0.50" : "&lt; 0.50")}</td><td class="tk-num">${TK.fmt(c.sqrtAve, 3)}</td><td class="tk-num">${TK.fmt(c.cr, 3)}</td><td>${badge(c.cr >= T.cr, c.cr >= T.cr ? "&ge; 0.70" : "&lt; 0.70")}</td></tr>`).join("")}</tbody>`
        : `<tbody><tr><td class="tk-help">Paste loadings to begin.</td></tr></tbody>`;
      const low = con.flatMap((c) => c.low);
      root.querySelector(".mm-low").innerHTML = con.length ? `<p class="tk-help">${low.length ? `Loadings below 0.70: ${low.map(TK.esc).join(", ")}. Hair et al. (2019) treat 0.50 as the floor and 0.70 or more as ideal.` : `Every loading is 0.70 or more, the level Hair et al. (2019) describe as ideal.`}</p>` : "";
      const hbox = root.querySelector(".mm-htmt");
      let R = null, note = "";
      if (corSource === "paste") { const m = parseMatrix(q("matrix").value); R = m ? m.R : null; note = "from the pasted matrix"; }
      else if (dataRows.length) {
        const items = L.map((l) => l.item).filter((it) => dataRows[0] && it in dataRows[0]);
        if (items.length === L.length && L.length) { const c = corMatrix(dataRows, items); R = c.R; note = `Pearson correlations from the data file, ${c.n} complete rows`; }
        else note = "some items are missing from the data file";
      }
      const g = groups(L);
      if (g.length < 2) hbox.innerHTML = `<p class="tk-help">HTMT needs at least 2 constructs.</p>`;
      else if (!R) hbox.innerHTML = `<p class="tk-help">Load the data file or paste a correlation matrix to compute HTMT${note ? ", " + TK.esc(note) : ""}.</p>`;
      else {
        const h = htmt(L, R);
        hbox.innerHTML = h.missing.length ? `<p class="tk-warn">The matrix lacks ${h.missing.length} correlations, for example ${TK.esc(h.missing[0])}.</p>` :
          `<div class="tk-table-wrap"><table class="tk-table"><thead><tr><th>Pair</th><th class="tk-num">HTMT</th><th>Below 0.85</th><th>Below 0.90</th></tr></thead><tbody>
          ${h.pairs.map((p) => `<tr><td>${TK.esc(p.a)} and ${TK.esc(p.b)}</td><td class="tk-num">${TK.fmt(p.value, 3)}</td><td>${badge(Math.abs(p.value) < T.htmt1, Math.abs(p.value) < T.htmt1 ? "yes" : "no")}</td><td>${badge(Math.abs(p.value) < T.htmt2, Math.abs(p.value) < T.htmt2 ? "yes" : "no")}</td></tr>`).join("")}
          </tbody></table></div><p class="tk-help">Correlations ${TK.esc(note)}. HTMT is read on its absolute value. Henseler, Ringle and Sarstedt (2015) discuss 0.85 as the stricter threshold and 0.90 as the more lenient one.</p>`;
      }
      const fit = readFit({ cfi: TK.num(q("cfi").value), tli: TK.num(q("tli").value), rmsea: TK.num(q("rmsea").value), srmr: TK.num(q("srmr").value) });
      root.querySelector(".mm-fit").innerHTML = fit.length ? `<thead><tr><th>Index</th><th class="tk-num">Value</th><th>Guideline, Hu and Bentler (1999)</th><th></th></tr></thead><tbody>
        ${fit.map((f) => `<tr><td>${f.name}</td><td class="tk-num">${TK.fmt(f.value, 3)}</td><td>${f.rule}</td><td>${badge(f.ok, f.ok ? "meets" : "misses")}</td></tr>`).join("")}</tbody>` : `<tbody><tr><td class="tk-help">Enter fit indices from JASP's CFA output.</td></tr></tbody>`;
      const tli = fit.find((f) => f.key === "tli");
      if (tli && tli.value > 1) root.querySelector(".mm-fit").insertAdjacentHTML("beforeend", `<tbody><tr><td colspan="4" class="tk-help">TLI above 1 happens when the model's chi-square falls below its degrees of freedom. Report it as it is.</td></tr></tbody>`);
    }
    render();
    loader.loadServed();
  }

  window.MeasurementModel = { mount, SAMPLE_LOADINGS, SAMPLE_FIT, THRESHOLDS: T, compute: { parseLoadings, parseMatrix, constructStats, htmt, corMatrix, fromData, readFit } };
})();
