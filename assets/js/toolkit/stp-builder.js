/*
 * STP Builder — segmentation, targeting, and positioning as an interactive
 * dot-cluster diagram. Visual grammar adopted from the digital-marketing
 * textbook's fig-stp-flow (Week 2, "the STP process as a progressive
 * narrowing from full market to a specific positioning claim"): a field of
 * undifferentiated dots recolours into segment clusters, a chevron funnel
 * narrows to the chosen segment, then resolves to a positioning circle and
 * a campaign-brief box, with segment colour carried through every stage.
 * See plans/FlairMI_Marketing_Toolkit_Hub_Master_Plan.md in this repo.
 *
 * Layout note: an earlier version drove dot movement with a live
 * d3-force simulation (forceX/forceY pulling toward a per-stage target,
 * forceCollide preventing overlap). With ~30 densely packed dots split
 * into several small clusters only tens of pixels apart, forceCollide's
 * local repulsion reliably jammed before the positional pull won,
 * verified directly against the simulation's own node coordinates (not
 * guessed from a screenshot), so dots never actually reached their
 * target. Replaced with deterministic layout: each cluster's dot
 * positions are computed directly with a golden-angle spiral (the same
 * sqrt-uniform disc fill fig-stp-flow.R itself uses for its dot field),
 * and stage changes animate between two known-correct layouts with a
 * plain D3 transition instead of an open-ended physics simulation that
 * has to happen to converge.
 */
