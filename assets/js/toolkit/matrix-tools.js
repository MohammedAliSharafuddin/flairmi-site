/*
 * assets/js/toolkit/matrix-tools.js
 *
 * Configurations of bubble-matrix.js: BCG Growth-Share Matrix,
 * GE-McKinsey Matrix, Ansoff Matrix, and the Importance-Performance
 * Analysis (IPA) matrix. Sample data describes a European hotel group, the
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
        return { label: "Harvest or divest", advice: "Limit investment, take cash out, or exit." };
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
          "Market penetration": "Lowest risk. Grow share with current products in current markets through price, promotion, or loyalty.",
          "Market development": "Moderate risk. Test demand in the new market before committing the full budget.",
          "Product development": "Moderate risk. Validate the new product with current customers who already trust the brand.",
          "Diversification": "Highest risk. Pilot small, set a stop point, and check the business can run both new product and new market."
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

  window.MatrixTools = { bcg, ge, ansoff, ipa };
})();
