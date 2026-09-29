/*
 * assets/js/toolkit/radar-scorer.js
 *
 * Shared engine for question-based scoring tools: Porter's Five Forces and
 * the Brand Equity Assessor. Each dimension carries a few statements, each
 * scored 1 to 5 by agreement. A dimension's score is the mean of its
 * statements. The result draws as a radar chart, or as Keller's brand
 * resonance pyramid, and the tool's own summary function turns the scores
 * into a verdict.
 *
 * Usage: window.RadarScorer.mount({ rootId, storeKey, subjectLabel,
 *   subjectPlaceholder, dimensions: [{ id, label, color, questions, note }],
 *   scaleLabels, view: "radar" | "pyramid", summary(stats) -> html,
 *   sample: { subject, scores: { dimId: [n, ...] }, notes } }).
 */
(function () {
  "use strict";
  const TK = window.TK;

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const dims = config.dimensions;
    const labels = config.scaleLabels || ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

    let state = TK.store.get(config.storeKey, null) || fromSample();
    function fromSample() {
      const s = config.sample;
      return { subject: s.subject, scores: JSON.parse(JSON.stringify(s.scores)), notes: Object.assign({}, s.notes || {}) };
    }
    function blank() {
      const scores = {};
      dims.forEach((d) => (scores[d.id] = d.questions.map(() => null)));
      return { subject: "", scores, notes: {} };
    }
    function save() { TK.store.set(config.storeKey, state); }

    root.innerHTML = `
      <div class="tk-toolbar">
        <label class="tk-grow">${TK.esc(config.subjectLabel)} <input type="text" data-k="subject" placeholder="${TK.esc(config.subjectPlaceholder || "")}"></label>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="clear">Start blank</button>
      </div>
      <p class="tk-help">Score each statement from 1 (${TK.esc(labels[0].toLowerCase())}) to 5 (${TK.esc(labels[4].toLowerCase())}). A dimension's score is the mean of its statements.</p>
      <div class="tk-cards rs-cards"></div>
      <div class="tk-report">
        <h3 class="tk-report-title"></h3>
        <div class="rs-summary"></div>
        <div class="tk-chart-box rs-chart"></div>
      </div>
    `;
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, () => TK.slug(state.subject, config.rootId)));
    const subj = root.querySelector('[data-k="subject"]');
    subj.addEventListener("input", () => { state.subject = subj.value; save(); renderReport(); });
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      state = a.dataset.a === "sample" ? fromSample() : blank();
      save();
      renderAll();
    });

    function renderCards() {
      root.querySelector(".rs-cards").innerHTML = dims.map((d) => `
        <div class="tk-card" style="border-top-color:${d.color}" data-d="${d.id}">
          <h4>${TK.esc(d.label)} <span class="rs-dim-score"></span></h4>
          ${d.note ? `<p class="tk-help">${TK.esc(d.note)}</p>` : ""}
          ${d.questions.map((q, i) => {
            const v = state.scores[d.id] ? state.scores[d.id][i] : null;
            return `<div class="rs-q"><span>${TK.esc(q)}</span>
              <div class="rs-scale" role="radiogroup" aria-label="${TK.esc(q)}">${[1, 2, 3, 4, 5].map((n) =>
                `<button type="button" role="radio" aria-checked="${v === n}" title="${TK.esc(labels[n - 1])}" data-q="${i}" data-v="${n}">${n}</button>`).join("")}</div></div>`;
          }).join("")}
          <label>Notes <textarea data-note="${d.id}" rows="2">${TK.esc(state.notes[d.id] || "")}</textarea></label>
        </div>`).join("");
      root.querySelectorAll(".rs-scale button").forEach((b) => b.addEventListener("click", () => {
        const d = b.closest("[data-d]").dataset.d, q = Number(b.dataset.q), v = Number(b.dataset.v);
        if (!state.scores[d]) state.scores[d] = dims.find((x) => x.id === d).questions.map(() => null);
        state.scores[d][q] = state.scores[d][q] === v ? null : v;
        b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(Number(x.dataset.v) === state.scores[d][q])));
        save();
        renderReport();
      }));
      root.querySelectorAll("[data-note]").forEach((t) => t.addEventListener("input", () => {
        state.notes[t.dataset.note] = t.value;
        save();
        renderReport();
      }));
    }

    function stats() {
      return dims.map((d) => {
        const vals = (state.scores[d.id] || []).filter((v) => v != null);
        return { d, score: vals.length ? TK.mean(vals) : NaN, answered: vals.length, total: d.questions.length, note: state.notes[d.id] || "" };
      });
    }

    function renderReport() {
      const st = stats();
      root.querySelectorAll(".rs-cards [data-d]").forEach((card) => {
        const s = st.find((x) => x.d.id === card.dataset.d);
        card.querySelector(".rs-dim-score").textContent = Number.isFinite(s.score) ? TK.fmt(s.score, 1) + " / 5" : "";
      });
      report.querySelector(".tk-report-title").textContent = state.subject || config.defaultTitle || "Results";
      report.querySelector(".rs-summary").innerHTML = config.summary(st);
      const box = report.querySelector(".rs-chart");
      box.innerHTML = "";
      if (config.view === "pyramid") drawPyramid(box, st);
      else drawRadar(box, st);
    }

    function drawRadar(box, st) {
      const W = 560, H = 440, cx = W / 2, cy = H / 2 + 6, R = 150;
      const svg = TK.svg(box, W, H, "Radar chart of the dimension scores");
      const n = st.length, ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = d3.scaleLinear().domain([0, 5]).range([0, R]);
      [1, 2, 3, 4, 5].forEach((lvl) => {
        svg.append("polygon").attr("points", st.map((_, i) => [cx + r(lvl) * Math.cos(ang(i)), cy + r(lvl) * Math.sin(ang(i))].join(",")).join(" "))
          .attr("fill", "none").attr("stroke", lvl === 5 ? "#c9c9c9" : TK.BORDER);
        const la = -Math.PI / 2 + Math.PI / n;
        svg.append("text").attr("x", cx + r(lvl) * Math.cos(la) + 3).attr("y", cy + r(lvl) * Math.sin(la) + 3).attr("font-size", 10).attr("fill", TK.MUTED).text(lvl);
      });
      st.forEach((s, i) => {
        svg.append("line").attr("x1", cx).attr("y1", cy).attr("x2", cx + R * Math.cos(ang(i))).attr("y2", cy + R * Math.sin(ang(i))).attr("stroke", TK.BORDER);
        const lx = cx + (R + 22) * Math.cos(ang(i)), ly = cy + (R + 22) * Math.sin(ang(i));
        const anchor = Math.abs(Math.cos(ang(i))) < 0.2 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end";
        const t = svg.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", anchor).attr("font-size", 12).attr("font-weight", 700).attr("fill", TK.INK);
        t.append("tspan").attr("x", lx).text(s.d.label);
        t.append("tspan").attr("x", lx).attr("dy", 15).attr("font-weight", 400).attr("fill", TK.MUTED).text(Number.isFinite(s.score) ? TK.fmt(s.score, 1) : "not scored");
      });
      const pts = st.map((s, i) => [cx + r(Number.isFinite(s.score) ? s.score : 0) * Math.cos(ang(i)), cy + r(Number.isFinite(s.score) ? s.score : 0) * Math.sin(ang(i))]);
      svg.append("polygon").attr("points", pts.map((p) => p.join(",")).join(" "))
        .attr("fill", config.fill || TK.PALETTE[0]).attr("fill-opacity", 0.25).attr("stroke", config.fill || TK.PALETTE[0]).attr("stroke-width", 2.5);
      pts.forEach((p, i) => svg.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 5).attr("fill", st[i].d.color)
        .append("title").text(`${st[i].d.label}: ${Number.isFinite(st[i].score) ? TK.fmt(st[i].score, 2) : "not scored"}`));
    }

    // Keller's pyramid: salience at the base, performance and imagery,
    // judgements and feelings, resonance at the top. Rational route on
    // the left, emotional route on the right.
    function drawPyramid(box, st) {
      const W = 620, H = 420, top = 20, base = H - 36, cx = W / 2, halfBase = 260;
      const svg = TK.svg(box, W, H, "Brand resonance pyramid shaded by score");
      const by = (id) => st.find((s) => s.d.id === id);
      const levels = [["salience"], ["performance", "imagery"], ["judgements", "feelings"], ["resonance"]];
      const lh = (base - top) / levels.length;
      const halfAt = (y) => halfBase * (y - top) / (base - top);
      const shade = d3.scaleLinear().domain([1, 5]).range([0.12, 0.85]);
      levels.forEach((ids, li) => {
        const yb = base - li * lh, yt = yb - lh;
        const hb = halfAt(yb), ht = halfAt(yt);
        ids.forEach((id, k) => {
          const s = by(id);
          let pts;
          if (ids.length === 1) pts = [[cx - hb, yb], [cx + hb, yb], [cx + ht, yt], [cx - ht, yt]];
          else if (k === 0) pts = [[cx - hb, yb], [cx, yb], [cx, yt], [cx - ht, yt]];
          else pts = [[cx, yb], [cx + hb, yb], [cx + ht, yt], [cx, yt]];
          if (li === levels.length - 1) pts = [[cx - hb, yb], [cx + hb, yb], [cx, top]];
          const sc = Number.isFinite(s.score) ? s.score : null;
          svg.append("polygon").attr("points", pts.map((p) => p.join(",")).join(" "))
            .attr("fill", s.d.color).attr("fill-opacity", sc == null ? 0.05 : shade(sc)).attr("stroke", "#fff").attr("stroke-width", 3)
            .append("title").text(`${s.d.label}: ${sc == null ? "not scored" : TK.fmt(sc, 2)}`);
          const tx = ids.length === 1 ? cx : k === 0 ? cx - (hb + ht) / 4 : cx + (hb + ht) / 4;
          const ty = li === levels.length - 1 ? yb - lh * 0.35 : (yb + yt) / 2;
          const dark = sc != null && shade(sc) > 0.5;
          const t = svg.append("text").attr("x", tx).attr("y", ty).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", dark ? "#fff" : TK.INK);
          t.append("tspan").attr("x", tx).text(s.d.label);
          t.append("tspan").attr("x", tx).attr("dy", 15).attr("font-weight", 400).text(sc == null ? "not scored" : TK.fmt(sc, 1) + " / 5");
        });
      });
      svg.append("text").attr("x", cx - halfBase).attr("y", base + 22).attr("font-size", 11).attr("fill", TK.MUTED).text("Rational route");
      svg.append("text").attr("x", cx + halfBase).attr("y", base + 22).attr("text-anchor", "end").attr("font-size", 11).attr("fill", TK.MUTED).text("Emotional route");
    }

    function renderAll() {
      subj.value = state.subject || "";
      renderCards();
      renderReport();
    }
    renderAll();
  }

  window.RadarScorer = { mount };
})();
