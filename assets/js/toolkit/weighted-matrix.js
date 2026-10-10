/*
 * assets/js/toolkit/weighted-matrix.js
 *
 * Shared engine for weighted decision matrices: options scored against
 * weighted criteria, each option's total the weighted mean of its scores.
 * scored-grid.js could not carry this, since it fixes every item to impact
 * times likelihood with no criteria weights. Two configurations live here:
 * the Weighted Decision Matrix and the Ethical Decision
 * Matrix, which also ranks the options on one "contrast" criterion
 * alone, so the user sees where the statistically strongest option lands
 * once ethical criteria carry weight.
 *
 * Usage: window.WeightedMatrix.weighted("wdm-app") or .ethical("edm-app").
 * window.WeightedMatrix.compute.score is also run by R/test_toolkit_data_tools.R.
 */
(function () {
  "use strict";
  const TK = window.TK;

  // ---------- pure calculation ----------
  // Weighted total = sum(weight x score) / sum(weight), on the score scale.
  function score(state) {
    const w = state.criteria.map((c) => Math.max(0, TK.num(c.weight, 0)));
    const tw = w.reduce((s, x) => s + x, 0) || 1;
    const contrib = state.options.map((o) => state.criteria.map((c, i) => (w[i] * TK.num((o.scores || [])[i], 0)) / tw));
    const totals = contrib.map((r) => r.reduce((s, x) => s + x, 0));
    const order = totals.map((t, i) => i).sort((a, b) => totals[b] - totals[a]);
    const ci = state.criteria.findIndex((c) => c.contrast);
    let evidenceBest = null;
    if (ci >= 0 && state.options.length) {
      let b = 0;
      state.options.forEach((o, i) => { if (TK.num(o.scores[ci], 0) > TK.num(state.options[b].scores[ci], 0)) b = i; });
      evidenceBest = state.options[b].name;
    }
    return { weights: w, weightTotal: tw, contrib, totals, ranking: order.map((i) => state.options[i].name), order, evidenceBest, contrastIndex: ci };
  }

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const max = config.scaleMax || 5;
    let state = TK.store.get(config.storeKey, null) || config.sample();
    const save = () => TK.store.set(config.storeKey, state);

    root.innerHTML = `
      <div class="tk-toolbar">
        <label class="tk-grow">Decision <input type="text" data-k="title"></label>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="blank">Start blank</button>
      </div>
      ${config.intro ? `<div class="tk-help wm-intro"></div>` : ""}
      <div class="tk-table-wrap"><table class="tk-table wm-input"></table></div>
      <div class="tk-row">
        <button type="button" class="toolkit-btn secondary" data-a="add-crit">Add criterion</button>
        <button type="button" class="toolkit-btn secondary" data-a="add-opt">Add option</button>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="tk-kpis wm-kpis"></div>
        <div class="tk-chart-box wm-chart"></div>
        <div class="wm-note"></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, () => TK.slug(state.title, config.rootId), [
      { label: "Download CSV", run: (st) => { const r = score(state); TK.downloadText(TK.toCSV([["Option"].concat(state.criteria.map((c) => `${c.name} (weight ${c.weight})`), ["Weighted total"])].concat(state.options.map((o, i) => [o.name].concat(o.scores, [+r.totals[i].toFixed(4)])))), TK.slug(state.title, config.rootId) + ".csv", "text/csv"); TK.status(st, "CSV saved."); } }
    ]));
    const titleEl = root.querySelector('[data-k="title"]');
    titleEl.addEventListener("input", () => { state.title = titleEl.value; save(); renderOut(); });
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      const k = a.dataset.a;
      if (k === "sample") state = config.sample();
      else if (k === "blank") state = { title: "", criteria: [{ name: "Criterion 1", weight: 50 }, { name: "Criterion 2", weight: 50 }], options: [{ name: "Option A", scores: [3, 3] }, { name: "Option B", scores: [3, 3] }] };
      else if (k === "add-crit") { state.criteria.push({ name: "Criterion " + (state.criteria.length + 1), weight: 10 }); state.options.forEach((o) => o.scores.push(3)); }
      else if (k === "add-opt") state.options.push({ name: "Option " + String.fromCharCode(65 + (state.options.length % 26)), scores: state.criteria.map(() => 3) });
      else if (k === "rm-crit") { const i = Number(a.dataset.i); state.criteria.splice(i, 1); state.options.forEach((o) => o.scores.splice(i, 1)); }
      else if (k === "rm-opt") state.options.splice(Number(a.dataset.i), 1);
      else return;
      save();
      renderAll();
    });

    function renderInput() {
      const t = root.querySelector(".wm-input");
      const tw = state.criteria.reduce((s, c) => s + Math.max(0, TK.num(c.weight, 0)), 0);
      t.innerHTML = `<thead><tr><th>Criterion</th><th class="tk-num">Weight</th>${state.options.map((o, j) => `<th><input type="text" data-o="${j}" value="${TK.esc(o.name)}" aria-label="Option name"><button type="button" class="scored-item-remove" data-a="rm-opt" data-i="${j}" aria-label="Remove option">&times;</button></th>`).join("")}<th></th></tr></thead><tbody>
        ${state.criteria.map((c, i) => `<tr data-c="${i}"><td><input type="text" data-cf="name" value="${TK.esc(c.name)}" aria-label="Criterion name">${c.help ? `<span class="tk-help">${TK.esc(c.help)}</span>` : ""}</td>
          <td class="tk-num"><input type="number" data-cf="weight" min="0" step="1" value="${TK.esc(c.weight)}" aria-label="Weight"></td>
          ${state.options.map((o, j) => `<td><input type="number" min="1" max="${max}" step="1" data-s="${j}" value="${TK.esc(o.scores[i])}" aria-label="${TK.esc(o.name)} on ${TK.esc(c.name)}"></td>`).join("")}
          <td><button type="button" class="scored-item-remove" data-a="rm-crit" data-i="${i}" aria-label="Remove criterion">&times;</button></td></tr>`).join("")}
        <tr class="tk-group"><td>Weights total ${tw}</td><td></td><td colspan="${state.options.length + 1}" class="tk-help">Score each option from 1 (poor) to ${max} (strong) on each criterion. Weights are relative, so they need not add up to 100.</td></tr></tbody>`;
      t.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
        if (inp.dataset.o !== undefined) state.options[Number(inp.dataset.o)].name = inp.value;
        else {
          const c = state.criteria[Number(inp.closest("tr").dataset.c)];
          if (inp.dataset.cf === "name") c.name = inp.value;
          else if (inp.dataset.cf === "weight") c.weight = Math.max(0, TK.num(inp.value, 0));
          else state.options[Number(inp.dataset.s)].scores[state.criteria.indexOf(c)] = Math.min(max, Math.max(1, TK.num(inp.value, 1)));
        }
        save();
        renderOut();
      }));
      t.querySelectorAll('[data-cf="weight"]').forEach((inp) => inp.addEventListener("change", renderInput));
    }

    function renderOut() {
      report.querySelector(".tk-report-title").textContent = state.title || config.defaultTitle;
      if (config.intro) root.querySelector(".wm-intro").innerHTML = config.intro;
      const r = score(state);
      const box = report.querySelector(".wm-chart");
      box.innerHTML = "";
      if (!state.options.length || !state.criteria.length) { report.querySelector(".wm-kpis").innerHTML = `<p class="tk-help">Add at least one option and one criterion.</p>`; return; }
      const best = r.order[0], second = r.order[1];
      report.querySelector(".wm-kpis").innerHTML = `
        <div class="tk-kpi"><span class="tk-kpi-v tk-kpi-text">${TK.esc(state.options[best].name)}</span><span class="tk-kpi-l">Highest weighted score, ${TK.fmt(r.totals[best], 2)} of ${max}</span></div>
        ${second !== undefined ? `<div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(r.totals[best] - r.totals[second], 2)}</span><span class="tk-kpi-l">Lead over ${TK.esc(state.options[second].name)}</span></div>` : ""}
        ${r.evidenceBest ? `<div class="tk-kpi"><span class="tk-kpi-v tk-kpi-text">${TK.esc(r.evidenceBest)}</span><span class="tk-kpi-l">Strongest on ${TK.esc(state.criteria[r.contrastIndex].name)} alone</span></div>
          <div class="tk-kpi"><span class="tk-kpi-v">${r.ranking.indexOf(r.evidenceBest) + 1} of ${r.ranking.length}</span><span class="tk-kpi-l">Its rank once every criterion counts</span></div>` : ""}`;
      // Stacked horizontal bars, drawn at the box's own width so labels keep
      // their size on a phone. Narrow boxes put each name above its bar.
      const n = state.options.length, W = Math.max(300, Math.min(760, box.clientWidth || 760)), narrow = W < 520;
      const rowH = narrow ? 56 : 40, M = { l: narrow ? 8 : 170, r: 44, t: 10, b: 30 };
      const legendRows = [];
      let cur = [], lw = 0;
      state.criteria.forEach((c, ci) => {
        const t = `${c.name} (${TK.fmt((r.weights[ci] / r.weightTotal) * 100, 0)}%)`, tw = 22 + t.length * 6.2;
        if (lw + tw > W - M.l - 8 && cur.length) { legendRows.push(cur); cur = []; lw = 0; }
        cur.push({ t, ci, x: lw });
        lw += tw;
      });
      if (cur.length) legendRows.push(cur);
      const H = M.t + M.b + n * rowH + legendRows.length * 18;
      const svg = TK.svg(box, W, H, "Weighted score of each option, split by criterion");
      const x = d3.scaleLinear().domain([0, max]).range([M.l, W - M.r]);
      const axisY = M.t + n * rowH;
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${axisY})`).call(d3.axisBottom(x).ticks(max)));
      r.order.forEach((oi, k) => {
        const y = M.t + k * rowH, barY = narrow ? y + 20 : y + 6, barH = narrow ? rowH - 26 : rowH - 12;
        const name = state.options[oi].name, cut = narrow ? 44 : 26;
        let acc = 0;
        svg.append("text").attr("x", narrow ? M.l : M.l - 8).attr("y", narrow ? y + 14 : y + rowH / 2 + 4).attr("text-anchor", narrow ? "start" : "end").attr("font-size", 12).attr("font-weight", k === 0 ? 700 : 400).attr("fill", TK.INK).text(name.length > cut ? name.slice(0, cut - 1) + "." : name).append("title").text(name);
        r.contrib[oi].forEach((v, ci) => {
          svg.append("rect").attr("x", x(acc)).attr("y", barY).attr("width", Math.max(0, x(acc + v) - x(acc))).attr("height", barH).attr("fill", TK.PALETTE[ci % TK.PALETTE.length]).attr("stroke", "#fff")
            .append("title").text(`${state.criteria[ci].name}: ${TK.fmt(v, 2)}`);
          acc += v;
        });
        svg.append("text").attr("x", x(acc) + 5).attr("y", barY + barH / 2 + 4).attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK).text(TK.fmt(acc, 2));
      });
      legendRows.forEach((row, li) => {
        const lg = svg.append("g").attr("transform", `translate(${M.l},${axisY + 34 + li * 18})`);
        row.forEach(({ t, ci, x: lx }) => {
          lg.append("rect").attr("x", lx).attr("y", -9).attr("width", 10).attr("height", 10).attr("fill", TK.PALETTE[ci % TK.PALETTE.length]);
          lg.append("text").attr("x", lx + 14).attr("y", 0).attr("font-size", 11).attr("fill", TK.MUTED).text(t);
        });
      });
      report.querySelector(".wm-note").innerHTML = config.note ? config.note(state, r) : "";
    }

    function renderAll() {
      titleEl.value = state.title || "";
      renderInput();
      renderOut();
    }
    renderAll();
    let resizeTimer = null, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderOut, 150);
    });
  }

  // ---------- configurations ----------
  const samples = {
    weighted: () => ({ title: "Choose a venue for the conference", criteria: [
      { name: "Cost", weight: 30 }, { name: "Capacity", weight: 20 }, { name: "Location", weight: 25 }, { name: "AV quality", weight: 15 }, { name: "Catering", weight: 10 }],
      options: [
        { name: "City hotel ballroom", scores: [2, 4, 5, 4, 5] },
        { name: "University hall", scores: [5, 5, 3, 3, 2] },
        { name: "Waterfront pavilion", scores: [3, 3, 4, 2, 4] }] }),
    ethical: () => ({ title: "Act on the no-show result?", criteria: [
      { name: "Statistical evidence", weight: 15, contrast: true, help: "How directly the data back the option." },
      { name: "Utility", weight: 20, help: "Net benefit across everyone affected." },
      { name: "Rights", weight: 25, help: "Respects what each person is owed, such as a seat they paid for." },
      { name: "Justice", weight: 25, help: "Treats groups alike unless a relevant reason justifies a difference." },
      { name: "Care", weight: 15, help: "Attends to the people in their actual circumstances." }],
      options: [
        { name: "Overbook VIP sessions by 20%", scores: [5, 4, 1, 2, 1] },
        { name: "Deposit for VIP buyers only", scores: [4, 3, 3, 2, 2] },
        { name: "Reminders and free transfers for all", scores: [2, 3, 5, 5, 4] }] })
  };

  function weighted(rootId) {
    mount({ rootId, storeKey: "flairmi-weighted-matrix-v1", defaultTitle: "Weighted decision matrix", sample: samples.weighted,
      note: (s, r) => `<p class="tk-help">Weighted score = sum of weight &times; score, divided by the sum of the weights. Change a weight to see whether the winner holds. If a small change in one weight reorders the top 2, the choice rests on that judgement.</p>` });
  }
  function ethical(rootId) {
    mount({ rootId, storeKey: "flairmi-ethical-matrix-v1", defaultTitle: "Ethical decision matrix", sample: samples.ethical,
      intro: `The sample case: in the sample survey data, 7 of 30 VIP ticket holders (23.3%) registered and did not attend, against 21 of 124 Standard (16.9%) and 2 of 46 Student (4.3%). A chi-square test of ticket type against attendance gives &chi;&sup2;(2) = 6.09, p = 0.048, with 1 expected count below 5. Each option below acts on that result.`,
      note: (s, r) => r.evidenceBest ? `<p class="tk-help">${TK.esc(r.evidenceBest)} has the strongest statistical case and ranks ${r.ranking.indexOf(r.evidenceBest) + 1} of ${r.ranking.length} once utility, rights, justice and care carry weight. Set every weight except ${TK.esc(s.criteria[r.contrastIndex].name)} to 0 to see the evidence-only ranking.</p>` : "" });
  }

  window.WeightedMatrix = { mount, weighted, ethical, samples, compute: { score } };
})();
