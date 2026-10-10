/*
 * assets/js/toolkit/vrio.js
 *
 * VRIO Classifier. Walks one resource at a time through the VRIO questions
 * (valuable, rare, costly to imitate, organised to capture the value) as a
 * branching tree with feedback at each step, then compares the user's
 * path with the coding and the Competitive_Implication in
 * vrio-resource-data.csv. The rule uses the file's own labels:
 *   not valuable                      Competitive_Disadvantage
 *   valuable, not rare                Competitive_Parity
 *   valuable, rare, easy to imitate   Temporary_Advantage
 *   V, R, I, not organised            Unexploited_Advantage
 *   all 4                             Sustained_Competitive_Advantage
 * A company (or resource) by outcome cross-tab with expected counts feeds
 * a chi-square test in PocketStat.
 *
 * Usage: window.Vrio.mount("vrio-app"). The pure functions in
 * window.Vrio.compute are also run by R/test_toolkit_data_tools.R.
 */
(function () {
  "use strict";
  const TK = window.TK;
  const REQUIRED = ["Company", "Resource", "Valuable", "Rare", "Costly_to_Imitate", "Organised", "Competitive_Implication"];
  const OUTCOMES = ["Competitive_Disadvantage", "Competitive_Parity", "Temporary_Advantage", "Unexploited_Advantage", "Sustained_Competitive_Advantage"];
  const KEYS = ["Valuable", "Rare", "Costly_to_Imitate", "Organised"];
  const QUESTIONS = [
    { key: "Valuable", short: "Valuable?", q: "Is it valuable?", help: "Does the resource let the firm take up an opportunity or reduce a threat, so customers pay more or costs fall?",
      no: "A resource with no value leaves the firm behind rivals that hold valuable ones.", yes: "Valuable. Next, ask whether rivals hold it too." },
    { key: "Rare", short: "Rare?", q: "Is it rare?", help: "Do only a few competing firms control it?",
      no: "Valuable and common: every rival has it, so it keeps the firm level with them.", yes: "Valuable and rare. Next, ask how hard it is to copy." },
    { key: "Costly_to_Imitate", short: "Costly to imitate?", q: "Is it costly to imitate?", help: "Would a firm without it face a cost disadvantage in building or buying it, for example because of history, ambiguity or social complexity?",
      no: "Rivals can copy it at modest cost, so the lead lasts only until they do.", yes: "Valuable, rare and hard to copy. The last question is about the firm itself." },
    { key: "Organised", short: "Organised?", q: "Is the firm organised to capture the value?", help: "Do its structure, systems, controls and incentives let it use the resource fully?",
      no: "The advantage is there and the firm is leaving it unused.", yes: "All 4 conditions hold." }
  ];
  const label = (s) => String(s).replace(/_/g, " ");
  const yes = (v) => /^(yes|y|true|1)$/i.test(String(v).trim());

  // ---------- pure calculations ----------
  function classify(v, r, i, o) {
    if (!v) return "Competitive_Disadvantage";
    if (!r) return "Competitive_Parity";
    if (!i) return "Temporary_Advantage";
    if (!o) return "Unexploited_Advantage";
    return "Sustained_Competitive_Advantage";
  }
  // Answers stop at the first "No": later questions are not asked.
  function pathOf(answers) {
    const out = [];
    for (const a of answers) { out.push(a); if (!a) break; }
    return out;
  }
  function crosstab(rows, by) {
    const rnames = [];
    rows.forEach((r) => { if (!rnames.includes(r[by])) rnames.push(r[by]); });
    const cols = OUTCOMES.filter((o) => rows.some((r) => r.Competitive_Implication === o));
    const counts = rnames.map((rn) => cols.map((c) => rows.filter((r) => r[by] === rn && r.Competitive_Implication === c).length));
    const n = rows.length;
    const rt = counts.map((r) => r.reduce((s, x) => s + x, 0)), ct = cols.map((_, j) => counts.reduce((s, r) => s + r[j], 0));
    const expected = counts.map((r, i) => r.map((_, j) => (rt[i] * ct[j]) / n));
    let chisq = 0;
    counts.forEach((r, i) => r.forEach((x, j) => { if (expected[i][j] > 0) chisq += Math.pow(x - expected[i][j], 2) / expected[i][j]; }));
    const cells = rnames.length * cols.length;
    const low = expected.flat().filter((e) => e < 5).length;
    return { rows: rnames, cols, counts, expected, rowTotals: rt, colTotals: ct, chisq, df: (rnames.length - 1) * (cols.length - 1), lowShare: low / cells, low, cells };
  }
  function compute(rows) {
    const out = rows.map((r) => {
      const a = KEYS.map((k) => yes(r[k]));
      const tool = classify.apply(null, a);
      return { company: r.Company, resource: r.Resource, answers: a, tool, file: r.Competitive_Implication, match: tool === r.Competitive_Implication };
    });
    return { rows: out, matches: out.filter((x) => x.match).length, crosstab: crosstab(rows, "Company") };
  }

  // ---------- drawing: the VRIO tree as a staircase ----------
  function drawTree(box, path, fileAnswers) {
    box.innerHTML = "";
    const W = 420, stepH = 62, H = 5 * stepH + 10;
    const svg = TK.svg(box, W, H, "VRIO decision tree with the chosen path highlighted");
    const xQ = 4, wQ = 160, xO = 204, wO = 212;
    const reached = path.length;
    QUESTIONS.forEach((q, i) => {
      const y = 10 + i * stepH, active = i < reached, said = path[i];
      const fileSaid = fileAnswers ? fileAnswers[i] : undefined;
      svg.append("rect").attr("x", xQ).attr("y", y).attr("width", wQ).attr("height", 40).attr("fill", active ? TK.INK : "#fff").attr("stroke", TK.INK);
      svg.append("text").attr("x", xQ + 10).attr("y", y + 25).attr("font-size", 15).attr("font-weight", 700).attr("fill", active ? "#fff" : TK.INK).text(q.short);
      // "No" branch to the outcome on the right.
      const noTaken = active && said === false;
      svg.append("line").attr("x1", xQ + wQ).attr("x2", xO).attr("y1", y + 20).attr("y2", y + 20).attr("stroke", noTaken ? TK.BAD : "#b0b0b0").attr("stroke-width", noTaken ? 3 : 1.2);
      svg.append("text").attr("x", (xQ + wQ + xO) / 2).attr("y", y + 14).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", TK.MUTED).text("No");
      const oc = OUTCOMES[i];
      svg.append("rect").attr("x", xO).attr("y", y + 4).attr("width", wO).attr("height", 32).attr("fill", noTaken ? "#fbe8e6" : "#f7f7f7").attr("stroke", noTaken ? TK.BAD : "#d0d0d0").attr("stroke-width", noTaken ? 2 : 1);
      svg.append("text").attr("x", xO + 8).attr("y", y + 25).attr("font-size", 13.5).attr("font-weight", noTaken ? 700 : 400).attr("fill", TK.INK).text(label(oc));
      // "Yes" branch down to the next question.
      const yesTaken = active && said === true;
      svg.append("line").attr("x1", xQ + 30).attr("x2", xQ + 30).attr("y1", y + 40).attr("y2", y + stepH).attr("stroke", yesTaken ? TK.GOOD : "#b0b0b0").attr("stroke-width", yesTaken ? 3 : 1.2);
      svg.append("text").attr("x", xQ + 38).attr("y", y + 56).attr("font-size", 12).attr("fill", TK.MUTED).text("Yes");
      if (active && fileSaid !== undefined && fileSaid !== said) svg.append("text").attr("x", xQ + wQ - 8).attr("y", y + 56).attr("text-anchor", "end").attr("font-size", 12).attr("fill", TK.BAD).text(`file: ${fileSaid ? "Yes" : "No"}`);
    });
    const y = 10 + 4 * stepH, done = reached === 4 && path[3] === true;
    svg.append("rect").attr("x", xQ).attr("y", y).attr("width", 260).attr("height", 40).attr("fill", done ? "#e3f4ec" : "#f7f7f7").attr("stroke", done ? TK.GOOD : "#d0d0d0").attr("stroke-width", done ? 2 : 1);
    svg.append("text").attr("x", xQ + 10).attr("y", y + 25).attr("font-size", 13.5).attr("font-weight", done ? 700 : 400).attr("fill", TK.INK).text(label(OUTCOMES[4]));
  }

  // ---------- the tool ----------
  function mount(rootId) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK || !window.TKData) return;
    let data = null, rows = [], pick = 0, answers = [], own = "", by = "Company";

    root.innerHTML = `<div class="vr-loader"></div>
      <div class="tk-toolbar">
        <label class="tk-grow">Resource from the file <select data-k="pick" aria-label="Resource from the file"></select></label>
        <label class="tk-grow">Or name your own resource <input type="text" data-k="own" placeholder="e.g. Our loyalty programme data"></label>
        <button type="button" class="toolkit-btn secondary" data-a="restart">Start again</button>
      </div>
      <div class="tk-split">
        <div class="tk-panel vr-step" aria-live="polite"></div>
        <div class="tk-chart-box vr-tree"></div>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title">Resource file, VRIO results</h3>
        <div class="vr-all"></div>
        <h4>Cross-tab for a chi-square test</h4>
        <div class="tk-toolbar"><label>Rows <select data-k="by"><option value="Company">Company</option><option value="Resource">Resource</option></select></label></div>
        <div class="vr-xtab"></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    const loader = window.TKData.loader({ file: "vrio-resource-data.csv", label: "the sample file", required: REQUIRED,
      onLoad(parsed) { rows = parsed.rows; data = compute(rows); pick = 0; own = ""; answers = []; fillPick(); renderAll(); } });
    root.querySelector(".vr-loader").appendChild(loader);
    root.appendChild(TK.exportRow(report, "vrio-week-7", [
      { label: "Download cross-tab CSV", run: (st) => { if (!data) return; const x = crosstab(rows, by); TK.downloadText(TK.toCSV([[by].concat(x.cols)].concat(x.rows.map((r, i) => [r].concat(x.counts[i])))), "vrio-crosstab.csv", "text/csv"); TK.status(st, "CSV saved."); } }
    ]));
    const pickEl = root.querySelector('[data-k="pick"]'), ownEl = root.querySelector('[data-k="own"]');
    pickEl.addEventListener("change", () => { pick = Number(pickEl.value); own = ""; ownEl.value = ""; answers = []; renderWalk(); });
    ownEl.addEventListener("input", () => { own = ownEl.value.trim(); answers = []; renderWalk(); });
    root.querySelector('[data-k="by"]').addEventListener("change", (e) => { by = e.target.value; renderXtab(); });
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "restart") answers = [];
      else if (a.dataset.a === "yes" || a.dataset.a === "no") answers.push(a.dataset.a === "yes");
      else if (a.dataset.a === "back") answers.pop();
      else if (a.dataset.a === "next" && data) { pick = (pick + 1) % data.rows.length; pickEl.value = pick; own = ""; ownEl.value = ""; answers = []; }
      else return;
      renderWalk();
    });

    function fillPick() {
      pickEl.innerHTML = data.rows.map((r, i) => `<option value="${i}">${TK.esc(label(r.company))}: ${TK.esc(label(r.resource))}</option>`).join("");
      pickEl.value = pick;
    }

    function renderWalk() {
      const step = root.querySelector(".vr-step");
      const fromFile = !own && data && data.rows[pick];
      const name = own || (fromFile ? `${label(fromFile.company)}, ${label(fromFile.resource)}` : "");
      const fileAns = fromFile ? fromFile.answers : null;
      const path = pathOf(answers);
      drawTree(root.querySelector(".vr-tree"), path, fileAns);
      if (!name) { step.innerHTML = `<p class="tk-help">Load the sample file or name a resource to begin.</p>`; return; }
      const fb = path.map((a, i) => {
        const q = QUESTIONS[i];
        const agree = fileAns ? fileAns[i] === a : null;
        return `<li><strong>${q.q}</strong> You said ${a ? "Yes" : "No"}. ${TK.esc(a ? q.yes : q.no)}${agree === null ? "" : agree ? ` <span class="tk-pos">The file agrees.</span>` : ` <span class="tk-neg">The file codes ${label(q.key)} as ${fileAns[i] ? "Yes" : "No"}.</span> Look again at the definition, or note why you judge it differently.`}</li>`;
      }).join("");
      const finished = path.length && (path[path.length - 1] === false || path.length === 4);
      let body;
      if (!finished) {
        const q = QUESTIONS[path.length];
        body = `<p class="vr-q"><strong>${q.q}</strong></p><p class="tk-help">${q.help}</p>
          <div class="tk-row"><button type="button" class="toolkit-btn" data-a="yes">Yes</button><button type="button" class="toolkit-btn" data-a="no">No</button>
          ${path.length ? `<button type="button" class="toolkit-btn secondary" data-a="back">Back</button>` : ""}</div>`;
      } else {
        const result = classify.apply(null, [0, 1, 2, 3].map((i) => (i < path.length ? path[i] : true)));
        const verdict = fromFile ? (result === fromFile.file
          ? `<p><span class="tk-badge pass">Matches the file</span> Your path ends at <strong>${label(result)}</strong>, the file's Competitive_Implication.</p>`
          : `<p><span class="tk-badge fail">Differs from the file</span> Your path ends at <strong>${label(result)}</strong>. The file records <strong>${label(fromFile.file)}</strong>.</p>`)
          : `<p>Your path ends at <strong>${label(result)}</strong>.</p>`;
        body = verdict + `<div class="tk-row"><button type="button" class="toolkit-btn secondary" data-a="back">Back</button>${fromFile ? `<button type="button" class="toolkit-btn" data-a="next">Next resource</button>` : ""}</div>`;
      }
      step.innerHTML = `<h3>${TK.esc(name)}</h3>${fb ? `<ol class="tk-list vr-feedback">${fb}</ol>` : ""}${body}`;
    }

    function renderAll() {
      renderWalk();
      const box = root.querySelector(".vr-all");
      if (!data) { box.innerHTML = ""; root.querySelector(".vr-xtab").innerHTML = ""; return; }
      box.innerHTML = `<p><span class="tk-badge ${data.matches === data.rows.length ? "pass" : "fail"}">${data.matches} of ${data.rows.length} rows</span> The VRIO rule gives the same Competitive_Implication as the file.</p>
        <details class="tk-details"><summary>Every resource</summary><div class="tk-table-wrap"><table class="tk-table"><thead><tr><th>Company</th><th>Resource</th>${KEYS.map((k) => `<th>${label(k)}</th>`).join("")}<th>Tool</th><th>File</th></tr></thead><tbody>
        ${data.rows.map((r) => `<tr><td>${TK.esc(label(r.company))}</td><td>${TK.esc(label(r.resource))}</td>${r.answers.map((a) => `<td>${a ? "Yes" : "No"}</td>`).join("")}<td>${TK.esc(label(r.tool))}</td><td>${r.match ? "" : '<span class="tk-neg">'}${TK.esc(label(r.file))}${r.match ? "" : "</span>"}</td></tr>`).join("")}
        </tbody></table></div></details>`;
      renderXtab();
    }

    function renderXtab() {
      const box = root.querySelector(".vr-xtab");
      if (!data) { box.innerHTML = ""; return; }
      const x = crosstab(rows, by);
      box.innerHTML = `<div class="tk-table-wrap"><table class="tk-table"><thead><tr><th>${by}</th>${x.cols.map((c) => `<th class="tk-num">${label(c)}</th>`).join("")}<th class="tk-num">Total</th></tr></thead><tbody>
        ${x.rows.map((r, i) => `<tr><td>${TK.esc(label(r))}</td>${x.counts[i].map((c, j) => `<td class="tk-num">${c} <span class="tk-help">(${TK.fmt(x.expected[i][j], 1)})</span></td>`).join("")}<td class="tk-num">${x.rowTotals[i]}</td></tr>`).join("")}
        <tr class="tk-group"><td>Total</td>${x.colTotals.map((c) => `<td class="tk-num">${c}</td>`).join("")}<td class="tk-num">${rows.length}</td></tr></tbody></table></div>
        <p class="tk-help">Counts, with the count expected under independence in brackets. Pearson chi-square ${TK.fmt(x.chisq, 2)} on ${x.df} degrees of freedom.</p>
        <div class="tk-formula">Test this in PocketStat (chi-square): open vrio-resource-data.csv in <a href="https://mohammedalisharafuddin.github.io/pocketstat/" target="_blank" rel="noopener">PocketStat</a>, choose the chi-square test of association and pick ${by} and Competitive_Implication. ${x.low} of ${x.cells} expected counts fall below 5, so the chi-square approximation is weak here. Read the p-value with care.</div>`;
    }

    renderAll();
    loader.loadServed();
  }

  window.Vrio = { mount, compute: { classify, pathOf, crosstab, compute }, OUTCOMES };
})();
