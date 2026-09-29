/*
 * assets/js/toolkit/planning.js
 *
 * 7Ps Marketing Mix Planner and Campaign Brief Generator.
 *
 * The planner records the seven Ps against a target segment and a
 * positioning statement, read from STP Builder when one is saved on this
 * device. Each P is rated for how well it supports the positioning.
 *
 * The brief generator pulls together a Persona Builder persona, the STP
 * positioning, and the 7Ps plan, adds objective, KPIs, budget split, and
 * timeline, and lays them out as one brief to export or copy.
 *
 * Usage: window.Planning.sevenPs({ rootId }), window.Planning.brief({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;
  const PLAN_KEY = "flairmi-7ps-v1", BRIEF_KEY = "flairmi-brief-v1", STP_KEY = "flairmi-stp-latest";

  const PS = [
    { id: "product", label: "Product", prompts: ["What core benefit does the offer deliver?", "Which features, variants, or service levels?", "What branding and packaging?"] },
    { id: "price", label: "Price", prompts: ["What price point, and why?", "Discounts, bundles, or payment terms?", "How does it compare with the main alternative?"] },
    { id: "place", label: "Place", prompts: ["Where and how do customers buy?", "Which channels and partners?", "How is availability managed?"] },
    { id: "promotion", label: "Promotion", prompts: ["What is the key message?", "Which channels and formats?", "What budget and timing?"] },
    { id: "people", label: "People", prompts: ["Who delivers the service?", "What training and authority do they need?", "How is good service recognised?"] },
    { id: "process", label: "Process", prompts: ["What are the steps from enquiry to after-sale?", "Where could the process fail?", "Which service standards apply?"] },
    { id: "physical", label: "Physical evidence", prompts: ["What does the customer see and touch?", "Which proof reassures them?", "How is the environment kept consistent?"] }
  ];

  const SAMPLE_PLAN = {
    segment: "Business travellers who book direct",
    positioning: "For business travellers who book direct considering a city hotel for a work trip, this is the option that answers every practical question before they pay, evidenced by all-in prices and Wi-Fi speeds shown at booking.",
    answers: {
      product: ["A quiet, well-equipped room for working stays", "Business room with desk and 300 Mbps Wi-Fi, late check-out for members", "Urban boutique brand, calm design, clear signage"],
      price: ["EUR 165 member rate, 8% below the public rate", "Free breakfast on stays of 3 nights or more", "Level with chain competitors once their fees are added"],
      place: ["Direct website and app, corporate travel desk", "Two corporate booking platforms, no discount sites", "Member rate available until 18:00 on the day"],
      promotion: ["Know everything before you book", "LinkedIn, search, email to past guests", "EUR 60,000 over 12 weeks, heavier in the first 4"],
      people: ["Front desk and guest relations", "Authority to waive fees up to EUR 50 without approval", "Monthly recognition tied to guest comments"],
      process: ["Search, book, pre-arrival email, mobile check-in, stay, follow-up", "Pre-arrival email not sent when a booking comes through a platform", "Check-in under 4 minutes, replies to messages within 1 hour"],
      physical: ["Room photos with the desk, booking page, lobby workspace", "Verified review score and Wi-Fi speed test on the booking page", "Brand standards audit each quarter"]
    },
    fit: { product: 5, price: 4, place: 4, promotion: 5, people: 3, process: 3, physical: 4 }
  };

  function readStp() {
    return TK.store.get(STP_KEY, null);
  }

  // ---------------- 7Ps planner ----------------
  function sevenPs(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    let state = TK.store.get(PLAN_KEY, null) || JSON.parse(JSON.stringify(SAMPLE_PLAN));
    const save = () => TK.store.set(PLAN_KEY, state);

    root.innerHTML = `
      <div class="tk-toolbar">
        <button type="button" class="toolkit-btn secondary" data-a="stp">Use STP Builder positioning</button>
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="clear">Start blank</button>
        <span class="tk-status" data-k="msg"></span>
      </div>
      <div class="tk-grid">
        <label>Target segment <input type="text" data-k="segment"></label>
      </div>
      <label>Positioning statement <textarea rows="2" data-k="positioning"></textarea></label>
      <p class="tk-help">Answer the prompts for each P, then rate from 1 to 5 how well that P supports the positioning statement.</p>
      <div class="tk-cards ps-cards"></div>
      <div class="tk-report">
        <h3 class="tk-report-title">7Ps marketing mix plan</h3>
        <div class="tk-kpis"></div>
        <h4>Support for the positioning, by P</h4>
        <div class="tk-chart-box ps-chart"></div>
        <div class="ps-summary"></div>
      </div>`;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const report = root.querySelector(".tk-report");
    root.appendChild(TK.exportRow(report, "7ps-marketing-mix-plan"));

    ["segment", "positioning"].forEach((k) => q(k).addEventListener("input", () => { state[k] = q(k).value; save(); renderReport(); }));
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "stp") {
        const stp = readStp();
        if (!stp) { TK.status(q("msg"), "No STP Builder positioning saved on this device yet."); return; }
        state.segment = stp.segment;
        state.positioning = stp.statement;
        TK.status(q("msg"), "Loaded from STP Builder.");
      }
      if (a.dataset.a === "sample") state = JSON.parse(JSON.stringify(SAMPLE_PLAN));
      if (a.dataset.a === "clear") state = { segment: "", positioning: "", answers: {}, fit: {} };
      save();
      renderAll();
    });

    function renderCards() {
      root.querySelector(".ps-cards").innerHTML = PS.map((p, k) => `
        <div class="tk-card" data-p="${p.id}" style="border-top-color:${TK.PALETTE[k]}">
          <h4>${p.label}</h4>
          ${p.prompts.map((pr, i) => `<label>${pr}<textarea rows="2" data-i="${i}">${TK.esc((state.answers[p.id] || [])[i] || "")}</textarea></label>`).join("")}
          <label>Supports the positioning
            <div class="rs-scale" role="radiogroup" aria-label="${p.label} support">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" data-v="${n}" aria-checked="${state.fit[p.id] === n}">${n}</button>`).join("")}</div>
          </label>
        </div>`).join("");
      root.querySelectorAll(".ps-cards textarea").forEach((t) => t.addEventListener("input", () => {
        const id = t.closest("[data-p]").dataset.p;
        state.answers[id] = state.answers[id] || [];
        state.answers[id][Number(t.dataset.i)] = t.value;
        save();
        renderReport();
      }));
      root.querySelectorAll(".ps-cards .rs-scale button").forEach((b) => b.addEventListener("click", () => {
        const id = b.closest("[data-p]").dataset.p, v = Number(b.dataset.v);
        state.fit[id] = state.fit[id] === v ? undefined : v;
        b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(Number(x.dataset.v) === state.fit[id])));
        save();
        renderReport();
      }));
    }

    function renderReport() {
      const answered = PS.reduce((s, p) => s + (state.answers[p.id] || []).filter((a) => a && a.trim()).length, 0);
      const fits = PS.map((p) => state.fit[p.id]).filter(Boolean);
      const weakest = PS.filter((p) => state.fit[p.id]).sort((a, b) => state.fit[a.id] - state.fit[b.id])[0];
      report.querySelector(".tk-kpis").innerHTML = [
        [`${answered} of 21`, "Prompts answered"], [fits.length ? TK.fmt(TK.mean(fits), 1) + " / 5" : "n/a", "Mean support for positioning"],
        [weakest ? weakest.label : "n/a", "Weakest link"]
      ].map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      const box = report.querySelector(".ps-chart");
      box.innerHTML = "";
      const W = 700, H = 280, M = { l: 130, r: 40, t: 10, b: 30 };
      const svg = TK.svg(box, W, H, "Rating of how well each P supports the positioning");
      const x = d3.scaleLinear().domain([0, 5]).range([M.l, W - M.r]);
      const y = d3.scaleBand().domain(PS.map((p) => p.id)).range([M.t, H - M.b]).padding(0.25);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5)));
      PS.forEach((p, k) => {
        const v = state.fit[p.id] || 0;
        svg.append("text").attr("x", M.l - 8).attr("y", y(p.id) + y.bandwidth() / 2 + 4).attr("text-anchor", "end").attr("font-size", 12).attr("fill", TK.INK).text(p.label);
        svg.append("rect").attr("x", M.l).attr("y", y(p.id)).attr("width", x(v) - M.l).attr("height", y.bandwidth()).attr("fill", TK.PALETTE[k]);
        svg.append("text").attr("x", x(v) + 6).attr("y", y(p.id) + y.bandwidth() / 2 + 4).attr("font-size", 11).attr("fill", TK.MUTED).text(v ? v : "not rated");
      });
      report.querySelector(".ps-summary").innerHTML = `
        <p><strong>Segment:</strong> ${TK.esc(state.segment || "not set")}</p>
        <p><strong>Positioning:</strong> ${TK.esc(state.positioning || "not set")}</p>
        <div class="tk-table-wrap"><table class="tk-table"><tbody>${PS.map((p) => `<tr><th>${p.label}</th><td>${(state.answers[p.id] || []).filter((a) => a && a.trim()).map(TK.esc).join("<br>") || '<span class="tk-help">Not answered</span>'}</td></tr>`).join("")}</tbody></table></div>`;
    }

    function renderAll() {
      q("segment").value = state.segment || "";
      q("positioning").value = state.positioning || "";
      renderCards();
      renderReport();
    }
    renderAll();
  }

  // ---------------- Campaign brief ----------------
  const CHANNELS = ["Search", "Social media", "Email", "Display", "Video", "Out of home", "PR", "Partners", "Events", "Direct mail"];
  const SAMPLE_BRIEF = {
    name: "Know before you book",
    objective: "Grow direct business bookings at the urban boutique hotels by 15% between January and March 2027, against the same period of 2026.",
    kpis: "Direct business bookings, member sign-ups, cost per direct booking, share of bookings through platforms",
    budget: 60000, currency: "EUR", start: "2027-01-04", end: "2027-03-28",
    channels: { "Search": 35, "Social media": 25, "Email": 15, "Partners": 25 },
    mandatories: "Show all-in prices. Use the brand's calm design language. No discount-led headlines.",
    segment: "Business travellers who book direct",
    positioning: "For business travellers who book direct considering a city hotel for a work trip, this is the option that answers every practical question before they pay, evidenced by all-in prices and Wi-Fi speeds shown at booking.",
    message: "Know everything before you book",
    audience: "Lukas Hoffmann, IT project manager from Munich. Books 6 to 8 stays a year and reads the hotel website before the reviews. Wants all-in prices, reliable Wi-Fi, and recognition as a returning guest.",
    owner: "Head of Marketing, urban boutique hotels"
  };

  function brief(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    let state = TK.store.get(BRIEF_KEY, null) || JSON.parse(JSON.stringify(SAMPLE_BRIEF));
    const save = () => TK.store.set(BRIEF_KEY, state);
    const personas = (window.FlairJourney ? window.FlairJourney.savedPersonas() : []);

    root.innerHTML = `
      <div class="tk-panel bf-sources"></div>
      <div class="tk-toolbar">
        <button type="button" class="toolkit-btn secondary" data-a="sample">Load sample</button>
        <button type="button" class="toolkit-btn secondary" data-a="clear">Start blank</button>
      </div>
      <div class="tk-grid">
        <label>Campaign name <input type="text" data-k="name"></label>
        <label>Budget <input type="number" min="0" data-k="budget"></label>
        <label>Currency <input type="text" data-k="currency" maxlength="4"></label>
        <label>Start date <input type="date" data-k="start"></label>
        <label>End date <input type="date" data-k="end"></label>
        <label>Approval owner <input type="text" data-k="owner"></label>
      </div>
      <label>Objective, specific and dated <textarea rows="2" data-k="objective"></textarea></label>
      <label>KPIs, comma separated <input type="text" data-k="kpis"></label>
      <label>Mandatories <textarea rows="2" data-k="mandatories"></textarea></label>
      <p class="tk-help">Segment, positioning, key message, and audience fill in from the tools above when they have data on this device. Anything typed here takes priority.</p>
      <div class="tk-grid">
        <label>Target segment <input type="text" data-k="segment"></label>
        <label>Key message <input type="text" data-k="message"></label>
      </div>
      <label>Positioning statement <textarea rows="2" data-k="positioning"></textarea></label>
      <label>Audience summary, used when no persona is chosen <textarea rows="2" data-k="audience"></textarea></label>
      <p class="tk-help">Budget share by channel, in percent. Leave a channel at 0 to exclude it.</p>
      <div class="tk-grid bf-channels"></div>
      <div class="tk-report bf-doc"></div>`;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const doc = root.querySelector(".bf-doc");
    root.appendChild(TK.exportRow(doc, () => TK.slug(state.name, "campaign-brief"), [
      { label: "Copy as text", run: (st) => TK.copyText(asText()).then(() => TK.status(st, "Copied.")) },
      { label: "Download Markdown", run: (st) => { TK.downloadText(asText(), TK.slug(state.name, "campaign-brief") + ".md", "text/markdown"); TK.status(st, "Saved."); } }
    ]));

    function renderSources() {
      const stp = readStp(), plan = TK.store.get(PLAN_KEY, null);
      root.querySelector(".bf-sources").innerHTML = `<h3>Sources on this device</h3>
        <div class="tk-grid">
          <label>Persona <select data-k="persona"><option value="">None</option>${personas.map((p) => `<option value="${TK.esc(p.id)}"${state.personaId === p.id ? " selected" : ""}>${TK.esc(p.name)}</option>`).join("")}</select></label>
        </div>
        <ul class="tk-list">
          <li>Persona Builder: ${personas.length ? `${personas.length} saved persona${personas.length > 1 ? "s" : ""}` : `none saved. <a href="https://flairmi.com/tools/persona-builder/">Build one</a>`}</li>
          <li>STP Builder: ${stp ? `positioning for ${TK.esc(stp.segment)}` : `nothing saved. <a href="stp-builder.qmd">Run STP Builder</a>`}</li>
          <li>7Ps Planner: ${plan ? `plan for ${TK.esc(plan.segment || "an unnamed segment")}` : `nothing saved. <a href="7ps-marketing-mix-planner.qmd">Open the planner</a>`}</li>
        </ul>`;
      q("persona").addEventListener("change", () => { state.personaId = q("persona").value; save(); renderDoc(); });
    }

    function renderChannels() {
      const total = CHANNELS.reduce((s, c) => s + TK.num(state.channels[c], 0), 0);
      root.querySelector(".bf-channels").innerHTML = CHANNELS.map((c) => `<label class="tk-inline">${c}<input type="number" min="0" max="100" data-ch="${c}" value="${TK.num(state.channels[c], 0)}"></label>`).join("") +
        `<p class="tk-help ${total === 100 ? "" : "tk-warn"}">Total ${total}%${total === 100 ? "" : ". Shares are rescaled to 100% in the brief."}</p>`;
      root.querySelectorAll("[data-ch]").forEach((i) => i.addEventListener("change", () => { state.channels[i.dataset.ch] = Math.max(0, TK.num(i.value, 0)); save(); renderChannels(); renderDoc(); }));
    }

    ["name", "budget", "currency", "start", "end", "owner", "objective", "kpis", "mandatories", "segment", "positioning", "message", "audience"].forEach((k) =>
      q(k).addEventListener("input", () => { state[k] = k === "budget" ? TK.num(q(k).value, 0) : q(k).value; save(); renderDoc(); }));
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]");
      if (!a) return;
      state = a.dataset.a === "sample" ? JSON.parse(JSON.stringify(SAMPLE_BRIEF)) : { name: "", objective: "", kpis: "", budget: 0, currency: "EUR", start: "", end: "", channels: {}, mandatories: "", owner: "", segment: "", positioning: "", message: "", audience: "" };
      save();
      renderAll();
    });

    function gather() {
      const stp = readStp(), plan = TK.store.get(PLAN_KEY, null);
      const p = personas.find((x) => x.id === state.personaId);
      const pd = p ? p.data : null;
      const shares = CHANNELS.filter((c) => TK.num(state.channels[c], 0) > 0).map((c) => ({ c, v: TK.num(state.channels[c], 0) }));
      const tot = d3.sum(shares, (s) => s.v) || 1;
      shares.forEach((s) => { s.share = s.v / tot; s.amount = s.share * TK.num(state.budget, 0); });
      return {
        stp, plan, persona: pd, shares,
        segment: state.segment || (plan && plan.segment) || (stp && stp.segment) || (pd && pd.journey && pd.journey.segment) || "",
        positioning: state.positioning || (plan && plan.positioning) || (stp && stp.statement) || "",
        message: state.message || (plan && plan.answers && plan.answers.promotion ? plan.answers.promotion[0] : "")
      };
    }

    function lines(t) { return String(t || "").split("\n").map((s) => s.trim()).filter(Boolean); }

    function renderDoc() {
      const g = gather(), pd = g.persona;
      doc.innerHTML = `
        <div class="bf-head"><span class="tk-badge">Campaign brief</span><h3>${TK.esc(state.name || "Untitled campaign")}</h3>
          <p class="tk-help">${TK.esc(state.start || "start not set")} to ${TK.esc(state.end || "end not set")} &middot; Budget ${TK.esc(state.currency || "")} ${TK.fmtInt(TK.num(state.budget, 0))} &middot; Owner: ${TK.esc(state.owner || "not set")}</p></div>
        <h4>Objective</h4><p>${TK.esc(state.objective || "Not set")}</p>
        <h4>Target audience</h4>
        <p><strong>Segment:</strong> ${TK.esc(g.segment || "Not set")}</p>
        ${pd ? `<p><strong>Persona:</strong> ${TK.esc(pd["f-name"] || "")}${pd["f-role"] ? ", " + TK.esc(pd["f-role"]) : ""}. ${TK.esc(pd["f-tagline"] || "")}</p>
          ${lines(pd["f-goals"]).length ? `<p><strong>Goals:</strong> ${lines(pd["f-goals"]).map(TK.esc).join(", ")}</p>` : ""}
          ${lines(pd["f-pains"]).length ? `<p><strong>Pain points:</strong> ${lines(pd["f-pains"]).map(TK.esc).join(", ")}</p>` : ""}` : state.audience ? `<p><strong>Audience:</strong> ${TK.esc(state.audience)}</p>` : `<p class="tk-help">Choose a saved persona above, or write an audience summary.</p>`}
        <h4>Positioning</h4><p>${TK.esc(g.positioning || "Not set. Run STP Builder or the 7Ps Planner.")}</p>
        ${g.message ? `<h4>Key message</h4><p class="bf-message">${TK.esc(g.message)}</p>` : ""}
        ${g.plan ? `<h4>Marketing mix</h4><div class="tk-table-wrap"><table class="tk-table"><tbody>${PS.map((p) => `<tr><th>${p.label}</th><td>${TK.esc(((g.plan.answers || {})[p.id] || [])[0] || "")}</td></tr>`).join("")}</tbody></table></div>` : ""}
        <h4>Channels and budget</h4><div class="tk-chart-box bf-budget"></div>
        <h4>Timeline</h4><div class="tk-chart-box bf-timeline"></div>
        <h4>KPIs</h4><ul class="tk-list">${state.kpis ? state.kpis.split(",").filter((k) => k.trim()).map((k) => `<li>${TK.esc(k.trim().charAt(0).toUpperCase() + k.trim().slice(1))}</li>`).join("") : "<li>Not set</li>"}</ul>
        <h4>Mandatories</h4><p>${TK.esc(state.mandatories || "None")}</p>`;
      drawBudget(g.shares);
      drawTimeline();
    }

    function drawBudget(shares) {
      const box = doc.querySelector(".bf-budget");
      if (!shares.length) { box.innerHTML = `<p class="tk-help">Give at least one channel a budget share.</p>`; return; }
      const W = 700, H = 30 + shares.length * 30, M = { l: 120, r: 150, t: 6, b: 10 };
      const svg = TK.svg(box, W, H, "Budget split by channel");
      const x = d3.scaleLinear().domain([0, d3.max(shares, (s) => s.share)]).range([M.l, W - M.r]);
      shares.forEach((s, i) => {
        const y = M.t + i * 30;
        svg.append("text").attr("x", M.l - 8).attr("y", y + 16).attr("text-anchor", "end").attr("font-size", 12).text(s.c);
        svg.append("rect").attr("x", M.l).attr("y", y + 3).attr("width", x(s.share) - M.l).attr("height", 20).attr("fill", TK.PALETTE[i % TK.PALETTE.length]);
        svg.append("text").attr("x", x(s.share) + 6).attr("y", y + 17).attr("font-size", 11).attr("fill", TK.MUTED).text(`${TK.fmtPct(s.share, 0)}, ${state.currency || ""} ${TK.fmtInt(s.amount)}`);
      });
    }

    // Three phases: launch (first quarter of the period), sustain, and a
    // closing push in the final 10%, a common default the brief states openly.
    function drawTimeline() {
      const box = doc.querySelector(".bf-timeline");
      const s = Date.parse(state.start), e = Date.parse(state.end);
      if (!(e > s)) { box.innerHTML = `<p class="tk-help">Set a start and an end date.</p>`; return; }
      const span = e - s, phases = [["Launch", 0, 0.25], ["Sustain", 0.25, 0.9], ["Closing push", 0.9, 1]];
      const W = 700, H = 120, M = { l: 120, r: 20, t: 10, b: 30 };
      const svg = TK.svg(box, W, H, "Campaign timeline by phase");
      const x = d3.scaleTime().domain([new Date(s), new Date(e)]).range([M.l, W - M.r]);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%d %b"))));
      phases.forEach(([name, a, b], i) => {
        const y = M.t + i * 26;
        svg.append("text").attr("x", M.l - 8).attr("y", y + 15).attr("text-anchor", "end").attr("font-size", 12).text(name);
        svg.append("rect").attr("x", x(new Date(s + a * span))).attr("y", y + 2).attr("width", x(new Date(s + b * span)) - x(new Date(s + a * span))).attr("height", 18).attr("fill", TK.PALETTE[i]);
      });
    }

    function asText() {
      const g = gather(), pd = g.persona;
      const out = [`# Campaign brief: ${state.name || "Untitled"}`, "", `${state.start} to ${state.end}. Budget ${state.currency} ${TK.fmtInt(TK.num(state.budget, 0))}. Owner: ${state.owner}.`, "",
        "## Objective", state.objective || "Not set", "", "## Target audience", `Segment: ${g.segment || "Not set"}`];
      if (pd) out.push(`Persona: ${pd["f-name"] || ""}, ${pd["f-role"] || ""}. ${pd["f-tagline"] || ""}`);
      else if (state.audience) out.push(`Audience: ${state.audience}`);
      out.push("", "## Positioning", g.positioning || "Not set");
      if (g.message) out.push("", "## Key message", g.message);
      if (g.plan) { out.push("", "## Marketing mix"); PS.forEach((p) => out.push(`- ${p.label}: ${((g.plan.answers || {})[p.id] || [])[0] || ""}`)); }
      out.push("", "## Channels and budget");
      g.shares.forEach((s) => out.push(`- ${s.c}: ${TK.fmtPct(s.share, 0)} (${state.currency} ${TK.fmtInt(s.amount)})`));
      out.push("", "## KPIs");
      (state.kpis || "").split(",").filter((k) => k.trim()).forEach((k) => out.push(`- ${k.trim()}`));
      out.push("", "## Mandatories", state.mandatories || "None");
      return out.join("\n");
    }

    function renderAll() {
      ["name", "budget", "currency", "start", "end", "owner", "objective", "kpis", "mandatories", "segment", "positioning", "message", "audience"].forEach((k) => (q(k).value = state[k] == null ? "" : state[k]));
      const g = gather();
      q("segment").placeholder = g.segment || "From STP Builder or the 7Ps Planner";
      q("positioning").placeholder = g.positioning || "From STP Builder or the 7Ps Planner";
      q("message").placeholder = g.message || "From the 7Ps Planner";
      state.channels = state.channels || {};
      if (!state.personaId && personas.length) state.personaId = personas[0].id;
      renderSources();
      renderChannels();
      renderDoc();
    }
    renderAll();
  }

  window.Planning = { sevenPs, brief };
})();
