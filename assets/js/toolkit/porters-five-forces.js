/*
 * assets/js/toolkit/porters-five-forces.js
 *
 * Porter's Five Forces Analyser, a configuration of radar-scorer.js. Each
 * statement is written so that agreement means a stronger force. Industry
 * attractiveness is 6 minus the mean force score, so a market with weak
 * forces scores high.
 */
(function () {
  "use strict";
  const TK = window.TK;
  function verdict(v) {
    return v >= 3.67 ? "High" : v >= 2.33 ? "Moderate" : "Low";
  }
  function mount(rootId) {
    if (!window.RadarScorer || !TK) return;
    window.RadarScorer.mount({
      rootId,
      storeKey: "flairmi-five-forces-v1",
      subjectLabel: "Industry or market",
      subjectPlaceholder: "e.g. Boutique hotels in Lisbon",
      defaultTitle: "Five forces analysis",
      fill: TK.PALETTE[0],
      dimensions: [
        { id: "entry", label: "Threat of new entrants", color: TK.PALETTE[0], questions: ["Starting up in this market needs little capital", "Customers show little loyalty to existing brands", "Regulation and licensing are light", "New players reach distribution channels easily"] },
        { id: "supplier", label: "Supplier power", color: TK.PALETTE[1], questions: ["A few suppliers control key inputs", "Switching supplier is costly or slow", "Key inputs have few substitutes", "Suppliers could sell direct to our customers"] },
        { id: "buyer", label: "Buyer power", color: TK.PALETTE[2], questions: ["A few large buyers account for most sales", "Buyers switch provider at little cost", "Buyers are highly price sensitive", "Buyers have full price and product information"] },
        { id: "subst", label: "Threat of substitutes", color: TK.PALETTE[3], questions: ["Other products meet the same need", "Substitutes offer better value for money", "Customers move to substitutes easily"] },
        { id: "rivalry", label: "Competitive rivalry", color: TK.PALETTE[6], questions: ["Many competitors are of a similar size", "Market growth is slow", "Offers are hard to tell apart", "Exit barriers keep weak competitors in the market"] }
      ],
      sample: {
        subject: "Boutique hotels in Lisbon",
        scores: { entry: [3, 3, 2, 4], supplier: [2, 2, 2, 1], buyer: [2, 5, 4, 5], subst: [4, 4, 4], rivalry: [4, 2, 3, 3] },
        notes: { buyer: "Booking platforms show every rate side by side.", subst: "Short-term rentals compete for the same guests." }
      },
      summary(st) {
        const done = st.filter((s) => Number.isFinite(s.score));
        if (!done.length) return `<p class="tk-help">Score the statements to see the industry's attractiveness.</p>`;
        const meanForce = TK.mean(done.map((s) => s.score));
        const attract = 6 - meanForce;
        const sorted = done.slice().sort((a, b) => b.score - a.score);
        const strong = sorted.filter((s) => s.score >= 3.5);
        return `<div class="tk-kpis">
            <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(attract, 2)} / 5</span><span class="tk-kpi-l">Industry attractiveness</span></div>
            <div class="tk-kpi"><span class="tk-kpi-v">${verdict(attract)}</span><span class="tk-kpi-l">Rating</span></div>
            <div class="tk-kpi"><span class="tk-kpi-v tk-kpi-text">${TK.esc(sorted[0].d.label)}</span><span class="tk-kpi-l">Strongest force</span></div>
            <div class="tk-kpi"><span class="tk-kpi-v">${done.length} / ${st.length}</span><span class="tk-kpi-l">Forces scored</span></div>
          </div>
          <ul class="tk-list">${strong.length ? strong.map((s) => `<li><strong>${TK.esc(s.d.label)}</strong> is strong at ${TK.fmt(s.score, 1)}, so it holds down profit in this market.${s.note ? " " + TK.esc(s.note) : ""}</li>`).join("") : "<li>No force scores 3.5 or above. Profit in this market faces light structural pressure.</li>"}</ul>`;
      }
    });
  }
  window.PortersFiveForces = { mount };
})();