(function () {
  "use strict";

  const mount = document.getElementById("stp-app");
  if (!mount || typeof d3 === "undefined") return;

  // Categorical palette: dataviz skill's validated reference palette,
  // slots 1-5 (blue, orange, aqua, yellow, magenta). Segment identity is
  // the one place this monochrome site carries colour, exempt from the
  // brand rule the same way the status badges are.
  const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
  const INK = "#111111";
  const NEUTRAL = "#9a9a9a";
  const GOLDEN_ANGLE = 2.399963229728653; // radians

  const W = 900, H = 340;
  const CENTER_Y = H / 2;
  const CX = { market: 110, segment: 300, target: 500, position: 660, brief: 800 };
  const N_DOTS = 28;
  const TRANSITION_MS = 700;

  // ---- state --------------------------------------------------------
  let stage = "market"; // market -> segmented -> targeted -> positioned -> brief
  let segments = []; // { id, name, size, color }
  let targetSegmentId = null;
  let statement = { frame: "", pointOfDifference: "", evidence: "" };

  const dots = d3.range(N_DOTS).map((i) => ({ id: i, r: 3 + (i % 5) * 1.4, segmentId: null }));
  dots[0].r = 11; // one visibly larger dot, matches the source figure's emphasis dot

  // Golden-angle spiral: places n points inside a disc of radius R with
  // no overlap risk and an even, organic-looking fill, fully
  // deterministic (same input always gives the same layout).
  function spiralCluster(items, cx, cy, packRadius) {
    const n = items.length;
    return items.map((item, i) => {
      const frac = Math.sqrt((i + 0.5) / n);
      const angle = i * GOLDEN_ANGLE;
      return {
        id: item.id,
        x: cx + packRadius * frac * Math.cos(angle),
        y: cy + packRadius * frac * Math.sin(angle),
      };
    });
  }
  function radiusFor(n, dotR) {
    return Math.max(24, dotR * 2.3 * Math.sqrt(n));
  }

  function segmentSlot(idx, n) {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const rows = Math.ceil(n / 2);
    return {
      x: CX.segment + (col - 0.5) * 90,
      y: CENTER_Y + (row - (rows - 1) / 2) * 90,
    };
  }

  // Computes {id -> {x,y}} for every dot for the current stage. Pure
  // function of state, called once per stage change, never per frame.
  function computeLayout() {
    const pos = {};
    if (stage === "market") {
      spiralCluster(dots, CX.market, CENTER_Y, radiusFor(dots.length, 6)).forEach((p) => {
        pos[p.id] = p;
      });
      return pos;
    }
    if (stage === "segmented") {
      segments.forEach((seg, idx) => {
        const members = dots.filter((d) => d.segmentId === seg.id);
        const slot = segmentSlot(idx, segments.length);
        spiralCluster(members, slot.x, slot.y, radiusFor(members.length, 6)).forEach((p) => {
          pos[p.id] = p;
        });
      });
      return pos;
    }
    // targeted / positioned / brief: target segment collapses into one
    // tight cluster at the stage's x position; everyone else is parked
    // in a single faded-out discard cluster to the left of it.
    const targetMembers = dots.filter((d) => d.segmentId === targetSegmentId);
    const otherMembers = dots.filter((d) => d.segmentId !== targetSegmentId);
    const clusterX = stage === "targeted" ? CX.target : CX.position;
    const clusterR = stage === "targeted" ? radiusFor(targetMembers.length, 6) : 8;
    spiralCluster(targetMembers, clusterX, CENTER_Y, clusterR).forEach((p) => {
      pos[p.id] = p;
    });
    spiralCluster(otherMembers, CX.segment - 50, CENTER_Y, radiusFor(otherMembers.length, 5)).forEach(
      (p) => {
        pos[p.id] = p;
      }
    );
    return pos;
  }

  // ---- DOM scaffold ---------------------------------------------------
  mount.innerHTML = `
    <div class="toolkit-stage-nav" role="tablist" aria-label="STP Builder stages">
      <button type="button" data-stage="market" aria-current="step">1. Full market</button>
      <button type="button" data-stage="segmented" disabled>2. Segmentation</button>
      <button type="button" data-stage="targeted" disabled>3. Targeting</button>
      <button type="button" data-stage="positioned" disabled>4. Positioning</button>
      <button type="button" data-stage="brief" disabled>5. Campaign brief</button>
    </div>
    <div class="toolkit-legend" id="stp-legend"></div>
    <svg id="stp-canvas" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dot-cluster diagram of the market narrowing through segmentation, targeting, and positioning" style="width:100%;height:auto;background:var(--toolkit-bg, #ffffff);"></svg>
    <div id="stp-panel"></div>
  `;

  const svg = d3.select("#stp-canvas");
  const gChevrons = svg.append("g").attr("class", "chevrons");
  const gCircle = svg.append("g").attr("class", "position-circle");
  const gBrief = svg.append("g").attr("class", "brief-box");
  const gDots = svg.append("g").attr("class", "dots");
  const gLabels = svg.append("g").attr("class", "stage-labels");

  const stageLabelData = [
    { x: CX.market, text: "Full market" },
    { x: CX.segment, text: "Segmentation" },
    { x: CX.target, text: "Targeting" },
    { x: CX.position, text: "Positioning" },
  ];
  gLabels
    .selectAll("text")
    .data(stageLabelData)
    .join("text")
    .attr("x", (d) => d.x)
    .attr("y", H - 14)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "var(--toolkit-muted, #6b6b6b)")
    .text((d) => d.text);

  function segmentOf(d) {
    return segments.find((s) => s.id === d.segmentId);
  }
  function dotFill(d) {
    if (stage === "market") return INK;
    const s = segmentOf(d);
    if (!s) return INK;
    if (stage === "segmented") return s.color;
    return d.segmentId === targetSegmentId ? s.color : NEUTRAL;
  }
  function dotOpacity(d) {
    if (stage === "targeted" || stage === "positioned" || stage === "brief") {
      return d.segmentId === targetSegmentId ? 0.95 : 0.15;
    }
    return 0.85;
  }
  function dotRadius(d) {
    if ((stage === "positioned" || stage === "brief") && d.segmentId !== targetSegmentId) {
      return 0; // out of frame once positioning narrows to one segment
    }
    return d.r;
  }

  function renderDots() {
    const layout = computeLayout();
    gDots
      .selectAll("circle")
      .data(dots, (d) => d.id)
      .join((enter) =>
        enter
          .append("circle")
          .attr("cx", (d) => (layout[d.id] || { x: CX.market }).x)
          .attr("cy", (d) => (layout[d.id] || { y: CENTER_Y }).y)
          .attr("r", 0)
      )
      .attr("fill", dotFill)
      .attr("opacity", dotOpacity)
      .transition()
      .duration(TRANSITION_MS)
      .attr("cx", (d) => (layout[d.id] || { x: CX.market }).x)
      .attr("cy", (d) => (layout[d.id] || { y: CENTER_Y }).y)
      .attr("r", dotRadius);
  }

  // ---- chevron funnel (targeting stage) --------------------------------
  function chevronPath(cx, cy, w, h, d) {
    const pts = [
      [cx - w, cy - h],
      [cx + w, cy - h],
      [cx + w + d, cy],
      [cx + w, cy + h],
      [cx - w, cy + h],
      [cx - w + d, cy],
    ];
    return "M" + pts.map((p) => p.join(",")).join("L") + "Z";
  }
  function renderChevrons() {
    gChevrons.selectAll("*").remove();
    if (stage !== "targeted" && stage !== "positioned" && stage !== "brief") return;
    const targetColor = targetSegmentId != null
      ? segments.find((s) => s.id === targetSegmentId).color
      : INK;
    const cy = CENTER_Y;
    gChevrons
      .append("path")
      .attr("d", chevronPath(CX.segment + 90, cy, 20, 42, 18))
      .attr("fill", NEUTRAL)
      .attr("opacity", 0.35);
    gChevrons
      .append("path")
      .attr("d", chevronPath(CX.segment + 130, cy, 20, 42, 18))
      .attr("fill", targetColor)
      .attr("opacity", 0.85);
    gChevrons.attr("opacity", stage === "brief" ? 0.5 : 1);
  }

  function renderPositionCircle() {
    gCircle.selectAll("*").remove();
    if (stage !== "positioned" && stage !== "brief") return;
    const targetColor = segments.find((s) => s.id === targetSegmentId).color;
    gCircle
      .append("circle")
      .attr("cx", CX.position)
      .attr("cy", CENTER_Y)
      .attr("r", 46)
      .attr("fill", "none")
      .attr("stroke", targetColor)
      .attr("stroke-width", 2.5);
  }

  function renderBriefBox() {
    gBrief.selectAll("*").remove();
    if (stage !== "brief") return;
    gBrief
      .append("rect")
      .attr("x", CX.brief - 78)
      .attr("y", CENTER_Y - 42)
      .attr("width", 156)
      .attr("height", 84)
      .attr("rx", 4)
      .attr("fill", INK)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
    gBrief
      .append("text")
      .attr("x", CX.brief)
      .attr("y", CENTER_Y + 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .text("Campaign");
    gBrief
      .append("text")
      .attr("x", CX.brief)
      .attr("y", CENTER_Y + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .text("brief");
  }

  function renderLegend() {
    const legend = d3.select("#stp-legend");
    legend.selectAll("*").remove();
    if (!segments.length) return;
    legend
      .selectAll("div")
      .data(segments)
      .join("div")
      .html(
        (d) =>
          `<span class="swatch" style="background:${d.color}"></span>${escapeHtml(d.name)}`
      );
  }

  function updateStageNav() {
    const order = ["market", "segmented", "targeted", "positioned", "brief"];
    const reached = order.indexOf(stage);
    d3.selectAll(".toolkit-stage-nav button").each(function () {
      const btn = d3.select(this);
      const s = btn.attr("data-stage");
      const idx = order.indexOf(s);
      btn.attr("disabled", idx > reached ? true : null);
      btn.attr("aria-current", s === stage ? "step" : null);
    });
  }

  d3.selectAll(".toolkit-stage-nav button").on("click", function () {
    const s = d3.select(this).attr("data-stage");
    if (d3.select(this).attr("disabled")) return;
    stage = s;
    render();
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  // ---- side panel per stage --------------------------------------------
  function renderPanel() {
    const panel = d3.select("#stp-panel");
    panel.selectAll("*").remove();

    if (stage === "market") {
      panel.html(`
        <p>Every market starts as one undifferentiated field, shown here as
        plain dots. Define two to five segments below, each a group of
        people whose needs or behaviour are similar enough to address with
        one message, then run the segmentation.</p>
        <div id="stp-segment-form"></div>
      `);
      renderSegmentForm();
      return;
    }

    if (stage === "segmented") {
      panel.html(`
        <p>The market has recoloured into ${segments.length} segments.
        Select the one segment this campaign will target. Targeting means
        choosing based on size, accessibility, competitive advantage, and
        strategic fit, not simply picking a favourite.</p>
        <label for="stp-target-select">Target segment</label>
        <select id="stp-target-select">
          <option value="">Choose a segment</option>
          ${segments
            .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
            .join("")}
        </select>
        <button type="button" class="toolkit-btn" id="stp-confirm-target" disabled>Confirm target &amp; narrow</button>
      `);
      const select = document.getElementById("stp-target-select");
      const btn = document.getElementById("stp-confirm-target");
      select.addEventListener("change", () => {
        btn.disabled = !select.value;
      });
      btn.addEventListener("click", () => {
        targetSegmentId = Number(select.value);
        stage = "targeted";
        render();
      });
      return;
    }

    if (stage === "targeted") {
      const seg = segments.find((s) => s.id === targetSegmentId);
      panel.html(`
        <p>The funnel has narrowed to <strong>${escapeHtml(
          seg.name
        )}</strong>. Every other segment has faded out of frame. Now write
        the positioning claim: what this offering does better than
        alternatives, for this segment specifically, and what evidence
        supports the claim.</p>
        <label for="stp-frame">Frame of reference (what category this competes in)</label>
        <input type="text" id="stp-frame" placeholder="e.g. project-management software for small teams">
        <label for="stp-pod">Point of difference (what it does better than alternatives)</label>
        <input type="text" id="stp-pod" placeholder="e.g. the only tool that turns a plan into a live Gantt chart with no setup">
        <label for="stp-evidence">Evidence (what supports the claim)</label>
        <input type="text" id="stp-evidence" placeholder="e.g. median time-to-first-chart across 40 pilot teams was under 4 minutes">
        <button type="button" class="toolkit-btn" id="stp-generate-position" disabled>Generate positioning statement</button>
      `);
      const inputs = ["stp-frame", "stp-pod", "stp-evidence"].map((id) =>
        document.getElementById(id)
      );
      const btn = document.getElementById("stp-generate-position");
      inputs.forEach((inp) =>
        inp.addEventListener("input", () => {
          btn.disabled = inputs.some((i) => !i.value.trim());
        })
      );
      btn.addEventListener("click", () => {
        statement.frame = inputs[0].value.trim();
        statement.pointOfDifference = inputs[1].value.trim();
        statement.evidence = inputs[2].value.trim();
        stage = "positioned";
        render();
      });
      return;
    }

    if (stage === "positioned") {
      const seg = segments.find((s) => s.id === targetSegmentId);
      panel.html(`
        <p>The target segment's dots have collapsed into a single position,
        the claim this campaign will make in the audience's mind.</p>
        <blockquote style="border-left:3px solid var(--toolkit-fg, #111111);padding-left:0.75rem;margin-left:0;">
          For <strong>${escapeHtml(seg.name)}</strong> considering
          ${escapeHtml(statement.frame)}, this is the option that
          ${escapeHtml(statement.pointOfDifference)}, evidenced by
          ${escapeHtml(statement.evidence)}.
        </blockquote>
        <button type="button" class="toolkit-btn" id="stp-make-brief">Compile campaign brief</button>
      `);
      document.getElementById("stp-make-brief").addEventListener("click", () => {
        stage = "brief";
        render();
      });
      return;
    }

    if (stage === "brief") {
      const seg = segments.find((s) => s.id === targetSegmentId);
      panel.html(`
        <div class="toolkit-brief-box">
          <h4>Campaign brief</h4>
          <p><strong>Segment:</strong> ${escapeHtml(seg.name)}</p>
          <p><strong>Positioning statement:</strong> For ${escapeHtml(
            seg.name
          )} considering ${escapeHtml(statement.frame)}, this is the option
          that ${escapeHtml(statement.pointOfDifference)}, evidenced by
          ${escapeHtml(statement.evidence)}.</p>
        </div>
        <p style="margin-top:1rem;">This brief is the input to the
        <a href="../products/persona-builder.html">Persona Builder</a> and,
        once built, the 7Ps Marketing Mix Planner.</p>
        <button type="button" class="toolkit-btn secondary" id="stp-restart">Start over</button>
      `);
      document.getElementById("stp-restart").addEventListener("click", resetAll);
      return;
    }
  }

  function renderSegmentForm() {
    const wrap = d3.select("#stp-segment-form");
    wrap.html(`
      <label for="stp-seg-name">Segment name</label>
      <input type="text" id="stp-seg-name" placeholder="e.g. Budget-conscious students">
      <label for="stp-seg-size">Relative size (1&ndash;10)</label>
      <input type="number" id="stp-seg-size" min="1" max="10" value="5">
      <button type="button" class="toolkit-btn secondary" id="stp-add-segment">Add segment</button>
      <ul id="stp-segment-list" style="list-style:none;padding:0;margin:0.75rem 0;"></ul>
      <button type="button" class="toolkit-btn" id="stp-run-segmentation" disabled>Run segmentation</button>
    `);
    renderSegmentList();
    document.getElementById("stp-add-segment").addEventListener("click", () => {
      const nameInput = document.getElementById("stp-seg-name");
      const sizeInput = document.getElementById("stp-seg-size");
      const name = nameInput.value.trim();
      if (!name || segments.length >= 5) return;
      segments.push({
        id: segments.length,
        name,
        size: Number(sizeInput.value) || 5,
        color: PALETTE[segments.length % PALETTE.length],
      });
      nameInput.value = "";
      renderSegmentList();
    });
    document.getElementById("stp-run-segmentation").addEventListener("click", () => {
      assignDotsToSegments();
      stage = "segmented";
      render();
    });
  }

  function renderSegmentList() {
    const list = d3.select("#stp-segment-list");
    list
      .selectAll("li")
      .data(segments)
      .join("li")
      .style("margin-bottom", "0.25rem")
      .html(
        (d) =>
          `<span class="swatch" style="display:inline-block;width:0.75rem;height:0.75rem;border-radius:2px;background:${d.color};margin-right:0.4rem;"></span>${escapeHtml(
            d.name
          )} <span style="color:var(--toolkit-muted,#6b6b6b);">(size ${d.size})</span>
           <button type="button" class="toolkit-btn secondary" data-remove="${d.id}" style="padding:0.1rem 0.5rem;font-size:0.8rem;margin-left:0.4rem;">Remove</button>`
      );
    list.selectAll("button[data-remove]").on("click", function () {
      const id = Number(d3.select(this).attr("data-remove"));
      segments = segments.filter((s) => s.id !== id);
      renderSegmentList();
      updateAddDisabled();
    });
    updateAddDisabled();
  }

  function updateAddDisabled() {
    const runBtn = document.getElementById("stp-run-segmentation");
    const addBtn = document.getElementById("stp-add-segment");
    if (runBtn) runBtn.disabled = segments.length < 2;
    if (addBtn) addBtn.disabled = segments.length >= 5;
  }

  function assignDotsToSegments() {
    const totalSize = segments.reduce((sum, s) => sum + s.size, 0);
    let cursor = 0;
    const boundaries = segments.map((s) => {
      cursor += s.size / totalSize;
      return cursor;
    });
    dots.forEach((d) => {
      const r = (d.id + 0.5) / dots.length; // deterministic, evenly spread across segments
      const idx = boundaries.findIndex((b) => r <= b);
      d.segmentId = segments[idx === -1 ? segments.length - 1 : idx].id;
    });
  }

  function resetAll() {
    stage = "market";
    segments = [];
    targetSegmentId = null;
    statement = { frame: "", pointOfDifference: "", evidence: "" };
    dots.forEach((d) => {
      d.segmentId = null;
    });
    render();
  }

  function render() {
    updateStageNav();
    renderLegend();
    renderChevrons();
    renderPositionCircle();
    renderBriefBox();
    renderPanel();
    renderDots();
  }

  render();
})();
