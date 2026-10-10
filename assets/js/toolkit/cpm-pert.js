/*
 * assets/js/toolkit/cpm-pert.js
 *
 * CPM/PERT and Gantt Planner. Reads tasks with predecessors given by task
 * name ("None" for none, several names comma-separated inside quotes, as in
 * cpm-task-data.csv), computes the PERT expected time te = (a + 4m + b)
 * / 6 and variance ((b - a) / 6)^2, runs the forward and backward passes for
 * ES, EF, LS, LF and slack, marks the critical path and draws the network
 * and a Gantt chart. Days are counted from 0 in the passes. The Gantt file
 * numbers days from 1, so its Start_Day is ES + 1 and its End_Day is EF.
 * Loading gantt-data.csv checks every one of its columns against the
 * tool's schedule.
 *
 * Usage: window.CpmPert.mount("cpm-app"). The pure functions in
 * window.CpmPert.compute are also run by R/test_toolkit_data_tools.R.
 */
(function () {
  "use strict";
  const TK = window.TK;
  const REQUIRED = ["Task_Name", "Predecessors", "Duration_Optimistic", "Duration_Most_Likely", "Duration_Pessimistic"];
  const GANTT_REQUIRED = ["Task_Name", "Start_Day", "Duration_Days", "End_Day", "Predecessor", "On_Critical_Path"];
  const STORE = "flairmi-cpm-pert-v1";
  const EPS = 1e-9;
  const label = (s) => String(s).replace(/_/g, " ");

  // ---------- pure calculations ----------
  function splitPreds(s) {
    const t = String(s == null ? "" : s).trim();
    if (!t || /^none$/i.test(t) || t === "-") return [];
    return t.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  }
  function tasksFromRows(rows) {
    return rows.map((r) => ({ name: r.Task_Name, preds: splitPreds(r.Predecessors), a: TK.num(r.Duration_Optimistic), m: TK.num(r.Duration_Most_Likely), b: TK.num(r.Duration_Pessimistic), who: r.Responsible || "" }));
  }
  // basis: "m" for most likely durations, "te" for PERT expected times.
  function schedule(tasks, basis) {
    const errors = [];
    const byName = new Map();
    tasks.forEach((t, i) => {
      if (!t.name) errors.push(`Task ${i + 1} has no name.`);
      else if (byName.has(t.name)) errors.push(`${t.name} appears twice.`);
      byName.set(t.name, i);
    });
    const out = tasks.map((t) => {
      const te = (t.a + 4 * t.m + t.b) / 6;
      const v = Math.pow((t.b - t.a) / 6, 2);
      if (![t.a, t.m, t.b].every(Number.isFinite)) errors.push(`${t.name} needs all 3 durations.`);
      else if (!(t.a <= t.m && t.m <= t.b)) errors.push(`${t.name}: durations must run optimistic, most likely, pessimistic from shortest to longest.`);
      t.preds.forEach((p) => { if (!byName.has(p)) errors.push(`${t.name} lists ${p} as a predecessor, and no task has that name.`); });
      return Object.assign({}, t, { te, variance: v, d: basis === "te" ? te : t.m });
    });
    if (errors.length) return { errors, tasks: out };
    // Topological order (Kahn), which also catches loops.
    const indeg = out.map((t) => t.preds.length), order = [];
    const succ = out.map(() => []);
    out.forEach((t, i) => t.preds.forEach((p) => succ[byName.get(p)].push(i)));
    const queue = indeg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
    while (queue.length) {
      const i = queue.shift();
      order.push(i);
      succ[i].forEach((j) => { if (--indeg[j] === 0) queue.push(j); });
    }
    if (order.length < out.length) return { errors: ["The predecessors form a loop, so no schedule exists."], tasks: out };
    order.forEach((i) => {
      const t = out[i];
      t.es = t.preds.length ? Math.max.apply(null, t.preds.map((p) => out[byName.get(p)].ef)) : 0;
      t.ef = t.es + t.d;
    });
    const duration = Math.max.apply(null, out.map((t) => t.ef));
    order.slice().reverse().forEach((i) => {
      const t = out[i];
      t.lf = succ[i].length ? Math.min.apply(null, succ[i].map((j) => out[j].ls)) : duration;
      t.ls = t.lf - t.d;
      t.slack = t.ls - t.es;
      t.critical = Math.abs(t.slack) < EPS;
    });
    // The critical path in order, following critical successors from a
    // critical start. With ties, the path with the larger variance is kept.
    function paths(i) {
      const next = succ[i].filter((j) => out[j].critical && Math.abs(out[j].es - out[i].ef) < EPS);
      if (!next.length) return Math.abs(out[i].ef - duration) < EPS ? [[i]] : [];
      return next.flatMap((j) => paths(j).map((p) => [i].concat(p)));
    }
    const all = out.map((t, i) => i).filter((i) => out[i].critical && out[i].preds.length === 0).flatMap(paths);
    const pathVar = (p) => p.reduce((s, i) => s + out[i].variance, 0);
    all.sort((x, y) => pathVar(y) - pathVar(x));
    const path = all[0] || [];
    return { errors: [], tasks: out, order, duration, paths: all.map((p) => p.map((i) => out[i].name)), path: path.map((i) => out[i].name),
      pathTe: path.reduce((s, i) => s + out[i].te, 0), pathVar: pathVar(path) };
  }
  // Probability of finishing within T days on the critical path, normal approximation.
  function onTimeProb(sched, T) {
    const sdv = Math.sqrt(sched.pathVar);
    return sdv > 0 ? TK.normCdf((T - sched.pathTe) / sdv) : (T >= sched.pathTe ? 1 : 0);
  }
  // Compare gantt-data.csv with a most-likely schedule of the same tasks.
  function checkGantt(sched, rows) {
    const yes = (v) => /^yes$/i.test(String(v).trim());
    return rows.map((r) => {
      const t = sched.tasks.find((x) => x.name === r.Task_Name);
      if (!t) return { name: r.Task_Name, missing: true, ok: false, checks: [] };
      const predsFile = splitPreds(r.Predecessor).slice().sort().join("|"), predsTool = t.preds.slice().sort().join("|");
      const checks = [
        ["Start_Day", TK.num(r.Start_Day), t.es + 1],
        ["Duration_Days", TK.num(r.Duration_Days), t.m],
        ["End_Day", TK.num(r.End_Day), t.ef],
        ["Predecessor", predsFile, predsTool],
        ["On_Critical_Path", yes(r.On_Critical_Path) ? "Yes" : "No", t.critical ? "Yes" : "No"]
      ].map(([col, file, tool]) => ({ col, file, tool, ok: typeof file === "number" ? Math.abs(file - tool) < EPS : file === tool }));
      return { name: r.Task_Name, who: r.Responsible || "", checks, ok: checks.every((c) => c.ok) };
    });
  }

  // ---------- drawing ----------
  function drawNetwork(box, s) {
    box.innerHTML = "";
    const level = {};
    s.order.forEach((i) => { const t = s.tasks[i]; level[t.name] = t.preds.length ? 1 + Math.max.apply(null, t.preds.map((p) => level[p])) : 0; });
    const cols = Math.max.apply(null, Object.values(level)) + 1;
    const byCol = Array.from({ length: cols }, () => []);
    s.tasks.forEach((t) => byCol[level[t.name]].push(t));
    const rows = Math.max.apply(null, byCol.map((c) => c.length));
    const bw = 150, bh = 74, gx = 46, gy = 22;
    const W = cols * bw + (cols - 1) * gx + 20, H = rows * bh + (rows - 1) * gy + 20;
    const svg = TK.svg(box, W, H, "Activity-on-node network with early and late times").style("min-width", Math.min(W, 1000) + "px");
    const pos = {};
    byCol.forEach((c, ci) => c.forEach((t, ri) => { pos[t.name] = { x: 10 + ci * (bw + gx), y: 10 + ri * (bh + gy) + (rows - c.length) * (bh + gy) / 2 }; }));
    s.tasks.forEach((t) => t.preds.forEach((p) => {
      const a = pos[p], b = pos[t.name], crit = t.critical && s.tasks.find((x) => x.name === p).critical && Math.abs(s.tasks.find((x) => x.name === p).ef - t.es) < EPS;
      svg.append("path").attr("d", `M${a.x + bw},${a.y + bh / 2} C${a.x + bw + gx / 2},${a.y + bh / 2} ${b.x - gx / 2},${b.y + bh / 2} ${b.x},${b.y + bh / 2}`)
        .attr("fill", "none").attr("stroke", crit ? TK.BAD : "#9a9a9a").attr("stroke-width", crit ? 2.5 : 1.2);
    }));
    const f = (v) => TK.fmt(v, Number.isInteger(v) ? 0 : 1);
    s.tasks.forEach((t) => {
      const p = pos[t.name], g = svg.append("g");
      g.append("rect").attr("x", p.x).attr("y", p.y).attr("width", bw).attr("height", bh).attr("fill", "#fff").attr("stroke", t.critical ? TK.BAD : TK.INK).attr("stroke-width", t.critical ? 2.5 : 1);
      g.append("line").attr("x1", p.x).attr("x2", p.x + bw).attr("y1", p.y + 22).attr("y2", p.y + 22).attr("stroke", "#d0d0d0");
      g.append("line").attr("x1", p.x).attr("x2", p.x + bw).attr("y1", p.y + bh - 22).attr("y2", p.y + bh - 22).attr("stroke", "#d0d0d0");
      g.append("text").attr("x", p.x + 6).attr("y", p.y + 15).attr("font-size", 11).attr("fill", TK.MUTED).text(`ES ${f(t.es)}`);
      g.append("text").attr("x", p.x + bw - 6).attr("y", p.y + 15).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text(`EF ${f(t.ef)}`);
      const nm = label(t.name), short = nm.length > 22 ? nm.slice(0, 21) + "." : nm;
      g.append("text").attr("x", p.x + bw / 2).attr("y", p.y + bh / 2 + 4).attr("text-anchor", "middle").attr("font-size", 11.5).attr("font-weight", 700).attr("fill", TK.INK).text(short).append("title").text(nm);
      g.append("text").attr("x", p.x + 6).attr("y", p.y + bh - 7).attr("font-size", 11).attr("fill", TK.MUTED).text(`LS ${f(t.ls)}`);
      g.append("text").attr("x", p.x + bw / 2).attr("y", p.y + bh - 7).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", t.critical ? TK.BAD : TK.INK).text(`slack ${f(t.slack)}`);
      g.append("text").attr("x", p.x + bw - 6).attr("y", p.y + bh - 7).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text(`LF ${f(t.lf)}`);
    });
  }

  function drawGantt(box, s, who) {
    box.innerHTML = "";
    const n = s.tasks.length, rowH = 30, M = { l: 190, r: 20, t: 26, b: 34 };
    const W = 760, H = M.t + M.b + n * rowH;
    const svg = TK.svg(box, W, H, "Gantt chart, critical tasks in red").style("min-width", "640px");
    const maxDay = Math.ceil(Math.max(s.duration, d3.max(s.tasks, (t) => t.lf)));
    const x = d3.scaleLinear().domain([0, maxDay]).range([M.l, W - M.r]);
    const ticks = d3.range(0, maxDay + 1, maxDay > 30 ? 5 : maxDay > 15 ? 2 : 1);
    ticks.forEach((d) => svg.append("line").attr("x1", x(d)).attr("x2", x(d)).attr("y1", M.t - 4).attr("y2", H - M.b).attr("stroke", "#eeeeee"));
    TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("~g"))));
    svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 4).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text("Days from the start (day 1 runs from 0 to 1)");
    s.tasks.forEach((t, i) => {
      const y = M.t + i * rowH;
      svg.append("text").attr("x", M.l - 8).attr("y", y + rowH / 2 + 4).attr("text-anchor", "end").attr("font-size", 11.5).attr("font-weight", t.critical ? 700 : 400).attr("fill", TK.INK).text(label(t.name));
      if (t.slack > EPS) svg.append("rect").attr("x", x(t.ef)).attr("y", y + rowH / 2 - 2).attr("width", x(t.lf) - x(t.ef)).attr("height", 4).attr("fill", "#c9c9c9").append("title").text(`Slack ${TK.fmt(t.slack, 1)} days`);
      svg.append("rect").attr("x", x(t.es)).attr("y", y + 5).attr("width", Math.max(2, x(t.ef) - x(t.es))).attr("height", rowH - 10).attr("fill", t.critical ? TK.BAD : TK.PALETTE[0]).attr("fill-opacity", t.critical ? 0.9 : 0.75)
        .append("title").text(`${label(t.name)}: ES ${TK.fmt(t.es, 1)}, EF ${TK.fmt(t.ef, 1)}${who && who[t.name] ? ", " + label(who[t.name]) : ""}`);
      if (who && who[t.name] && x(t.ef) - x(t.es) > 70) svg.append("text").attr("x", x(t.es) + 5).attr("y", y + rowH / 2 + 4).attr("font-size", 10.5).attr("fill", "#fff").text(label(who[t.name]));
    });
    svg.append("text").attr("x", M.l).attr("y", 14).attr("font-size", 11).attr("fill", TK.MUTED).text("Red bars: critical path. Grey line after a bar: slack.");
  }

  // ---------- the tool ----------
  function mount(rootId) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK || !window.TKData) return;
    const saved = TK.store.get(STORE, null);
    let tasks = saved && saved.tasks ? saved.tasks : [];
    let basis = saved && saved.basis ? saved.basis : "m";
    let title = saved && saved.title ? saved.title : "Event plan";
    let gantt = null, who = {};
    const save = () => TK.store.set(STORE, { tasks, basis, title });

    root.innerHTML = `
      <div class="cpm-loaders"></div>
      <div class="tk-toolbar">
        <label class="tk-grow">Project <input type="text" data-k="title"></label>
        <label>Durations <select data-k="basis"><option value="m">Most likely (m)</option><option value="te">PERT expected time (te)</option></select></label>
        <label>Deadline (days) <input type="number" data-k="target" min="0" step="1" value="18"></label>
        <button type="button" class="toolkit-btn secondary" data-a="blank">Start blank</button>
      </div>
      <details class="tk-details" data-k="editor-wrap"><summary>Edit tasks</summary>
        <p class="tk-help">Predecessors are task names separated by commas. Leave the box empty, or type None, for a task that can start at once.</p>
        <div class="tk-table-wrap"><table class="tk-table cpm-input"></table></div>
        <div class="tk-row"><button type="button" class="toolkit-btn secondary" data-a="add">Add task</button></div>
      </details>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="cpm-errors"></div>
        <div class="tk-kpis cpm-kpis"></div>
        <h4>Schedule</h4>
        <div class="tk-table-wrap"><table class="tk-table cpm-out"></table></div>
        <h4>Network</h4>
        <div class="tk-chart-box cpm-net tk-scroll-x"></div><p class="tk-help tk-scroll-hint">Swipe sideways to see the whole network.</p>
        <h4>Gantt chart</h4>
        <div class="tk-chart-box cpm-gantt tk-scroll-x"></div><p class="tk-help tk-scroll-hint">Swipe sideways to see every day.</p>
        <div class="cpm-check"></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    const loaders = root.querySelector(".cpm-loaders");
    const cpmLoader = window.TKData.loader({ file: "cpm-task-data.csv", label: "the CPM file", required: REQUIRED,
      onLoad(parsed) { tasks = tasksFromRows(parsed.rows).map(({ name, preds, a, m, b }) => ({ name, preds, a, m, b })); title = "Event plan"; save(); renderAll(); } });
    const ganttLoader = window.TKData.loader({ file: "gantt-data.csv", label: "the Gantt file to check it", required: GANTT_REQUIRED,
      onLoad(parsed) { gantt = parsed.rows; who = {}; gantt.forEach((r) => { if (r.Responsible) who[r.Task_Name] = r.Responsible; }); renderOut(); } });
    loaders.appendChild(cpmLoader);
    loaders.appendChild(ganttLoader);
    root.appendChild(TK.exportRow(report, () => TK.slug(title, "cpm-pert"), [
      { label: "Download CSV", run: (st) => { const s = schedule(tasks, basis); if (s.errors.length) return TK.status(st, "Fix the task errors first."); TK.downloadText(TK.toCSV([["Task", "Predecessors", "a", "m", "b", "te", "Variance", "ES", "EF", "LS", "LF", "Slack", "Critical"]].concat(s.tasks.map((t) => [t.name, t.preds.join(", ") || "None", t.a, t.m, t.b, +t.te.toFixed(4), +t.variance.toFixed(4), +t.es.toFixed(4), +t.ef.toFixed(4), +t.ls.toFixed(4), +t.lf.toFixed(4), +t.slack.toFixed(4), t.critical ? "Yes" : "No"]))), TK.slug(title, "cpm-pert") + ".csv", "text/csv"); TK.status(st, "CSV saved."); } }
    ]));
    const titleEl = root.querySelector('[data-k="title"]'), basisEl = root.querySelector('[data-k="basis"]');
    titleEl.addEventListener("input", () => { title = titleEl.value; save(); report.querySelector(".tk-report-title").textContent = title || "Project schedule"; });
    basisEl.addEventListener("change", () => { basis = basisEl.value; save(); renderOut(); });
    root.querySelector('[data-k="target"]').addEventListener("input", renderOut);
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "blank") { tasks = [{ name: "Task_1", preds: [], a: 1, m: 2, b: 3 }]; title = ""; gantt = null; who = {}; root.querySelector('[data-k="editor-wrap"]').open = true; }
      else if (a.dataset.a === "add") tasks.push({ name: "Task_" + (tasks.length + 1), preds: [], a: 1, m: 2, b: 3 });
      else if (a.dataset.a === "rm") tasks.splice(Number(a.dataset.r), 1);
      else return;
      save();
      renderAll();
    });

    function renderInput() {
      const t = root.querySelector(".cpm-input");
      t.innerHTML = `<thead><tr><th>Task</th><th>Predecessors</th><th>a</th><th>m</th><th>b</th><th></th></tr></thead><tbody>${tasks.map((x, r) => `<tr data-r="${r}">
        <td><input type="text" data-f="name" value="${TK.esc(x.name)}" aria-label="Task name"></td>
        <td><input type="text" data-f="preds" value="${TK.esc(x.preds.join(", "))}" aria-label="Predecessors"></td>
        ${["a", "m", "b"].map((k) => `<td><input type="number" min="0" step="any" data-f="${k}" value="${TK.esc(x[k])}" aria-label="${k}"></td>`).join("")}
        <td><button type="button" class="scored-item-remove" data-a="rm" data-r="${r}" aria-label="Remove task">&times;</button></td></tr>`).join("")}</tbody>`;
      t.querySelectorAll("input").forEach((inp) => inp.addEventListener("change", () => {
        const x = tasks[Number(inp.closest("tr").dataset.r)], f = inp.dataset.f;
        if (f === "name") x.name = inp.value.trim();
        else if (f === "preds") x.preds = splitPreds(inp.value);
        else x[f] = TK.num(inp.value);
        save();
        renderOut();
      }));
    }

    function renderOut() {
      report.querySelector(".tk-report-title").textContent = title || "Project schedule";
      const errBox = report.querySelector(".cpm-errors");
      const parts = [".cpm-kpis", ".cpm-out", ".cpm-net", ".cpm-gantt", ".cpm-check"].map((s) => report.querySelector(s));
      if (!tasks.length) { errBox.innerHTML = `<p class="tk-help">Load the CPM file or add a task.</p>`; parts.forEach((p) => (p.innerHTML = "")); return; }
      const s = schedule(tasks, basis);
      if (s.errors.length) { errBox.innerHTML = `<ul class="tk-list tk-warn">${s.errors.map((e) => `<li>${TK.esc(e)}</li>`).join("")}</ul>`; parts.forEach((p) => (p.innerHTML = "")); return; }
      errBox.innerHTML = "";
      const f = (v) => TK.fmt(v, basis === "te" ? 2 : 0);
      const target = TK.num(root.querySelector('[data-k="target"]').value, Math.ceil(s.pathTe));
      report.querySelector(".cpm-kpis").innerHTML = `
        <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(s.duration, basis === "te" ? 2 : 0)} days</span><span class="tk-kpi-l">Project duration on ${basis === "te" ? "te" : "most likely times"}</span></div>
        <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(s.pathTe, 2)} days</span><span class="tk-kpi-l">Expected duration of the critical path (sum of te)</span></div>
        <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(Math.sqrt(s.pathVar), 2)} days</span><span class="tk-kpi-l">Standard deviation of the critical path</span></div>
        <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmtPct(onTimeProb(s, target), 1)}</span><span class="tk-kpi-l">Chance of finishing within ${target} days</span></div>
        <div class="tk-kpi" style="grid-column:1/-1"><span class="tk-kpi-v tk-kpi-note">${s.path.map(label).map(TK.esc).join(" &rarr; ")}</span><span class="tk-kpi-l">Critical path${s.paths.length > 1 ? `, 1 of ${s.paths.length} tied paths, the one with the largest variance` : ""}</span></div>`;
      report.querySelector(".cpm-out").innerHTML = `<thead><tr><th>Task</th><th class="tk-num">a</th><th class="tk-num">m</th><th class="tk-num">b</th><th class="tk-num">te</th><th class="tk-num">Variance</th><th class="tk-num">ES</th><th class="tk-num">EF</th><th class="tk-num">LS</th><th class="tk-num">LF</th><th class="tk-num">Slack</th></tr></thead><tbody>
        ${s.tasks.map((t) => `<tr${t.critical ? ' class="tk-crit"' : ""}><td>${t.critical ? "<strong>" : ""}${TK.esc(label(t.name))}${t.critical ? "</strong>" : ""}</td><td class="tk-num">${t.a}</td><td class="tk-num">${t.m}</td><td class="tk-num">${t.b}</td><td class="tk-num">${TK.fmt(t.te, 2)}</td><td class="tk-num">${TK.fmt(t.variance, 3)}</td><td class="tk-num">${f(t.es)}</td><td class="tk-num">${f(t.ef)}</td><td class="tk-num">${f(t.ls)}</td><td class="tk-num">${f(t.lf)}</td><td class="tk-num">${f(t.slack)}</td></tr>`).join("")}</tbody>`;
      drawNetwork(report.querySelector(".cpm-net"), s);
      drawGantt(report.querySelector(".cpm-gantt"), s, who);
      renderCheck();
    }

    function renderCheck() {
      const box = report.querySelector(".cpm-check");
      if (!gantt) { box.innerHTML = `<p class="tk-help">Load the Gantt file above to check it against this schedule.</p>`; return; }
      const s = schedule(tasks, "m");
      if (s.errors.length) { box.innerHTML = ""; return; }
      const res = checkGantt(s, gantt);
      const ok = res.filter((r) => r.ok).length;
      box.innerHTML = `<h4>Gantt file check, most likely durations</h4>
        <p><span class="tk-badge ${ok === res.length ? "pass" : "fail"}">${ok} of ${res.length} tasks agree</span> The tool's start day is ES + 1, its end day is EF and its critical flag is zero slack.</p>
        <div class="tk-table-wrap"><table class="tk-table"><thead><tr><th>Task</th><th>Responsible</th>${["Start_Day", "Duration_Days", "End_Day", "Predecessor", "On_Critical_Path"].map((c) => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead><tbody>
        ${res.map((r) => `<tr><td>${TK.esc(label(r.name))}</td><td>${TK.esc(label(r.who))}</td>${r.missing ? `<td colspan="5" class="tk-warn">This task is missing from the schedule.</td>` : r.checks.map((c) => `<td>${c.ok ? `<span class="tk-pos" aria-label="agrees">&#10003;</span> ${TK.esc(c.col === "Predecessor" ? (c.file ? "match" : "None") : c.file)}` : `<span class="tk-neg">file ${TK.esc(c.file)}, tool ${TK.esc(c.tool)}</span>`}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>`;
    }

    function renderAll() {
      titleEl.value = title;
      basisEl.value = basis;
      renderInput();
      renderOut();
    }
    renderAll();
    if (!saved) cpmLoader.loadServed().then(() => ganttLoader.loadServed());
    else ganttLoader.loadServed();
  }

  window.CpmPert = { mount, compute: { splitPreds, tasksFromRows, schedule, onTimeProb, checkGantt } };
})();
