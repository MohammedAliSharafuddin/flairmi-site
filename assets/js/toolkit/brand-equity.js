/*
 * assets/js/toolkit/brand-equity.js
 *
 * Brand Equity Assessor, a configuration of radar-scorer.js drawn as
 * Keller's customer-based brand equity pyramid. Six building blocks,
 * three statements each, scored 1 to 5. The pyramid only holds when each
 * level rests on a stronger one below it, so the summary flags any block
 * that outscores the block it depends on.
 */
(function () {
  "use strict";
  const TK = window.TK;
  // Each block and the block it rests on, left route rational, right emotional.
  const RESTS_ON = { performance: "salience", imagery: "salience", judgements: "performance", feelings: "imagery", resonance: ["judgements", "feelings"] };
  function mount(rootId) {
    if (!window.RadarScorer || !TK) return;
    window.RadarScorer.mount({
      rootId,
      storeKey: "flairmi-brand-equity-v1",
      subjectLabel: "Brand",
      subjectPlaceholder: "e.g. A coastal boutique hotel brand",
      defaultTitle: "Brand equity profile",
      view: "pyramid",
      dimensions: [
        { id: "salience", label: "Salience", color: TK.PALETTE[0], note: "Who are you? Awareness and recall.", questions: ["Customers recall the brand when they think of the category", "Customers recognise the brand's name and logo", "Customers know which needs the brand serves"] },
        { id: "performance", label: "Performance", color: TK.PALETTE[0], note: "What are you? How well it meets functional needs.", questions: ["The product does what it promises every time", "Service meets customers' expectations", "The price feels fair for the quality"] },
        { id: "imagery", label: "Imagery", color: TK.PALETTE[1], note: "What are you? How it meets social and psychological needs.", questions: ["The brand has a clear personality", "Customers can picture who uses the brand", "The brand brings memorable places or moments to mind"] },
        { id: "judgements", label: "Judgements", color: TK.PALETTE[0], note: "What about you? Quality, credibility, and consideration.", questions: ["Customers rate the brand's quality highly", "Customers find the brand credible", "Customers put the brand on their shortlist"] },
        { id: "feelings", label: "Feelings", color: TK.PALETTE[1], note: "What about you? The emotional response.", questions: ["The brand makes customers feel good", "Customers feel secure choosing the brand", "Using the brand earns social approval"] },
        { id: "resonance", label: "Resonance", color: TK.PALETTE[6], note: "What about you and me? Loyalty and attachment.", questions: ["Customers buy the brand again and again", "Customers feel attached to the brand", "Customers talk about and recommend the brand"] }
      ],
      sample: {
        subject: "A coastal boutique hotel brand",
        scores: { salience: [3, 4, 4], performance: [4, 4, 3], imagery: [4, 5, 5], judgements: [4, 3, 3], feelings: [4, 4, 3], resonance: [3, 3, 4] },
        notes: { salience: "Strong locally, weak in search for the wider region." }
      },
      summary(st) {
        const by = (id) => st.find((s) => s.d.id === id);
        const done = st.filter((s) => Number.isFinite(s.score));
        if (!done.length) return `<p class="tk-help">Score the statements to build the pyramid.</p>`;
        const weakest = done.slice().sort((a, b) => a.score - b.score)[0];
        const flags = [];
        Object.keys(RESTS_ON).forEach((id) => {
          const s = by(id);
          [].concat(RESTS_ON[id]).forEach((below) => {
            const b = by(below);
            if (Number.isFinite(s.score) && Number.isFinite(b.score) && s.score > b.score + 0.25)
              flags.push(`<li><strong>${s.d.label}</strong> (${TK.fmt(s.score, 1)}) outscores <strong>${b.d.label}</strong> (${TK.fmt(b.score, 1)}), the block it rests on. Strengthen ${b.d.label.toLowerCase()} first, or the higher score will be hard to hold.</li>`);
          });
        });
        const rational = TK.mean(["performance", "judgements"].map((id) => by(id).score));
        const emotional = TK.mean(["imagery", "feelings"].map((id) => by(id).score));
        return `<div class="tk-kpis">
            <div class="tk-kpi"><span class="tk-kpi-v">${TK.fmt(TK.mean(done.map((s) => s.score)), 2)} / 5</span><span class="tk-kpi-l">Overall brand equity</span></div>
            <div class="tk-kpi"><span class="tk-kpi-v">${Number.isFinite(rational) ? TK.fmt(rational, 2) : "n/a"}</span><span class="tk-kpi-l">Rational route</span></div>
            <div class="tk-kpi"><span class="tk-kpi-v">${Number.isFinite(emotional) ? TK.fmt(emotional, 2) : "n/a"}</span><span class="tk-kpi-l">Emotional route</span></div>
            <div class="tk-kpi"><span class="tk-kpi-v tk-kpi-text">${weakest.d.label}</span><span class="tk-kpi-l">Weakest block</span></div>
          </div>
          <ul class="tk-list">${flags.length ? flags.join("") : "<li>Each block rests on a block at least as strong. The pyramid is built in order.</li>"}</ul>`;
      }
    });
  }
  window.BrandEquity = { mount };
})();
