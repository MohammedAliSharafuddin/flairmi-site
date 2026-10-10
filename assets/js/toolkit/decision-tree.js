/*
 * assets/js/toolkit/decision-tree.js
 *
 * Decision Tree and Expected Value Calculator. Two modes: a sample
 * file (decision-tree-vendor-data.csv, one row per group and option, each
 * option a success or failure chance node), and a blank tree with as many
 * options and outcomes as the user adds. Expected value at a chance node is
 * the sum of probability times payoff over its branches, and the decision
 * node takes the option with the highest expected value.
 *
 * Usage: window.DecisionTree.mount("tree-app"). The pure functions in
 * window.DecisionTree.compute are also run by R/test_toolkit_data_tools.R.
 */
(function () {
  "use strict";
  const TK = window.TK;
  const REQUIRED = ["Group_ID", "Option", "Probability_Success", "Probability_Failure", "Payoff_Success", "Payoff_Failure"];
  const STORE = "flairmi-decision-tree-v1";
  const label = (s) => String(s).replace(/_/g, " ");

  // ---------- pure calculations ----------
  function ev(outcomes) {
    return outcomes.reduce((s, o) => s + TK.num(o.p, 0) * TK.num(o.payoff, 0), 0);
  }
  function probSum(outcomes) {
    return outcomes.reduce((s, o) => s + TK.num(o.p, 0), 0);
  }
  // One tree per row of the file: each option has a success and a failure branch.
  function treeFromRows(rows) {
    const options = rows.map((r) => ({
      name: r.Option,
      outcomes: [
        { label: "Success", p: TK.num(r.Probability_Success), payoff: TK.num(r.Payoff_Success) },
        { label: "Failure", p: TK.num(r.Probability_Failure), payoff: TK.num(r.Payoff_Failure) }
      ]
    }));
    return solve({ options });
  }
  function solve(tree) {
    tree.options.forEach((o) => { o.ev = ev(o.outcomes); o.psum = probSum(o.outcomes); });
    let best = -1;
    tree.options.forEach((o, i) => { if (Number.isFinite(o.ev) && (best < 0 || o.ev > tree.options[best].ev)) best = i; });
    tree.best = best;
    return tree;
  }
  function compute(rows) {
    const ids = [];
    rows.forEach((r) => { if (!ids.includes(r.Group_ID)) ids.push(r.Group_ID); });
    const groups = ids.map((id) => {
      const t = treeFromRows(rows.filter((r) => r.Group_ID === id));
      return { id, tree: t, best: t.best >= 0 ? t.options[t.best].name : "" };
    });
    const optionNames = [];
    rows.forEach((r) => { if (!optionNames.includes(r.Option)) optionNames.push(r.Option); });
    const perRow = rows.map((r) => {
      const p = TK.num(r.Probability_Success), q = TK.num(r.Probability_Failure);
      return { group: r.Group_ID, option: r.Option, p, q, sumOk: Math.abs(p + q - 1) < 1e-9, ev: p * TK.num(r.Payoff_Success) + (1 - p) * TK.num(r.Payoff_Failure) };
    });
    const meanEV = {}, wins = {};
    optionNames.forEach((o) => {
      meanEV[o] = TK.mean(perRow.filter((x) => x.option === o).map((x) => x.ev));
      wins[o] = groups.filter((g) => g.best === o).length;
    });
    return { groups, perRow, optionNames, meanEV, wins, probIssues: perRow.filter((x) => !x.sumOk).length };
  }

  // ---------- drawing ----------
  function draw(box, tree, title) {
    box.innerHTML = "";
    const rowH = 54, n = tree.options.reduce((s, o) => s + Math.max(1, o.outcomes.length), 0);
    const W = 560, H = Math.max(160, n * rowH + 40);
    const svg = TK.svg(box, W, H, title || "Decision tree");
    const xD = 22, xC = 262, xE = 420;
    const yD = H / 2;
    let row = 0;
    svg.append("rect").attr("x", xD - 12).attr("y", yD - 12).attr("width", 24).attr("height", 24).attr("fill", TK.INK);
    tree.options.forEach((o, i) => {
      const k = Math.max(1, o.outcomes.length);
      const yC = 20 + (row + k / 2) * rowH;
      const chosen = i === tree.best;
      const stroke = chosen ? TK.INK : "#9a9a9a";
      svg.append("path").attr("d", `M${xD + 12},${yD} L${xD + 40},${yD} L${xC - 150},${yC} L${xC - 12},${yC}`).attr("fill", "none").attr("stroke", stroke).attr("stroke-width", chosen ? 3 : 1.5);
      if (!chosen) {
        const mx = (xD + 40 + xC - 150) / 2, my = (yD + yC) / 2;
        [-4, 4].forEach((d) => svg.append("line").attr("x1", mx + d - 5).attr("x2", mx + d + 5).attr("y1", my + 8).attr("y2", my - 8).attr("stroke", TK.INK).attr("stroke-width", 1.5));
      }
      svg.append("text").attr("x", xC - 14).attr("y", yC - 8).attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", 700).attr("fill", TK.INK).attr("paint-order", "stroke").attr("stroke", "#fff").attr("stroke-width", 4).text(label(o.name));
      svg.append("circle").attr("cx", xC).attr("cy", yC).attr("r", 12).attr("fill", chosen ? TK.PALETTE[0] : "#fff").attr("stroke", chosen ? TK.PALETTE[0] : "#9a9a9a").attr("stroke-width", 2);
      svg.append("text").attr("x", xC - 14).attr("y", yC + 18).attr("text-anchor", "end").attr("font-size", 12).attr("fill", chosen ? TK.INK : TK.MUTED).text("EV " + TK.fmt(o.ev, 2));
      o.outcomes.forEach((oc, j) => {
        const yO = 20 + (row + j + 0.5) * rowH;
        svg.append("path").attr("d", `M${xC + 12},${yC} L${xC + 30},${yO} L${xE},${yO}`).attr("fill", "none").attr("stroke", stroke).attr("stroke-width", 1.5);
        svg.append("text").attr("x", xC + 34).attr("y", yO - 6).attr("font-size", 12).attr("fill", TK.INK).text(`${oc.label || "Outcome"}  p = ${TK.fmt(TK.num(oc.p, 0), 3)}`);
        svg.append("path").attr("d", `M${xE},${yO} l14,-8 l0,16 z`).attr("fill", stroke);
        svg.append("text").attr("x", xE + 20).attr("y", yO + 4).attr("font-size", 13).attr("font-weight", 700).attr("fill", TK.num(oc.payoff, 0) < 0 ? TK.BAD : TK.INK).text(TK.fmt(TK.num(oc.payoff, 0), 2));
      });
      row += k;
    });
  }

  function kpis(tree) {
    if (tree.best < 0) return `<p class="tk-help">Add an option with at least one outcome.</p>`;
    const sorted = tree.options.slice().sort((a, b) => b.ev - a.ev);
    const gap = sorted.length > 1 ? sorted[0].ev - sorted[1].ev : NaN;
    const warn = tree.options.filter((o) => Math.abs(o.psum - 1) > 1e-6);
    return `<div class="tk-kpis">
        ${tree.options.map((o) => `<div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(o.ev, 2)}</span><span class="tk-kpi-l">Expected value, ${TK.esc(label(o.name))}</span></div>`).join("")}
        <div class="tk-kpi"><span class="tk-kpi-v tk-kpi-text">${TK.esc(label(sorted[0].name))}</span><span class="tk-kpi-l">Best choice by expected value</span></div>
        ${Number.isFinite(gap) ? `<div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(gap, 2)}</span><span class="tk-kpi-l">Expected gain over the next option</span></div>` : ""}
      </div>
      ${warn.map((o) => `<p class="tk-warn">The probabilities for ${TK.esc(label(o.name))} add up to ${TK.fmt(o.psum, 3)}. Branches leaving a chance node must add up to 1.</p>`).join("")}`;
  }

  // ---------- the tool ----------
  function sampleCustom() {
    return { title: "Launch the conference app now or after a pilot", options: [
      { name: "Launch now", outcomes: [{ label: "Strong uptake", p: 0.5, payoff: 12000 }, { label: "Weak uptake", p: 0.5, payoff: -4000 }] },
      { name: "Pilot first", outcomes: [{ label: "Strong uptake", p: 0.6, payoff: 9000 }, { label: "Weak uptake", p: 0.4, payoff: -1000 }] },
      { name: "Do not launch", outcomes: [{ label: "Certain", p: 1, payoff: 0 }] }] };
  }

  function mount(rootId) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK || !window.TKData) return;
    let data = null, group = null, mode = 0;
    let custom = TK.store.get(STORE, null) || sampleCustom();
    const save = () => TK.store.set(STORE, custom);

    root.innerHTML = `<div class="dt-file">
        <div class="dt-loader"></div>
        <div class="tk-toolbar"><label class="tk-grow">Group <select data-k="group" aria-label="Group"></select></label></div>
      </div>
      <div class="dt-custom" hidden>
        <div class="tk-toolbar">
          <label class="tk-grow">Decision <input type="text" data-k="title"></label>
          <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
          <button type="button" class="toolkit-btn secondary" data-a="blank">Start blank</button>
        </div>
        <div class="tk-cards dt-editor"></div>
        <div class="tk-row"><button type="button" class="toolkit-btn" data-a="add-option">Add option</button></div>
      </div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="tk-chart-box dt-chart tk-scroll-x"></div><p class="tk-help tk-scroll-hint">Swipe sideways to see the whole tree.</p>
        <div class="dt-kpis"></div>
        <div class="dt-class"></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    root.prepend(window.TKData.tabs(["Sample file", "Your own tree"], (i) => { mode = i; render(); }));
    const loader = window.TKData.loader({
      file: "decision-tree-vendor-data.csv", label: "the sample file", required: REQUIRED,
      onLoad(parsed) { data = compute(parsed.rows); data.rows = parsed.rows; group = data.groups[0] ? data.groups[0].id : null; fillGroups(); render(); }
    });
    root.querySelector(".dt-loader").appendChild(loader);
    root.appendChild(TK.exportRow(report, () => mode ? TK.slug(custom.title, "decision-tree") : "decision-tree-group-" + group));
    const groupSel = root.querySelector('[data-k="group"]');
    groupSel.addEventListener("change", () => { group = groupSel.value; render(); });
    const titleEl = root.querySelector('[data-k="title"]');
    titleEl.addEventListener("input", () => { custom.title = titleEl.value; save(); renderReport(); });

    function fillGroups() {
      groupSel.innerHTML = data.groups.map((g) => `<option value="${TK.esc(g.id)}">Group ${TK.esc(g.id)}</option>`).join("");
      groupSel.value = group;
    }

    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      const card = a.closest("[data-o]");
      const oi = card ? Number(card.dataset.o) : -1;
      if (a.dataset.a === "sample") custom = sampleCustom();
      else if (a.dataset.a === "blank") custom = { title: "", options: [{ name: "Option A", outcomes: [{ label: "", p: "", payoff: "" }] }, { name: "Option B", outcomes: [{ label: "", p: "", payoff: "" }] }] };
      else if (a.dataset.a === "add-option") custom.options.push({ name: "Option " + String.fromCharCode(65 + custom.options.length % 26), outcomes: [{ label: "", p: "", payoff: "" }] });
      else if (a.dataset.a === "rm-option") custom.options.splice(oi, 1);
      else if (a.dataset.a === "add-outcome") custom.options[oi].outcomes.push({ label: "", p: "", payoff: "" });
      else if (a.dataset.a === "rm-outcome") custom.options[oi].outcomes.splice(Number(a.dataset.j), 1);
      else return;
      save();
      render();
    });

    function renderEditor() {
      titleEl.value = custom.title || "";
      const ed = root.querySelector(".dt-editor");
      ed.innerHTML = custom.options.map((o, i) => `<div class="tk-card" data-o="${i}" style="border-top-color:${TK.PALETTE[i % TK.PALETTE.length]}">
          <label>Option name<input type="text" data-f="name" value="${TK.esc(o.name)}"></label>
          <table class="tk-table"><thead><tr><th>Outcome</th><th>Probability</th><th>Payoff</th><th></th></tr></thead><tbody>
          ${o.outcomes.map((oc, j) => `<tr data-j="${j}">
            <td><input type="text" data-f="label" value="${TK.esc(oc.label)}" aria-label="Outcome name"></td>
            <td><input type="number" data-f="p" min="0" max="1" step="0.01" value="${TK.esc(oc.p)}" aria-label="Probability"></td>
            <td><input type="number" data-f="payoff" step="any" value="${TK.esc(oc.payoff)}" aria-label="Payoff"></td>
            <td><button type="button" class="scored-item-remove" data-a="rm-outcome" data-j="${j}" aria-label="Remove outcome">&times;</button></td></tr>`).join("")}
          </tbody></table>
          <div class="tk-row"><button type="button" class="toolkit-btn secondary" data-a="add-outcome">Add outcome</button>
          <button type="button" class="toolkit-btn secondary" data-a="rm-option">Remove option</button></div>
        </div>`).join("");
      ed.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
        const o = custom.options[Number(inp.closest("[data-o]").dataset.o)];
        if (inp.dataset.f === "name") o.name = inp.value;
        else o.outcomes[Number(inp.closest("tr").dataset.j)][inp.dataset.f] = inp.dataset.f === "label" ? inp.value : inp.value === "" ? "" : TK.num(inp.value);
        save();
        renderReport();
      }));
    }

    function classSummary() {
      if (!data) return "";
      const names = data.optionNames;
      return `<h4>All ${data.groups.length} groups</h4>
        <div class="tk-table-wrap"><table class="tk-table"><thead><tr><th>Option</th><th class="tk-num">Mean expected value</th><th class="tk-num">Groups where it is best</th></tr></thead><tbody>
        ${names.map((o) => `<tr><td>${TK.esc(label(o))}</td><td class="tk-num">${TK.fmt(data.meanEV[o], 1)}</td><td class="tk-num">${data.wins[o]}</td></tr>`).join("")}</tbody></table></div>
        <p class="tk-help">${data.probIssues ? `<span class="tk-warn">${data.probIssues} rows have success and failure probabilities that do not add up to 1.</span>` : `Probability_Success plus Probability_Failure equals 1 on all ${data.perRow.length} rows.`}</p>
        <details class="tk-details"><summary>Expected value for every group</summary><div class="tk-table-wrap"><table class="tk-table"><thead><tr><th>Group</th>${names.map((o) => `<th class="tk-num">${TK.esc(label(o))}</th>`).join("")}<th>Best</th></tr></thead><tbody>
        ${data.groups.map((g) => `<tr><td>${TK.esc(g.id)}</td>${names.map((o) => { const x = g.tree.options.find((y) => y.name === o); return `<td class="tk-num">${x ? TK.fmt(x.ev, 2) : ""}</td>`; }).join("")}<td>${TK.esc(label(g.best))}</td></tr>`).join("")}
        </tbody></table></div></details>`;
    }

    function current() {
      if (mode) return solve(JSON.parse(JSON.stringify(custom)));
      if (!data || group == null) return null;
      const g = data.groups.find((x) => String(x.id) === String(group));
      return g ? g.tree : null;
    }
    function renderReport() {
      const t = current();
      report.querySelector(".tk-report-title").textContent = mode ? (custom.title || "Decision tree") : `Decision tree, group ${group == null ? "" : group}`;
      const chart = report.querySelector(".dt-chart");
      if (!t) { chart.innerHTML = `<p class="tk-help">Load the sample file to draw a group's tree.</p>`; report.querySelector(".dt-kpis").innerHTML = ""; }
      else { draw(chart, t, report.querySelector(".tk-report-title").textContent); report.querySelector(".dt-kpis").innerHTML = kpis(t); }
      report.querySelector(".dt-class").innerHTML = mode ? "" : classSummary();
    }
    function render() {
      root.querySelector(".dt-file").hidden = !!mode;
      root.querySelector(".dt-custom").hidden = !mode;
      if (mode) renderEditor();
      renderReport();
    }
    render();
    loader.loadServed();
  }

  window.DecisionTree = { mount, compute: { ev, compute, treeFromRows, solve } };
})();
