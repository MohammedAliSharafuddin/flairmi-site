/*
 * assets/js/toolkit/matrix-tools.js
 *
 * Configurations of bubble-matrix.js: BCG Growth-Share Matrix,
 * GE-McKinsey Matrix, Ansoff Matrix, the Importance-Performance
 * Analysis (IPA) matrix, the Stakeholder Power and
 * Interest Grid and the Strategic Options Matrix. Sample data describes a European hotel group, the
 * same setting as the Customer Journey Mapper's classroom case.
 */
(function () {
  "use strict";
  const TK = window.TK;
  const TINT = { green: "#e3f4ec", amber: "#fdf4df", red: "#fbe8e6", blue: "#e7f0fb", grey: "#f2f2f2" };
  const NAME = { key: "name", label: "Name", type: "text" };

  function bcg(rootId) {
    window.BubbleMatrix.mount({
      rootId, storeKey: "flairmi-bcg-v1", itemLabel: "Product", defaultTitle: "BCG growth-share matrix", sizeLabel: "Revenue",
      fields: [NAME,
        { key: "revenue", label: "Revenue", min: 0, help: "Annual revenue, any currency. Sets the bubble size." },
        { key: "growth", label: "Market growth %", step: 0.1, help: "Annual growth rate of the product's market." },
        { key: "rshare", label: "Relative share", min: 0.01, step: 0.01, help: "Your market share divided by the largest rival's share. 1.0 means level with the leader." }],
      settings: [{ key: "cut", label: "High-growth threshold (%)", default: 10, step: 0.5 }],
      compute: (it) => ({ x: TK.num(it.rshare), y: TK.num(it.growth), size: TK.num(it.revenue, 0) }),
      x: { label: "Relative market share", short: "Relative share", log: true, domain: [0.1, 10], reverse: true, ticks: [0.1, 0.2, 0.5, 1, 2, 5, 10], tickFormat: (d) => d + "×", format: (v) => TK.fmt(v, 2) + "×" },
      y: { label: "Market growth rate (%)", short: "Growth", domain: (pts) => [Math.min(-5, (d3.min(pts, (p) => p.y) || 0) - 2), Math.max(25, (d3.max(pts, (p) => p.y) || 0) + 3)], format: (v) => TK.fmt(v, 1) + "%" },
      regions: (ctx, xd, yd) => {
        const c = ctx.setting("cut");
        return [
          { x0: 1, x1: 10, y0: c, y1: yd[1], label: "Stars", fill: TINT.blue },
          { x0: 0.1, x1: 1, y0: c, y1: yd[1], label: "Question marks", fill: TINT.amber, labelAt: "right" },
          { x0: 1, x1: 10, y0: yd[0], y1: c, label: "Cash cows", fill: TINT.green },
          { x0: 0.1, x1: 1, y0: yd[0], y1: c, label: "Dogs", fill: TINT.grey, labelAt: "right" }
        ];
      },
      classify(p, ctx) {
        const high = p.y >= ctx.setting("cut"), lead = p.x >= 1;
        if (high && lead) return { label: "Star", advice: "Invest to hold share while the market grows. It becomes a cash cow as growth slows." };
        if (high) return { label: "Question mark", advice: "Invest to build share where you can win, or withdraw. Holding still uses cash and earns little back." };
        if (lead) return { label: "Cash cow", advice: "Defend share with modest spend and use the cash to fund stars and question marks." };
        return { label: "Dog", advice: "Harvest or divest, unless it supports a stronger product or serves a loyal niche profitably." };
      },
      notes: "Relative market share uses a log scale, as in the original matrix, so 0.5× and 2× sit the same distance from the 1× line.",
      sample: { title: "European hotel group, brand portfolio", settings: { cut: 10 }, items: [
        { name: "City business hotels", revenue: 42, growth: 3, rshare: 1.6 },
        { name: "Urban boutique", revenue: 18, growth: 14, rshare: 1.3 },
        { name: "Resort and spa", revenue: 25, growth: 6, rshare: 0.7 },
        { name: "Serviced apartments", revenue: 8, growth: 18, rshare: 0.4 },
        { name: "Airport hotels", revenue: 12, growth: 2, rshare: 0.5 }] }
    });
  }

  function ge(rootId) {
    const cut = [2.33, 3.67];
    window.BubbleMatrix.mount({
      rootId, storeKey: "flairmi-ge-mckinsey-v1", itemLabel: "Business unit", defaultTitle: "GE-McKinsey matrix", sizeLabel: "Revenue",
      fields: [NAME, { key: "revenue", label: "Revenue", min: 0, help: "Sets the bubble size." }],
      factors: { strength: { label: "Competitive strength" }, attract: { label: "Industry attractiveness" } },
      compute: (it, ctx) => ({ x: ctx.factorScore(it, "strength"), y: ctx.factorScore(it, "attract"), size: TK.num(it.revenue, 0) }),
      x: { label: "Competitive strength", short: "Strength", domain: [1, 5], reverse: true },
      y: { label: "Industry attractiveness", short: "Attractiveness", domain: [1, 5] },
      regions: () => {
        const b = [[1, cut[0]], [cut[0], cut[1]], [cut[1], 5]];
        const out = [];
        b.forEach((xs, xi) => b.forEach((ys, yi) => {
          const s = xi + yi;
          out.push({ x0: xs[0], x1: xs[1], y0: ys[0], y1: ys[1], fill: s >= 3 ? TINT.green : s === 2 ? TINT.amber : TINT.red,
            label: xi === 2 && yi === 2 ? "Invest and grow" : xi === 1 && yi === 1 ? "Selectivity" : xi === 0 && yi === 0 ? "Harvest or divest" : "" });
        }));
        return out;
      },
      classify(p) {
        const band = (v) => (v >= cut[1] ? 2 : v >= cut[0] ? 1 : 0);
        const s = band(p.x) + band(p.y);
        if (s >= 3) return { label: "Invest and grow", advice: "Put resources here first. Strong position in an attractive industry." };
        if (s === 2) return { label: "Selectivity", advice: "Manage for earnings. Invest only where a specific factor can be lifted." };
        return { label: "Harvest or divest", advice: "Limit investment, take cash out or exit." };
      },
      notes: "Each axis is the weighted mean of its factor scores on a 1 to 5 scale. The grid lines sit at 2.33 and 3.67, dividing each axis into thirds.",
      sample: { title: "European hotel group, business units",
        factors: {
          strength: [{ name: "Market share", weight: 30 }, { name: "Brand strength", weight: 25 }, { name: "Cost position", weight: 25 }, { name: "Distribution reach", weight: 20 }],
          attract: [{ name: "Market size", weight: 25 }, { name: "Market growth", weight: 25 }, { name: "Profit margins", weight: 30 }, { name: "Low rivalry", weight: 20 }]
        },
        items: [
          { name: "City business hotels", revenue: 42, f_strength: [5, 4, 4, 5], f_attract: [4, 2, 3, 2] },
          { name: "Urban boutique", revenue: 18, f_strength: [4, 5, 3, 3], f_attract: [3, 5, 4, 3] },
          { name: "Resort and spa", revenue: 25, f_strength: [3, 3, 2, 3], f_attract: [3, 3, 4, 3] },
          { name: "Serviced apartments", revenue: 8, f_strength: [2, 2, 3, 2], f_attract: [3, 5, 4, 2] },
          { name: "Airport hotels", revenue: 12, f_strength: [2, 2, 2, 3], f_attract: [2, 1, 2, 2] }] }
    });
  }

  function ansoff(rootId) {
    window.BubbleMatrix.mount({
      rootId, storeKey: "flairmi-ansoff-v1", itemLabel: "Initiative", defaultTitle: "Ansoff matrix", sizeLabel: "Investment",
      fields: [NAME,
        { key: "market", label: "Market newness (0 to 10)", min: 0, max: 10, step: 0.5, help: "0 means current customers and markets, 10 means entirely new ones." },
        { key: "product", label: "Product newness (0 to 10)", min: 0, max: 10, step: 0.5, help: "0 means current products, 10 means entirely new ones." },
        { key: "invest", label: "Investment", min: 0, help: "Sets the bubble size." }],
      compute: (it) => ({ x: TK.num(it.market), y: TK.num(it.product), size: TK.num(it.invest, 0) }),
      x: { label: "Market newness", short: "Market", domain: [0, 10], format: (v) => TK.fmt(v, 1) },
      y: { label: "Product newness", short: "Product", domain: [0, 10], format: (v) => TK.fmt(v, 1) },
      regions: [
        { x0: 0, x1: 5, y0: 0, y1: 5, label: "Market penetration", fill: TINT.green },
        { x0: 5, x1: 10, y0: 0, y1: 5, label: "Market development", fill: TINT.amber },
        { x0: 0, x1: 5, y0: 5, y1: 10, label: "Product development", fill: TINT.amber },
        { x0: 5, x1: 10, y0: 5, y1: 10, label: "Diversification", fill: TINT.red }],
      classify(p) {
        const risk = Math.round(((p.x + p.y) / 20) * 100);
        const nm = p.x >= 5, np = p.y >= 5;
        const name = nm && np ? "Diversification" : nm ? "Market development" : np ? "Product development" : "Market penetration";
        const advice = {
          "Market penetration": "Lowest risk. Grow share with current products in current markets through price, promotion or loyalty.",
          "Market development": "Moderate risk. Test demand in the new market before committing the full budget.",
          "Product development": "Moderate risk. Validate the new product with current customers who already trust the brand.",
          "Diversification": "Highest risk. Pilot small, set a stop point and check the business can run both new product and new market."
        }[name];
        return { label: `${name}, risk ${risk} of 100`, advice };
      },
      notes: "Risk is the mean of the two newness scores, scaled to 100. Distance from the bottom-left corner shows how far each initiative moves from what the business already knows.",
      sample: { title: "European hotel group, growth options", items: [
        { name: "Loyalty tiers for current guests", market: 1, product: 1.5, invest: 0.4 },
        { name: "Open in Porto", market: 7, product: 1, invest: 4 },
        { name: "Wellness packages", market: 1.5, product: 6, invest: 0.9 },
        { name: "Booking app for other hotels", market: 8, product: 8.5, invest: 2.5 },
        { name: "Corporate travel desk in Germany", market: 6, product: 3, invest: 1.2 }] }
    });
  }

  // IPA axes zoom to the data, rounded out to whole scale points, so
  // attributes rated close together remain readable.
  function zoom(vals, ctx) {
    const max = Number(ctx.setting("scale"));
    if (!vals.length) return [1, max];
    return [Math.max(1, Math.floor(Math.min.apply(null, vals) - 0.3)), Math.min(max, Math.ceil(Math.max.apply(null, vals) + 0.3))];
  }

  function ipa(rootId) {
    const cross = (ctx) => {
      if (ctx.setting("cross") === "midpoint") { const m = (1 + Number(ctx.setting("scale"))) / 2; return { x: m, y: m }; }
      const pts = ctx.points || [];
      return pts.length ? { x: TK.mean(pts.map((p) => p.x)), y: TK.mean(pts.map((p) => p.y)) } : { x: 4, y: 4 };
    };
    window.BubbleMatrix.mount({
      rootId, storeKey: "flairmi-ipa-v1", itemLabel: "Attribute", defaultTitle: "Importance-performance analysis",
      fields: [NAME,
        { key: "importance", label: "Importance", min: 1, max: 7, step: 0.1 },
        { key: "performance", label: "Performance", min: 1, max: 7, step: 0.1 }],
      settings: [
        { key: "scale", label: "Rating scale", default: 7, options: [[5, "1 to 5"], [7, "1 to 7"]] },
        { key: "cross", label: "Cross-hairs at", default: "means", options: [["means", "Data means"], ["midpoint", "Scale midpoint"]] }],
      compute: (it) => ({ x: TK.num(it.performance), y: TK.num(it.importance) }),
      x: { label: "Performance", domain: (pts, ctx) => zoom(pts.map((p) => p.x), ctx) },
      y: { label: "Importance", domain: (pts, ctx) => zoom(pts.map((p) => p.y), ctx) },
      lines: (ctx) => { const c = cross(ctx); return [{ x: c.x }, { y: c.y }]; },
      regions: (ctx, xd, yd) => {
        const c = cross(ctx);
        return [
          { x0: xd[0], x1: c.x, y0: c.y, y1: yd[1], label: "Concentrate here", fill: TINT.red, ink: "#b42318" },
          { x0: c.x, x1: xd[1], y0: c.y, y1: yd[1], label: "Keep up the good work", fill: TINT.green, ink: "#0f7a53", labelAt: "right" },
          { x0: xd[0], x1: c.x, y0: yd[0], y1: c.y, label: "Low priority", fill: TINT.grey },
          { x0: c.x, x1: xd[1], y0: yd[0], y1: c.y, label: "Possible overkill", fill: TINT.amber, labelAt: "right" }];
      },
      classify(p, ctx) {
        const c = cross(ctx), hi = p.y >= c.y, good = p.x >= c.x;
        if (hi && !good) return { label: "Concentrate here", advice: "Customers care about this and it underperforms. First call on improvement budget." };
        if (hi) return { label: "Keep up the good work", advice: "A strength customers value. Protect it and say so in marketing." };
        if (!good) return { label: "Low priority", advice: "Weak, but customers care little. Fix only if it is cheap." };
        return { label: "Possible overkill", advice: "Strong performance on something customers rate as less important. Resources may be better used elsewhere." };
      },
      notes: "Data-mean cross-hairs compare attributes with each other, so there is always something to fix. Scale-midpoint cross-hairs compare each attribute with an absolute standard.",
      sample: { title: "Hotel guest attributes", settings: { scale: 7, cross: "means" }, items: [
        { name: "Wi-Fi reliability", importance: 6.4, performance: 4.9 },
        { name: "Check-in speed", importance: 5.8, performance: 5.1 },
        { name: "Breakfast quality", importance: 5.9, performance: 6.2 },
        { name: "Room cleanliness", importance: 6.6, performance: 6.4 },
        { name: "Staff friendliness", importance: 6.1, performance: 6.3 },
        { name: "Spa facilities", importance: 4.2, performance: 5.9 },
        { name: "Local character of design", importance: 4.8, performance: 6.0 },
        { name: "Price transparency", importance: 6.2, performance: 4.6 },
        { name: "Loyalty benefits", importance: 4.0, performance: 3.8 }] }
    });
  }

  // Stakeholder power and interest grid , after Mendelow's
  // power and interest matrix. Bubble size is optional and shows how many
  // people the stakeholder group speaks for.
  function stakeholder(rootId) {
    window.BubbleMatrix.mount({
      rootId, storeKey: "flairmi-stakeholder-grid-v1", itemLabel: "Stakeholder", defaultTitle: "Stakeholder power and interest grid", sizeLabel: "People affected",
      fields: [NAME,
        { key: "power", label: "Power (0 to 10)", default: 5, min: 0, max: 10, step: 0.5, help: "How far the group can change the decision or its outcome." },
        { key: "interest", label: "Interest (0 to 10)", default: 5, min: 0, max: 10, step: 0.5, help: "How much the decision affects the group, or how much it cares." },
        { key: "people", label: "People affected", min: 0, help: "Optional. Sets the bubble size." }],
      compute: (it) => ({ x: TK.num(it.interest), y: TK.num(it.power), size: Math.max(1, TK.num(it.people, 1)) }),
      x: { label: "Interest", domain: [0, 10], format: (v) => TK.fmt(v, 1) },
      y: { label: "Power", domain: [0, 10], format: (v) => TK.fmt(v, 1) },
      regions: [
        { x0: 5, x1: 10, y0: 5, y1: 10, label: "Manage closely", fill: TINT.red, ink: "#b42318", labelAt: "right" },
        { x0: 0, x1: 5, y0: 5, y1: 10, label: "Keep satisfied", fill: TINT.amber },
        { x0: 5, x1: 10, y0: 0, y1: 5, label: "Keep informed", fill: TINT.blue, labelAt: "right" },
        { x0: 0, x1: 5, y0: 0, y1: 5, label: "Monitor", fill: TINT.grey }],
      classify(p) {
        const hp = p.y >= 5, hi = p.x >= 5;
        if (hp && hi) return { label: "Manage closely", advice: "Involve them in the decision and agree how their concerns are met." };
        if (hp) return { label: "Keep satisfied", advice: "Consult before acting. Their interest can rise fast once a decision touches them." };
        if (hi) return { label: "Keep informed", advice: "Explain the decision and its reasons, and give them a route to be heard. Low power is no measure of how much they lose." };
        return { label: "Monitor", advice: "Check from time to time whether their power or interest has changed." };
      },
      notes: "Position is a judgement, so record why each group sits where it does. Groups with little power and high interest often have no voice in the room, which is where the ethical questions sit.",
      sample: { title: "Sample case: acting on the no-show result", items: [
        { name: "Event company board", power: 9, interest: 7, people: 6 },
        { name: "VIP ticket holders", power: 3, interest: 9, people: 30 },
        { name: "Student ticket holders", power: 2, interest: 4, people: 46 },
        { name: "Venue partner", power: 7, interest: 3, people: 4 },
        { name: "Consumer protection regulator", power: 8, interest: 2, people: 3 },
        { name: "Front-of-house staff", power: 2, interest: 8, people: 12 }] }
    });
  }

  // Porter scenario file (porter-scenario-data.csv): check the 2
  // derived columns and pass Recommended_Strategy through exactly as given.
  // That column follows no rule in the file, so it is shown, never computed.
  const FORCES = ["Competitive_Rivalry", "Threat_New_Entrants", "Supplier_Power", "Buyer_Power", "Threat_Substitutes"];
  function porterRows(rows) {
    return rows.map((r) => {
      const f = FORCES.map((k) => TK.num(r[k]));
      const mean = f.reduce((s, x) => s + x, 0) / f.length;
      const attract = Math.round(10 - mean);
      return { id: r.Scenario_ID, industry: r.Industry, forces: f, mean, attract, fileMean: TK.num(r.Mean_Force_Score), fileAttract: TK.num(r.Industry_Attractiveness),
        meanOk: Math.abs(mean - TK.num(r.Mean_Force_Score)) < 1e-9, attractOk: attract === TK.num(r.Industry_Attractiveness), strategy: r.Recommended_Strategy };
    });
  }

  // Strategic Options Matrix : attractiveness against
  // feasibility. A Porter scenario's Industry_Attractiveness can seed an
  // option. Adding one rewrites the saved state and remounts the engine on a
  // fresh element, so bubble-matrix.js needs no change.
  function strategicOptions(rootId) {
    const storeKey = "flairmi-strategic-options-v1";
    const host = document.getElementById(rootId);
    if (!host || !window.BubbleMatrix || !window.TKData) return;
    const config = {
      rootId, storeKey, itemLabel: "Option", defaultTitle: "Strategic options matrix", sizeLabel: "Investment",
      fields: [NAME,
        { key: "attract", label: "Attractiveness (0 to 10)", default: 5, min: 0, max: 10, step: 0.5, help: "How attractive the market or option is, for example from a Porter analysis." },
        { key: "feasible", label: "Feasibility (0 to 10)", default: 5, min: 0, max: 10, step: 0.5, help: "How far the firm's resources, capabilities and funds can deliver it." },
        { key: "invest", label: "Investment", default: 1, min: 0, help: "Sets the bubble size." }],
      compute: (it) => ({ x: TK.num(it.feasible), y: TK.num(it.attract), size: TK.num(it.invest, 0) }),
      x: { label: "Feasibility", domain: [0, 10], format: (v) => TK.fmt(v, 1) },
      y: { label: "Attractiveness", domain: [0, 10], format: (v) => TK.fmt(v, 1) },
      regions: [
        { x0: 5, x1: 10, y0: 5, y1: 10, label: "Pursue", fill: TINT.green, ink: "#0f7a53", labelAt: "right" },
        { x0: 0, x1: 5, y0: 5, y1: 10, label: "Build capability first", fill: TINT.amber },
        { x0: 5, x1: 10, y0: 0, y1: 5, label: "Quick win, limited upside", fill: TINT.blue, labelAt: "right" },
        { x0: 0, x1: 5, y0: 0, y1: 5, label: "Set aside", fill: TINT.grey }],
      classify(p) {
        const ha = p.y >= 5, hf = p.x >= 5;
        if (ha && hf) return { label: "Pursue", advice: "Attractive and within reach. Commit resources and set milestones." };
        if (ha) return { label: "Build capability first", advice: "Worth having and out of reach today. Name the resource or partner that would close the gap." };
        if (hf) return { label: "Quick win, limited upside", advice: "Easy to do and modest in return. Take it if it is cheap and keeps attention on the main plan." };
        return { label: "Set aside", advice: "Weak on both counts. Revisit if the market or the firm changes." };
      },
      notes: "The lines sit at the midpoint, 5, of each scale. An option near a line is a judgement call, which makes it a good one to defend when another group challenges it.",
      sample: { title: "Regional event company, growth options", items: [
        { name: "Corporate retreats", attract: 7, feasible: 7, invest: 3 },
        { name: "International conferences", attract: 8, feasible: 3, invest: 8 },
        { name: "Local workshops", attract: 4, feasible: 9, invest: 1 },
        { name: "Virtual events platform", attract: 6, feasible: 4, invest: 5 },
        { name: "Wedding planning", attract: 3, feasible: 4, invest: 2 }] }
    };
    const panel = document.createElement("div");
    panel.className = "tk-panel so-porter";
    panel.innerHTML = `<h3>Use a Porter scenario</h3>
      <p class="tk-help">Pick a scenario from the file and add it as an option. Its Industry_Attractiveness (10 minus the mean force score, rounded, on a 0 to 10 scale) becomes the option's attractiveness. Feasibility is yours to judge.</p>
      <div class="so-loader"></div>
      <div class="tk-toolbar"><label class="tk-grow">Scenario <select data-k="scenario" aria-label="Porter scenario"></select></label>
      <button type="button" class="toolkit-btn" data-k="add-scenario" disabled>Add as an option</button></div>
      <div class="so-scenario"></div>`;
    host.parentNode.insertBefore(panel, host);
    let scen = [];
    const sel = panel.querySelector('[data-k="scenario"]'), addBtn = panel.querySelector('[data-k="add-scenario"]');
    const tick = '<span class="tk-pos" aria-label="agrees">&#10003;</span>';
    function showScenario() {
      const s = scen[Number(sel.value)];
      if (!s) { panel.querySelector(".so-scenario").innerHTML = ""; return; }
      const short = { Competitive_Rivalry: "rivalry", Threat_New_Entrants: "new entrants", Supplier_Power: "supplier power", Buyer_Power: "buyer power", Threat_Substitutes: "substitutes" };
      panel.querySelector(".so-scenario").innerHTML = `<p class="tk-help">Forces, 0 to 10: ${FORCES.map((k, i) => `${short[k]} ${s.forces[i]}`).join(", ")}.</p>
        <div class="tk-kpis">
          <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(s.fileMean, 1)} ${s.meanOk ? tick : '<span class="tk-neg">tool ' + TK.fmt(s.mean, 2) + "</span>"}</span><span class="tk-kpi-l">Mean force score</span></div>
          <div class="tk-kpi"><span class="tk-kpi-v">${s.fileAttract} ${s.attractOk ? tick : '<span class="tk-neg">tool ' + s.attract + "</span>"}</span><span class="tk-kpi-l">Industry attractiveness, 0 to 10</span></div>
          <div class="tk-kpi"><span class="tk-kpi-v tk-kpi-text">${TK.esc(String(s.strategy).replace(/_/g, " "))}</span><span class="tk-kpi-l">Recommended strategy, as given in the file</span></div>
        </div>
        <p class="tk-help">${scen.filter((x) => x.meanOk && x.attractOk).length} of ${scen.length} scenarios agree with the tool on both derived columns. The recommended strategy follows no fixed rule in the file, so treat it as one group's call and test it on the matrix.</p>`;
    }
    const loader = window.TKData.loader({ file: "porter-scenario-data.csv", label: "the sample file", required: ["Scenario_ID", "Industry"].concat(FORCES, ["Mean_Force_Score", "Industry_Attractiveness", "Recommended_Strategy"]),
      onLoad(parsed) {
        scen = porterRows(parsed.rows);
        sel.innerHTML = scen.map((s, i) => `<option value="${i}">Scenario ${TK.esc(s.id)}: ${TK.esc(s.industry)}, attractiveness ${s.fileAttract}</option>`).join("");
        addBtn.disabled = false;
        showScenario();
      } });
    panel.querySelector(".so-loader").appendChild(loader);
    sel.addEventListener("change", showScenario);
    function remount() {
      const old = document.getElementById(rootId);
      old.parentNode.replaceChild(old.cloneNode(false), old);
      window.BubbleMatrix.mount(config);
    }
    addBtn.addEventListener("click", () => {
      const s = scen[Number(sel.value)];
      if (!s) return;
      const state = TK.store.get(storeKey, null) || JSON.parse(JSON.stringify(config.sample));
      state.items.push({ name: `${s.industry} (scenario ${s.id})`, attract: s.fileAttract, feasible: 5, invest: 1 });
      TK.store.set(storeKey, state);
      remount();
    });
    window.BubbleMatrix.mount(config);
    loader.loadServed();
  }

  window.MatrixTools = { bcg, ge, ansoff, ipa, stakeholder, strategicOptions, porterRows };
})();
