/*
 * assets/js/toolkit/value-proposition-canvas.js
 *
 * Value Proposition Canvas as an interactive diagram: the value map square
 * (products and services, gain creators, pain relievers) beside the
 * customer profile circle (customer jobs, gains, pains). Notes are
 * dragged between areas, and each pain or gain can be matched to the
 * relievers and creators that address it. Fit is the share of pains and
 * gains addressed by at least one element of the value map.
 *
 * Usage: window.ValueCanvas.mount({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;
  const STORE = "flairmi-vpc-v1";
  const W = 900, H = 470, NW = 112;
  const SQ = { x0: 24, x1: 404, y0: 44, y1: 444, split: 160 };
  const CI = { cx: 668, cy: 244, r: 204, jobsX: 708 };
  const ZONES = {
    products: { label: "Products and services", side: "map", color: TK.PALETTE[0] },
    gainCreators: { label: "Gain creators", side: "map", color: TK.PALETTE[2] },
    painRelievers: { label: "Pain relievers", side: "map", color: TK.PALETTE[1] },
    jobs: { label: "Customer jobs", side: "profile", color: TK.PALETTE[6] },
    gains: { label: "Gains", side: "profile", color: TK.PALETTE[2] },
    pains: { label: "Pains", side: "profile", color: TK.PALETTE[1] }
  };

  function zoneAt(x, y) {
    if (x >= SQ.x0 && x <= SQ.x1 && y >= SQ.y0 && y <= SQ.y1) {
      if (x < SQ.x0 + SQ.split) return "products";
      return y < (SQ.y0 + SQ.y1) / 2 ? "gainCreators" : "painRelievers";
    }
    const dx = x - CI.cx, dy = y - CI.cy;
    if (dx * dx + dy * dy <= CI.r * CI.r) {
      if (x > CI.jobsX) return "jobs";
      return y < CI.cy ? "gains" : "pains";
    }
    return null;
  }

  // Area labels, drawn at fixed spots. New notes are kept clear of them.
  const LABELS = [
    [SQ.x0 + 8, SQ.y0 + 18, "Products and services"], [SQ.x0 + SQ.split + 8, SQ.y0 + 18, "Gain creators"],
    [SQ.x0 + SQ.split + 8, (SQ.y0 + SQ.y1) / 2 + 18, "Pain relievers"], [CI.cx - 110, CI.cy - CI.r + 60, "Gains"],
    [CI.cx - 110, CI.cy + CI.r - 44, "Pains"], [CI.jobsX + 12, CI.cy - 60, "Customer jobs"]];
  const clearOfLabels = (x, y) => LABELS.every(([lx, ly, t]) => x + NW / 2 < lx - 4 || x - NW / 2 > lx + t.length * 7 + 4 || y + 32 < ly - 14 || y - 32 > ly + 4);

  // Slot centres inside each zone, used to place new notes.
  function slots(zone) {
    const out = [];
    const push = (x, y) => { if (zoneAt(x, y) === zone && zoneAt(x + NW / 2 - 4, y - 32) === zone && zoneAt(x - NW / 2 + 4, y + 32) === zone && zoneAt(x + NW / 2 - 4, y + 32) === zone && zoneAt(x - NW / 2 + 4, y - 32) === zone && clearOfLabels(x, y)) out.push([x, y]); };
    for (let y = 70; y < H - 26; y += 10) for (let x = 40; x < W - 40; x += 10) push(x, y);
    return out;
  }

  const SAMPLE = {
    title: "Business-friendly city hotel for Lukas Hoffmann",
    notes: [
      { id: "j1", zone: "jobs", text: "Stay productive on a 3-day work trip" },
      { id: "j2", zone: "jobs", text: "Book a hotel without a second search" },
      { id: "j3", zone: "jobs", text: "Plan a family holiday once a year" },
      { id: "g1", zone: "gains", text: "Reliable fast Wi-Fi" },
      { id: "g2", zone: "gains", text: "Recognised as a returning guest" },
      { id: "g3", zone: "gains", text: "Quiet room for calls" },
      { id: "p1", zone: "pains", text: "Fees that appear at payment" },
      { id: "p2", zone: "pains", text: "Missing check-in details" },
      { id: "p3", zone: "pains", text: "Service varies between stays" },
      { id: "s1", zone: "products", text: "Business rooms with desk" },
      { id: "s2", zone: "products", text: "Member rate and app" },
      { id: "c1", zone: "gainCreators", text: "Wi-Fi speed shown on the booking page" },
      { id: "c2", zone: "gainCreators", text: "Preferences saved in the guest profile" },
      { id: "r1", zone: "painRelievers", text: "All-in price from the first page" },
      { id: "r2", zone: "painRelievers", text: "Pre-arrival email with check-in times" }
    ],
    links: { g1: ["c1"], g2: ["c2"], p1: ["r1"], p2: ["r2"] }
  };

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    let state = TK.store.get(STORE, null) || fresh(true);
    let selected = null;

    function fresh(sample) {
      const s = sample ? JSON.parse(JSON.stringify(SAMPLE)) : { title: "", notes: [], links: {} };
      s.notes.forEach((n) => { if (n.x == null) place(n, s.notes); });
      return s;
    }
    function place(note, notes) {
      const taken = notes.filter((n) => n !== note && n.x != null);
      const free = slots(note.zone).find(([x, y]) => taken.every((t) => Math.abs(t.x - x) > NW - 4 || Math.abs(t.y - y) > 46));
      const fallback = slots(note.zone)[0] || [CI.cx, CI.cy];
      [note.x, note.y] = free || [fallback[0] + (Math.random() - 0.5) * 30, fallback[1] + (Math.random() - 0.5) * 30];
    }
    function save() { TK.store.set(STORE, state); }

    root.innerHTML = `
      <div class="tk-toolbar">
        <label class="tk-grow">Title <input type="text" data-k="title"></label>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="clear">Start blank</button>
      </div>
      <div class="tk-row vpc-add">
        <select data-k="zone" aria-label="Area">${Object.keys(ZONES).map((z) => `<option value="${z}">${ZONES[z].label}</option>`).join("")}</select>
        <input type="text" data-k="text" placeholder="Short note, e.g. Fees that appear at payment" class="tk-grow" aria-label="Note text">
        <button type="button" class="toolkit-btn" data-a="add">Add note</button>
      </div>
      <p class="tk-help">Drag notes to move them between areas. Click a note to edit it, delete it, or match a pain or gain to the value map.</p>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="vpc-canvas"></div>
        <div class="tk-kpis vpc-kpis"></div>
      </div>
      <div class="tk-panel vpc-edit" hidden></div>`;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, () => TK.slug(state.title, "value-proposition-canvas")));

    q("title").addEventListener("input", () => { state.title = q("title").value; save(); report.querySelector(".tk-report-title").textContent = state.title || "Value proposition canvas"; });
    q("text").addEventListener("keydown", (e) => { if (e.key === "Enter") addNote(); });
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "add") return addNote();
      if (a.dataset.a === "sample") state = fresh(true);
      if (a.dataset.a === "clear") state = fresh(false);
      selected = null;
      save();
      renderAll();
    });

    function addNote() {
      const text = q("text").value.trim();
      if (!text) return q("text").focus();
      const n = { id: "n" + Date.now().toString(36), zone: q("zone").value, text };
      place(n, state.notes);
      state.notes.push(n);
      q("text").value = "";
      save();
      draw();
    }

    function wrap(text) {
      const words = String(text).split(/\s+/), lines = [];
      let cur = "";
      words.forEach((w) => {
        if ((cur + " " + w).trim().length > 17 && cur) { lines.push(cur); cur = w; }
        else cur = (cur + " " + w).trim();
      });
      if (cur) lines.push(cur);
      return lines.slice(0, 4);
    }

    function draw() {
      const box = report.querySelector(".vpc-canvas");
      box.innerHTML = "";
      const svg = TK.svg(box, W, H, "Value proposition canvas with the value map and the customer profile");
      // Value map square.
      const midY = (SQ.y0 + SQ.y1) / 2;
      svg.append("rect").attr("x", SQ.x0).attr("y", SQ.y0).attr("width", SQ.x1 - SQ.x0).attr("height", SQ.y1 - SQ.y0).attr("fill", "#fafafa").attr("stroke", TK.INK).attr("stroke-width", 2);
      svg.append("line").attr("x1", SQ.x0 + SQ.split).attr("x2", SQ.x0 + SQ.split).attr("y1", SQ.y0).attr("y2", SQ.y1).attr("stroke", TK.INK);
      svg.append("line").attr("x1", SQ.x0 + SQ.split).attr("x2", SQ.x1).attr("y1", midY).attr("y2", midY).attr("stroke", TK.INK);
      // Customer profile circle.
      svg.append("circle").attr("cx", CI.cx).attr("cy", CI.cy).attr("r", CI.r).attr("fill", "#fafafa").attr("stroke", TK.INK).attr("stroke-width", 2);
      const jy = Math.sqrt(CI.r * CI.r - (CI.jobsX - CI.cx) ** 2);
      svg.append("line").attr("x1", CI.jobsX).attr("x2", CI.jobsX).attr("y1", CI.cy - jy).attr("y2", CI.cy + jy).attr("stroke", TK.INK);
      svg.append("line").attr("x1", CI.cx - CI.r).attr("x2", CI.jobsX).attr("y1", CI.cy).attr("y2", CI.cy).attr("stroke", TK.INK);
      const lab = (x, y, t, anchor) => svg.append("text").attr("x", x).attr("y", y).attr("text-anchor", anchor || "start").attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.MUTED).text(t);
      LABELS.forEach(([lx, ly, t]) => lab(lx, ly, t));
      svg.append("text").attr("x", (SQ.x0 + SQ.x1) / 2).attr("y", 24).attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700).text("Value map");
      svg.append("text").attr("x", CI.cx).attr("y", 24).attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700).text("Customer profile");

      // Match lines, drawn under the notes.
      const byId = (id) => state.notes.find((n) => n.id === id);
      const gLinks = svg.append("g");
      Object.keys(state.links).forEach((pid) => (state.links[pid] || []).forEach((mid) => {
        const a = byId(pid), b = byId(mid);
        if (a && b) gLinks.append("line").attr("x1", a.x).attr("y1", a.y).attr("x2", b.x).attr("y2", b.y)
          .attr("stroke", ZONES[a.zone].color).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4");
      }));

      const g = svg.append("g");
      state.notes.forEach((n) => {
        const lines = wrap(n.text), h = 14 + lines.length * 13;
        const ng = g.append("g").attr("class", "vpc-note").attr("transform", `translate(${n.x},${n.y})`).style("cursor", "grab");
        ng.append("rect").attr("x", -NW / 2).attr("y", -h / 2).attr("width", NW).attr("height", h).attr("rx", 3)
          .attr("fill", "#fff").attr("stroke", n.id === selected ? TK.INK : ZONES[n.zone].color).attr("stroke-width", n.id === selected ? 2.5 : 1.5);
        ng.append("rect").attr("x", -NW / 2).attr("y", -h / 2).attr("width", 4).attr("height", h).attr("fill", ZONES[n.zone].color);
        const t = ng.append("text").attr("font-size", 11).attr("fill", TK.INK).attr("text-anchor", "middle");
        lines.forEach((l, i) => t.append("tspan").attr("x", 2).attr("y", -h / 2 + 17 + i * 13).text(l));
        ng.call(d3.drag()
          .on("start", function () { d3.select(this).raise().style("cursor", "grabbing"); })
          .on("drag", function (ev) { n.x = Math.max(NW / 2, Math.min(W - NW / 2, ev.x)); n.y = Math.max(20, Math.min(H - 16, ev.y)); d3.select(this).attr("transform", `translate(${n.x},${n.y})`); })
          .on("end", function (ev) {
            const moved = Math.abs(ev.x - ev.subject.x) + Math.abs(ev.y - ev.subject.y) > 3;
            const z = zoneAt(n.x, n.y);
            if (z) n.zone = z; else place(n, state.notes);
            if (!moved) selected = n.id;
            save();
            draw();
            renderEdit();
          }));
      });
      fit();
    }

    function fit() {
      const targets = state.notes.filter((n) => n.zone === "pains" || n.zone === "gains");
      const addressed = targets.filter((n) => (state.links[n.id] || []).some((id) => state.notes.find((m) => m.id === id)));
      const count = (z) => state.notes.filter((n) => n.zone === z).length;
      root.querySelector(".vpc-kpis").innerHTML = [
        [targets.length ? TK.fmtPct(addressed.length / targets.length, 0) : "n/a", "Fit: pains and gains addressed"],
        [`${addressed.filter((n) => n.zone === "pains").length} of ${count("pains")}`, "Pains relieved"],
        [`${addressed.filter((n) => n.zone === "gains").length} of ${count("gains")}`, "Gains created"],
        [String(count("jobs")), "Customer jobs"]
      ].map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
    }

    function renderEdit() {
      const panel = root.querySelector(".vpc-edit");
      const n = state.notes.find((x) => x.id === selected);
      if (!n) { panel.hidden = true; return; }
      panel.hidden = false;
      const matchZone = n.zone === "pains" ? "painRelievers" : n.zone === "gains" ? "gainCreators" : null;
      const options = matchZone ? state.notes.filter((m) => m.zone === matchZone) : [];
      panel.innerHTML = `<h3>${ZONES[n.zone].label}</h3>
        <label>Note <input type="text" data-e="text" value="${TK.esc(n.text)}"></label>
        ${matchZone ? `<p class="tk-help">Which ${ZONES[matchZone].label.toLowerCase()} address this ${n.zone === "pains" ? "pain" : "gain"}?</p>
          ${options.length ? options.map((m) => `<label class="tk-check-row"><input type="checkbox" data-m="${m.id}"${(state.links[n.id] || []).includes(m.id) ? " checked" : ""}> ${TK.esc(m.text)}</label>`).join("") : `<p class="tk-help">Add a note under ${ZONES[matchZone].label.toLowerCase()} first.</p>`}` : ""}
        <div class="tk-row"><button type="button" class="toolkit-btn secondary" data-e="delete">Delete note</button><button type="button" class="toolkit-btn secondary" data-e="close">Close</button></div>`;
      panel.querySelector('[data-e="text"]').addEventListener("input", (e) => { n.text = e.target.value; save(); draw(); });
      panel.querySelectorAll("[data-m]").forEach((c) => c.addEventListener("change", () => {
        const set = new Set(state.links[n.id] || []);
        if (c.checked) set.add(c.dataset.m); else set.delete(c.dataset.m);
        state.links[n.id] = Array.from(set);
        save();
        draw();
      }));
      panel.querySelector('[data-e="delete"]').addEventListener("click", () => {
        state.notes = state.notes.filter((x) => x.id !== n.id);
        delete state.links[n.id];
        Object.keys(state.links).forEach((k) => (state.links[k] = state.links[k].filter((id) => id !== n.id)));
        selected = null;
        save();
        draw();
        renderEdit();
      });
      panel.querySelector('[data-e="close"]').addEventListener("click", () => { selected = null; draw(); renderEdit(); });
    }

    function renderAll() {
      q("title").value = state.title || "";
      report.querySelector(".tk-report-title").textContent = state.title || "Value proposition canvas";
      draw();
      renderEdit();
    }
    renderAll();
  }

  window.ValueCanvas = { mount };
})();
