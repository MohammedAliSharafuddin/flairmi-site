/*
 * assets/js/toolkit/journey-mapper.js
 *
 * Customer Journey Mapper for the Marketing Toolkit Hub. See
 * plans/FlairMI_Marketing_Toolkit_Hub_Master_Plan.md and
 * portfolio-planner/decisions.md 2026-09-29.
 *
 * Personas are goal-states, recorded stage by stage: each persona carries
 * its own touchpoint, goal, emotion score (-3 to +3), feeling word,
 * trigger, and segment at every stage, and the segment can change between
 * stages. Every persona is drawn on one shared set of stages, so the chart
 * shows how two guests experience the same journey differently.
 *
 * Below the emotion curves sits a service blueprint (physical evidence,
 * customer actions, frontstage, backstage, support, separated by the lines
 * of interaction, visibility, and internal interaction), with each
 * backstage and support item tagged to the silo that owns it. Pain points
 * are tagged to a service-quality gap (1 to 4) and can be flagged as a
 * moment of truth.
 *
 * Editors sit above a read-only map. The map is what gets projected,
 * exported as PNG or PDF, or saved as JSON. State autosaves to this
 * browser's localStorage and never leaves the device.
 *
 * Usage: window.JourneyMapper.mount({ rootId, preset: "resort" }).
 */
(function () {
  "use strict";

  const STORAGE_KEY = "flairmi-journey-mapper-v3";
  const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
  const MAX_PERSONAS = 4;
  const SILOS = ["", "Operations", "HR", "Compliance", "Finance", "Marketing", "IT", "Other"];
  const GAPS = {
    "": "No gap tagged",
    "1": "Gap 1, listening",
    "2": "Gap 2, service design and standards",
    "3": "Gap 3, service performance",
    "4": "Gap 4, communication"
  };

  // Stage templates, the emotion scale, and the feeling vocabulary live in
  // journey-shared.js so Persona Builder uses the same definitions.
  const FJ = window.FlairJourney;
  const TEMPLATES = FJ ? FJ.TEMPLATES : {};
  function emotionOf(v) {
    return FJ ? FJ.emotion(v) : null;
  }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 9);
  }
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }
  function stagesFromTemplate(key) {
    return TEMPLATES[key].stages.map(([label, phase]) => ({ id: uid("s"), label, phase }));
  }
  function emptyState() {
    return {
      title: "",
      template: "resort",
      stages: stagesFromTemplate("resort"),
      personas: [],
      blueprint: {},
      pains: []
    };
  }

  // The classroom case: a luxury hotel journey with 1 persona per delight
  // segment from O'Rourke et al. (2026). Feelings and deciding factors come
  // from the article's Tables 2 to 4 and section 6.2, with adjusted
  // residuals (AR) quoted where the article reports them.
  function resortPreset() {
    const s = stagesFromTemplate("resort");
    const id = s.map((x) => x.id);
    const pA = uid("p"), pB = uid("p"), pC = uid("p");
    function cells(rows) {
      const out = {};
      rows.forEach((r, i) => {
        out[id[i]] = { touchpoint: r[0], goal: r[1], emotion: r[2], feeling: r[3], segment: r[4], trigger: r[5], factor: r[6], basis: r[7], source: r[8] };
      });
      return out;
    }
    const bp = {};
    [
      ["Social media, friends' photos", "Hears about the hotel", "Social posts, travel press", "Content team schedules posts", "Marketing", "Content calendar, image library", "Marketing"],
      ["Hotel website, search engine, reviews", "Compares hotels and reads reviews", "Website, reviews, chat widget", "Reservations answer chat queries", "Operations", "Review monitoring, rate parity checks", "Marketing"],
      ["Booking engine, travel agent", "Chooses a room and pays", "Booking engine, confirmation email", "Revenue team sets rates and fees", "Finance", "Payment gateway, cancellation policy", "Compliance"],
      ["Pre-arrival email", "Confirms dates and requests", "Pre-arrival email, concierge", "Guest relations records preferences", "Operations", "CRM guest profile", "IT"],
      ["Lobby, room, restaurant", "Checks in, stays, dines", "Front desk, restaurant and breakfast staff", "Housekeeping and kitchen act on preferences", "Operations", "Rostering, training, empowerment budget", "HR"],
      ["Email, review sites, social media", "Reviews the stay, shares photos", "Thank-you email, loyalty offer", "Guest relations reads feedback", "Marketing", "CRM segmentation, survey platform", "IT"]
    ].forEach((r, i) => {
      bp[id[i]] = { evidence: r[0], customer: r[1], frontstage: r[2], backstage: r[3], backSilo: r[4], support: r[5], supportSilo: r[6] };
    });
    const DS = "Dissatisfied seeker", CC = "Content but cautious", DA = "Delighted advocate";
    return {
      title: "Luxury hotel guest journey by delight segment",
      template: "resort",
      source: FJ.SOURCE,
      stages: s,
      personas: [
        {
          id: pA, name: "Markus, the Price-Focused Seeker", color: PALETTE[2],
          cells: cells([
            ["Hotel reputation, prior knowledge", "Find a hotel with a known name", -1, "unsure", DS, "", "Hotel reputation (AR 3.7), prior knowledge of the hotel (AR 2.9)", "data", "Table 2"],
            ["Online search, reviews", "Avoid a bad choice", -2, "worried", DS, "", "Hotel reputation", "data", "Table 2, feelings unsure and worried"],
            ["Booking engine", "Get the best price", -2, "worried", DS, "Price decides the booking", "Price (AR 2.4)", "data", "Table 3"],
            ["Pre-arrival email", "Confirm nothing costs extra", -1, "unsure", DS, "", "Price", "assumption", "Not measured in the study"],
            ["Room, restaurant, breakfast", "Get a good room in a good location", -2, "worried", DS, "Restaurant and breakfast fall short", "Room size (AR 3.3), location (AR 2.7), price (AR 2.6)", "data", "Table 4"],
            ["Review sites", "Judge whether the price was worth it", -2, "worried", DS, "", "Satisfaction 1.53 of 5", "data", "Section 4.3"]
          ])
        },
        {
          id: pB, name: "Claire, the Cautious Planner", color: PALETTE[0],
          cells: cells([
            ["Hotel website", "Find a hotel that feels reliable", 1, "", CC, "", "", "assumption", "No stage-specific finding"],
            ["Hotel website", "Get reassurance before choosing", 2, "respected", CC, "Clear, complete website information", "Hotel website (AR 2.0)", "data", "Table 2"],
            ["Booking engine", "Book with confidence", 1, "sure", CC, "", "", "data", "Table 3"],
            ["Pre-arrival email", "Know what to expect on arrival", 1, "sure", CC, "Clear pre-arrival communication", "", "assumption", "Recommended in section 6.2, not measured"],
            ["Front desk, restaurant", "Receive consistent, prompt service", 1, "sure", CC, "Any service deviation is felt", "Service consistency and speed", "data", "Section 3.2, Table 4"],
            ["Loyalty email", "Feel the choice was right", 2, "pleased", DA, "Personalised loyalty offer", "Satisfaction 4.30 of 5", "assumption", "Conversion path suggested in section 6, not observed"]
          ])
        },
        {
          id: pC, name: "Isabella, the Status-Seeking Advocate", color: PALETTE[1],
          cells: cells([
            ["Friends and family, previous stay", "Return to somewhere proven", 3, "happy", DA, "Recommendation from friends and family", "Previous experience (AR 5.4), recommendation (AR 3.0)", "data", "Table 2"],
            ["Little online search", "Confirm the choice quickly", 2, "pleased", DA, "", "Uses search engines (AR -2.5) and hotel website (AR -2.8) less", "data", "Table 2, section 5"],
            ["Booking engine, agent", "Book a hotel with local character", 3, "proud", DA, "", "Local character (AR 2.7), price matters less (AR -3.6)", "data", "Table 3"],
            ["Concierge email", "Have preferences known before arrival", 2, "pleased", DA, "Personalised welcome planned", "", "assumption", "Recommended in section 6.2, not measured"],
            ["Room, lobby, restaurant", "Be treated as special", 3, "happy", DA, "Originality, prestige, exclusive atmosphere", "Originality (AR 2.9), prestige (AR 2.8), exclusive atmosphere (AR 2.3)", "data", "Table 4"],
            ["Social media, referrals", "Share the stay", 2, "pleased", DA, "", "Satisfaction 4.45 of 5", "data", "Section 4.3"]
          ])
        }
      ],
      blueprint: bp,
      pains: [
        { id: uid("x"), stageId: id[2], personaId: pA, text: "Price decides the booking and uncertainty stays high", gap: "4", silo: "Finance", mot: true },
        { id: uid("x"), stageId: id[4], personaId: pA, text: "Restaurant and breakfast rated negatively (AR 6.9 and 3.5)", gap: "3", silo: "Operations", mot: true },
        { id: uid("x"), stageId: id[4], personaId: pA, text: "Other guests' atmosphere rated negatively (AR 6.3)", gap: "2", silo: "Operations", mot: false },
        { id: uid("x"), stageId: id[4], personaId: pB, text: "Inconsistent or slow service", gap: "3", silo: "HR", mot: true },
        { id: uid("x"), stageId: id[5], personaId: pC, text: "International atmosphere rated negatively (AR 2.5)", gap: "1", silo: "Marketing", mot: false },
        { id: uid("x"), stageId: id[5], personaId: pA, text: "No follow-up that acknowledges feedback", gap: "1", silo: "IT", mot: false }
      ]
    };
  }

  function mount(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !FJ) return;

    let state = load() || (config.preset === "resort" ? resortPreset() : emptyState());
    let tab = "personas";
    let activePersona = state.personas.length ? state.personas[0].id : null;

    function load() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return valid(parsed) ? parsed : null;
      } catch (e) {
        return null;
      }
    }
    function save() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        /* storage blocked, the tool still works for this session */
      }
    }
    function valid(s) {
      return s && Array.isArray(s.stages) && Array.isArray(s.personas) && Array.isArray(s.pains) && typeof s.blueprint === "object";
    }
    function changed() {
      save();
      renderMap();
    }
    function cell(persona, stageId) {
      if (!persona.cells[stageId]) persona.cells[stageId] = { touchpoint: "", goal: "", emotion: null, feeling: "", segment: "", trigger: "", factor: "", basis: "", source: "" };
      return persona.cells[stageId];
    }
    function bpCell(stageId) {
      if (!state.blueprint[stageId]) state.blueprint[stageId] = { evidence: "", customer: "", frontstage: "", backstage: "", backSilo: "", support: "", supportSilo: "" };
      return state.blueprint[stageId];
    }
    function personaById(id) {
      return state.personas.find((p) => p.id === id);
    }
    function stageById(id) {
      return state.stages.find((s) => s.id === id);
    }
    function siloSelect(name, value) {
      return `<select data-f="${name}">${SILOS.map((s) => `<option value="${s}"${s === value ? " selected" : ""}>${s || "Owning silo"}</option>`).join("")}</select>`;
    }

    root.innerHTML = `
      <div class="jm-toolbar">
        <label class="jm-title-field">Map title
          <input type="text" id="${config.rootId}-title" placeholder="e.g. Resort guest journey">
        </label>
        <div class="jm-actions">
          <button type="button" class="toolkit-btn secondary" data-act="preset">Load classroom case</button>
          <button type="button" class="toolkit-btn secondary" data-act="clear">Start blank</button>
          <button type="button" class="toolkit-btn secondary" data-act="import">Open JSON</button>
          <input type="file" accept="application/json,.json" hidden id="${config.rootId}-file">
        </div>
      </div>
      <nav class="toolkit-stage-nav" aria-label="Journey Mapper sections">
        <button type="button" data-tab="stages">1. Stages</button>
        <button type="button" data-tab="personas">2. Personas</button>
        <button type="button" data-tab="blueprint">3. Blueprint</button>
        <button type="button" data-tab="pains">4. Pain points</button>
      </nav>
      <div class="jm-editor" id="${config.rootId}-editor"></div>
      <div class="jm-map" id="${config.rootId}-map"></div>
      <div class="jm-export-row">
        <button type="button" class="toolkit-btn" data-act="png">Export PNG</button>
        <button type="button" class="toolkit-btn" data-act="pdf">Export PDF</button>
        <button type="button" class="toolkit-btn secondary" data-act="json">Save JSON</button>
        <span class="jm-status" id="${config.rootId}-status" role="status"></span>
      </div>
    `;

    const titleEl = document.getElementById(config.rootId + "-title");
    const editorEl = document.getElementById(config.rootId + "-editor");
    const mapEl = document.getElementById(config.rootId + "-map");
    const fileEl = document.getElementById(config.rootId + "-file");
    const statusEl = document.getElementById(config.rootId + "-status");

    titleEl.addEventListener("input", () => {
      state.title = titleEl.value;
      changed();
    });

    root.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        renderEditor();
      })
    );

    root.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]");
      if (!act || !root.contains(act)) return;
      const a = act.dataset.act;
      if (a === "preset") {
        if (!confirmReplace()) return;
        state = resortPreset();
        activePersona = state.personas[0].id;
        refreshAll();
      } else if (a === "clear") {
        if (!confirmReplace()) return;
        state = emptyState();
        activePersona = null;
        refreshAll();
      } else if (a === "import") {
        fileEl.click();
      } else if (a === "json") {
        download(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), fileName("json"));
      } else if (a === "png" || a === "pdf") {
        exportImage(a);
      }
    });

    fileEl.addEventListener("change", () => {
      const f = fileEl.files[0];
      if (!f) return;
      f.text().then((txt) => {
        try {
          const parsed = JSON.parse(txt);
          if (parsed && parsed.format === "flairmi-persona") {
            importPersona(parsed);
            fileEl.value = "";
            return;
          }
          if (!valid(parsed)) throw new Error("bad");
          state = parsed;
          activePersona = state.personas.length ? state.personas[0].id : null;
          refreshAll();
          setStatus("Map opened.");
        } catch (err) {
          setStatus("That file is not a Journey Mapper JSON file.");
        }
        fileEl.value = "";
      });
    });

    function confirmReplace() {
      const hasWork = state.personas.length || state.pains.length;
      return !hasWork || window.confirm("Replace the current map? Save it as JSON first if you want to keep it.");
    }
    function setStatus(msg) {
      statusEl.textContent = msg;
      if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 4000);
    }
    function refreshAll() {
      save();
      titleEl.value = state.title || "";
      renderEditor();
      renderMap();
    }

    // ---- editors ----
    function renderEditor() {
      root.querySelectorAll("[data-tab]").forEach((b) => {
        if (b.dataset.tab === tab) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
      if (tab === "stages") editStages();
      else if (tab === "personas") editPersonas();
      else if (tab === "blueprint") editBlueprint();
      else editPains();
    }

    function editStages() {
      editorEl.innerHTML = `
        <p class="jm-help">Pick a starting template, then rename, regroup, or add stages. The phase groups neighbouring stages into a band above the chart.</p>
        <label>Template
          <select id="jm-template">${Object.keys(TEMPLATES).map((k) => `<option value="${k}"${state.template === k ? " selected" : ""}>${esc(TEMPLATES[k].label)}</option>`).join("")}</select>
        </label>
        <div class="jm-stage-list">
          ${state.stages.map((s, i) => `
            <div class="jm-stage-row" data-id="${s.id}">
              <span class="jm-stage-num">${i + 1}</span>
              <input type="text" data-f="label" value="${esc(s.label)}" aria-label="Stage ${i + 1} name">
              <input type="text" data-f="phase" value="${esc(s.phase)}" placeholder="Phase (optional)" aria-label="Stage ${i + 1} phase">
              <button type="button" class="scored-item-remove" data-rm="${s.id}" aria-label="Remove stage ${esc(s.label)}"${state.stages.length <= 2 ? " disabled" : ""}>&times;</button>
            </div>`).join("")}
        </div>
        <button type="button" class="toolkit-btn secondary" id="jm-add-stage"${state.stages.length >= 8 ? " disabled" : ""}>Add stage</button>
      `;
      editorEl.querySelector("#jm-template").addEventListener("change", (e) => {
        if (!window.confirm("Switch template? Stage entries for the current stages will be cleared.")) {
          e.target.value = state.template;
          return;
        }
        state.template = e.target.value;
        state.stages = stagesFromTemplate(state.template);
        state.blueprint = {};
        state.pains = [];
        state.personas.forEach((p) => (p.cells = {}));
        refreshAll();
      });
      editorEl.querySelectorAll(".jm-stage-row input").forEach((inp) =>
        inp.addEventListener("input", () => {
          stageById(inp.closest(".jm-stage-row").dataset.id)[inp.dataset.f] = inp.value;
          changed();
        })
      );
      editorEl.querySelectorAll("[data-rm]").forEach((b) =>
        b.addEventListener("click", () => {
          const sid = b.dataset.rm;
          state.stages = state.stages.filter((s) => s.id !== sid);
          delete state.blueprint[sid];
          state.pains = state.pains.filter((p) => p.stageId !== sid);
          state.personas.forEach((p) => delete p.cells[sid]);
          refreshAll();
        })
      );
      editorEl.querySelector("#jm-add-stage").addEventListener("click", () => {
        const last = state.stages[state.stages.length - 1];
        state.stages.push({ id: uid("s"), label: "New stage", phase: last ? last.phase : "" });
        refreshAll();
      });
    }

    function editPersonas() {
      const p = personaById(activePersona);
      const segments = Array.from(new Set(state.personas.flatMap((x) => Object.values(x.cells).map((c) => c.segment)).filter(Boolean)));
      editorEl.innerHTML = `
        <p class="jm-help">A persona here is a goal-state, recorded stage by stage. Give each stage its own goal and feeling, and change the segment where the guest moves from one group to another.</p>
        <div class="jm-persona-tabs">
          ${state.personas.map((x) => `<button type="button" class="jm-persona-tab" data-pid="${x.id}"${x.id === activePersona ? ' aria-current="true"' : ""}><span class="swatch" style="background:${x.color}"></span>${esc(x.name || "Unnamed persona")}</button>`).join("")}
          <button type="button" class="toolkit-btn secondary" id="jm-add-persona"${state.personas.length >= MAX_PERSONAS ? " disabled" : ""}>Add persona</button>
          ${pbOptions()}
        </div>
        ${p ? `
          <div class="jm-persona-head">
            <label>Persona name <input type="text" id="jm-pname" value="${esc(p.name)}"></label>
            <button type="button" class="toolkit-btn secondary" id="jm-rm-persona">Remove persona</button>
          </div>
          <datalist id="jm-segments">${segments.map((s) => `<option value="${esc(s)}">`).join("")}</datalist>
          <div class="jm-cards">
            ${state.stages.map((s) => {
              const c = cell(p, s.id);
              const em = c.emotion == null || c.emotion === "" ? 0 : c.emotion;
              return `
              <div class="jm-card" data-sid="${s.id}" style="border-top-color:${p.color}">
                <h4>${esc(s.label)}</h4>
                <label>Touchpoint <input type="text" data-f="touchpoint" value="${esc(c.touchpoint)}"></label>
                <label>Goal at this stage <input type="text" data-f="goal" value="${esc(c.goal)}"></label>
                <label>Emotion <output>${c.emotion == null ? "not set" : fmt(c.emotion) + " " + emotionOf(c.emotion).label}</output>
                  <input type="range" min="-3" max="3" step="1" data-f="emotion" value="${em}">
                </label>
                <div class="jm-emotion-note">${emotionNote(c.emotion)}</div>
                <label>Feeling word <input type="text" data-f="feeling" value="${esc(c.feeling)}" placeholder="e.g. worried"></label>
                <label>Segment here <input type="text" data-f="segment" list="jm-segments" value="${esc(c.segment)}"></label>
                <label>Trigger or modulator <input type="text" data-f="trigger" value="${esc(c.trigger)}" placeholder="What shaped the feeling"></label>
                <label>Deciding factor <input type="text" data-f="factor" value="${esc(c.factor || "")}" placeholder="e.g. price, location, reputation"></label>
                <label>Basis <select data-f="basis">
                  <option value=""${!c.basis ? " selected" : ""}>Not stated</option>
                  <option value="data"${c.basis === "data" ? " selected" : ""}>From data</option>
                  <option value="assumption"${c.basis === "assumption" ? " selected" : ""}>Assumption</option>
                </select></label>
                <label>Source <input type="text" data-f="source" value="${esc(c.source || "")}" placeholder="e.g. guest survey, Table 2"></label>
              </div>`;
            }).join("")}
          </div>` : `<p class="scored-item-empty">Add a persona to start, or load the classroom case.</p>`}
      `;
      editorEl.querySelectorAll("[data-pid]").forEach((b) =>
        b.addEventListener("click", () => {
          activePersona = b.dataset.pid;
          renderEditor();
        })
      );
      const pbSel = editorEl.querySelector("#jm-from-pb");
      if (pbSel) pbSel.addEventListener("change", () => {
        const found = FJ.savedPersonas().find((x) => x.id === pbSel.value);
        if (found) importPersona(FJ.toJourneyPersona(found.data));
      });
      editorEl.querySelector("#jm-add-persona").addEventListener("click", () => {
        const used = state.personas.map((x) => x.color);
        const color = PALETTE.find((c) => !used.includes(c)) || PALETTE[0];
        const np = { id: uid("p"), name: "Persona " + (state.personas.length + 1), color, cells: {} };
        state.personas.push(np);
        activePersona = np.id;
        refreshAll();
      });
      if (!p) return;
      editorEl.querySelector("#jm-pname").addEventListener("input", (e) => {
        p.name = e.target.value;
        editorEl.querySelector(`[data-pid="${p.id}"]`).lastChild.textContent = p.name || "Unnamed persona";
        changed();
      });
      editorEl.querySelector("#jm-rm-persona").addEventListener("click", () => {
        if (!window.confirm("Remove " + (p.name || "this persona") + "?")) return;
        state.personas = state.personas.filter((x) => x.id !== p.id);
        state.pains.forEach((x) => { if (x.personaId === p.id) x.personaId = ""; });
        activePersona = state.personas.length ? state.personas[0].id : null;
        refreshAll();
      });
      editorEl.querySelectorAll(".jm-card input, .jm-card select").forEach((inp) =>
        inp.addEventListener("input", () => {
          const c = cell(p, inp.closest(".jm-card").dataset.sid);
          if (inp.dataset.f === "emotion") {
            c.emotion = Number(inp.value);
            inp.previousElementSibling.textContent = fmt(c.emotion) + " " + emotionOf(c.emotion).label;
            inp.closest(".jm-card").querySelector(".jm-emotion-note").innerHTML = emotionNote(c.emotion);
          } else {
            c[inp.dataset.f] = inp.value;
          }
          changed();
        })
      );
    }

    function editBlueprint() {
      editorEl.innerHTML = `
        <p class="jm-help">Work down each stage from what the guest sees to what supports it. Tag backstage and support work to the silo that owns it.</p>
        <div class="jm-cards">
          ${state.stages.map((s) => {
            const b = bpCell(s.id);
            return `
            <div class="jm-card" data-sid="${s.id}">
              <h4>${esc(s.label)}</h4>
              <label>Physical evidence <input type="text" data-f="evidence" value="${esc(b.evidence)}"></label>
              <label>Customer actions <input type="text" data-f="customer" value="${esc(b.customer)}"></label>
              <label>Frontstage contact <input type="text" data-f="frontstage" value="${esc(b.frontstage)}"></label>
              <label>Backstage contact <input type="text" data-f="backstage" value="${esc(b.backstage)}"></label>
              ${siloSelect("backSilo", b.backSilo)}
              <label>Support processes <input type="text" data-f="support" value="${esc(b.support)}"></label>
              ${siloSelect("supportSilo", b.supportSilo)}
            </div>`;
          }).join("")}
        </div>
      `;
      editorEl.querySelectorAll(".jm-card [data-f]").forEach((inp) =>
        inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", () => {
          bpCell(inp.closest(".jm-card").dataset.sid)[inp.dataset.f] = inp.value;
          changed();
        })
      );
    }

    function editPains() {
      editorEl.innerHTML = `
        <p class="jm-help">Record where the journey breaks. Tag the service-quality gap behind it and the silo that owns the fix. A moment of truth is an encounter where the guest's view of the resort is formed.</p>
        <div class="jm-pain-form">
          <label>Stage <select id="jm-pain-stage">${state.stages.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</select></label>
          <label>Persona <select id="jm-pain-persona"><option value="">All personas</option>${state.personas.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label>
          <label class="jm-pain-text">Pain point <input type="text" id="jm-pain-text" placeholder="e.g. Resort fee added at the final payment step"></label>
          <label>Gap <select id="jm-pain-gap">${Object.keys(GAPS).map((k) => `<option value="${k}">${GAPS[k]}</option>`).join("")}</select></label>
          <label>Owner ${siloSelect("silo", "").replace("<select", '<select id="jm-pain-silo"')}</label>
          <label class="jm-check"><input type="checkbox" id="jm-pain-mot"> Moment of truth</label>
          <button type="button" class="toolkit-btn" id="jm-pain-add">Add pain point</button>
        </div>
        <ul class="scored-item-list">
          ${state.pains.length ? state.pains.map((x) => `
            <li class="scored-item">
              <span class="scored-item-text">${x.mot ? "<strong>Moment of truth.</strong> " : ""}${esc(x.text)}
                <span class="scored-priorities-meta">${esc((stageById(x.stageId) || {}).label || "")}${x.personaId && personaById(x.personaId) ? ", " + esc(personaById(x.personaId).name) : ""}${x.silo ? ", " + esc(x.silo) : ""}</span></span>
              ${x.gap ? `<span class="scored-item-score">Gap ${x.gap}</span>` : ""}
              <button type="button" class="scored-item-remove" data-rmpain="${x.id}" aria-label="Remove pain point">&times;</button>
            </li>`).join("") : `<li class="scored-item-empty">No pain points yet.</li>`}
        </ul>
      `;
      const textEl = editorEl.querySelector("#jm-pain-text");
      function add() {
        const text = textEl.value.trim();
        if (!text) { textEl.focus(); return; }
        state.pains.push({
          id: uid("x"),
          stageId: editorEl.querySelector("#jm-pain-stage").value,
          personaId: editorEl.querySelector("#jm-pain-persona").value,
          text,
          gap: editorEl.querySelector("#jm-pain-gap").value,
          silo: editorEl.querySelector("#jm-pain-silo").value,
          mot: editorEl.querySelector("#jm-pain-mot").checked
        });
        refreshAll();
        editorEl.querySelector("#jm-pain-text").focus();
      }
      editorEl.querySelector("#jm-pain-add").addEventListener("click", add);
      textEl.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
      editorEl.querySelectorAll("[data-rmpain]").forEach((b) =>
        b.addEventListener("click", () => {
          state.pains = state.pains.filter((x) => x.id !== b.dataset.rmpain);
          refreshAll();
        })
      );
    }

    function emotionNote(v) {
      if (v == null || v === "") return `<p>Move the slider to score how this stage feels.</p>`;
      const e = emotionOf(v);
      const chips = e.words.map((w) => `<button type="button" class="jm-word" data-word="${w}">${w}</button>`).join("");
      return `<p>${esc(e.text)}</p>${chips ? `<div class="jm-words" aria-label="Suggested feeling words">${chips}</div>` : ""}`;
    }

    // Clicking a suggested word fills the stage's feeling field.
    editorEl.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-word]");
      if (!chip) return;
      const card = chip.closest(".jm-card");
      const p = personaById(activePersona);
      if (!card || !p) return;
      const feel = card.querySelector('[data-f="feeling"]');
      feel.value = chip.dataset.word;
      cell(p, card.dataset.sid).feeling = chip.dataset.word;
      changed();
    });

    function fmt(n) {
      return n > 0 ? "+" + n : String(n);
    }

    // ---- read-only map ----
    function renderMap() {
      const hasPersonas = state.personas.length > 0;
      mapEl.innerHTML = `
        <div class="jm-map-inner" id="${config.rootId}-export">
          <h3 class="jm-map-title">${esc(state.title || "Customer journey map")}</h3>
          <div class="toolkit-legend">
            ${state.personas.map((p) => `<span><span class="swatch" style="background:${p.color}"></span>${esc(p.name)}</span>`).join("")}
            ${hasPersonas ? `<span class="jm-legend-note">Ring: segment changes here</span><span class="jm-legend-note">Hollow point: assumption</span><span class="jm-legend-note"><span class="jm-pain-key">&#9650;</span> pain point, <span class="jm-pain-key">&#9670;</span> moment of truth</span>` : ""}
          </div>
          <svg class="jm-chart" viewBox="0 0 760 340" role="img" aria-label="Emotion score for each persona across the journey stages"></svg>
          <h4>Service blueprint</h4>
          <div class="jm-table-wrap">${blueprintTable()}</div>
          <div class="jm-summary">
            <div>
              <h4>Gaps to carry into a SERVQUAL review</h4>
              ${gapSummary()}
            </div>
            <div>
              <h4>Silo accountability</h4>
              ${siloSummary()}
            </div>
          </div>
          ${sourceNote()}
        </div>
      `;
      drawChart(d3.select(mapEl).select("svg.jm-chart"));
    }

    function sourceNote() {
      const src = state.source;
      if (!src || !src.citation) return "";
      return `<p class="jm-source"><strong>Source.</strong> Personas adapted from ${esc(src.citation)} <a href="${esc(src.doi)}">${esc(src.doi)}</a>. Licensed under <a href="${esc(src.licenceUrl)}">${esc(src.licence)}</a>. ${esc(src.changes)}</p>`;
    }

    function blueprintTable() {
      const cols = state.stages;
      const row = (label, key, siloKey) => `
        <tr><th scope="row">${label}</th>${cols.map((s) => {
          const b = state.blueprint[s.id] || {};
          const silo = siloKey && b[siloKey] ? `<span class="jm-silo">${esc(b[siloKey])}</span>` : "";
          return `<td>${esc(b[key] || "")}${silo}</td>`;
        }).join("")}</tr>`;
      const line = (label) => `<tr class="jm-line"><td colspan="${cols.length + 1}">${label}</td></tr>`;
      const personaRows = state.personas.map((p) => `
        <tr><th scope="row"><span class="swatch" style="background:${p.color}"></span>${esc(p.name)}</th>${cols.map((s) => {
          const c = p.cells[s.id] || {};
          const bits = [c.goal && `<em>Goal:</em> ${esc(c.goal)}`, c.touchpoint && `<em>Via:</em> ${esc(c.touchpoint)}`, c.factor && `<em>Decides on:</em> ${esc(c.factor)}`, c.source && `<span class="jm-cell-source">${c.basis === "assumption" ? "Assumption" : "Source"}: ${esc(c.source)}</span>`].filter(Boolean);
          return `<td>${bits.join("<br>")}</td>`;
        }).join("")}</tr>`).join("");
      return `
        <table class="jm-table">
          <thead><tr><th></th>${cols.map((s) => `<th scope="col">${esc(s.label)}</th>`).join("")}</tr></thead>
          <tbody>
            ${personaRows}
            ${row("Physical evidence", "evidence")}
            ${row("Customer actions", "customer")}
            ${line("Line of interaction")}
            ${row("Frontstage contact", "frontstage")}
            ${line("Line of visibility")}
            ${row("Backstage contact", "backstage", "backSilo")}
            ${line("Line of internal interaction")}
            ${row("Support processes", "support", "supportSilo")}
          </tbody>
        </table>`;
    }

    function gapSummary() {
      const tagged = state.pains.filter((p) => p.gap);
      if (!tagged.length) return `<p class="scored-item-empty">Tag pain points to a gap in step 4.</p>`;
      return `<ul class="jm-gap-list">${["1", "2", "3", "4"].map((g) => {
        const ps = tagged.filter((p) => p.gap === g);
        if (!ps.length) return "";
        return `<li><strong>${GAPS[g]}</strong><ul>${ps.map((p) => `<li>${p.mot ? "&#9670; " : ""}${esc(p.text)} <span class="scored-priorities-meta">${esc((stageById(p.stageId) || {}).label || "")}</span></li>`).join("")}</ul></li>`;
      }).join("")}</ul>`;
    }

    function siloSummary() {
      const tally = {};
      state.stages.forEach((s) => {
        const b = state.blueprint[s.id] || {};
        [b.backSilo, b.supportSilo].forEach((x) => {
          if (x) (tally[x] = tally[x] || { work: 0, pains: 0 }).work += 1;
        });
      });
      state.pains.forEach((p) => {
        if (p.silo) (tally[p.silo] = tally[p.silo] || { work: 0, pains: 0 }).pains += 1;
      });
      const rows = Object.keys(tally).sort((a, b) => tally[b].pains - tally[a].pains || tally[b].work - tally[a].work);
      if (!rows.length) return `<p class="scored-item-empty">Tag blueprint items and pain points to a silo.</p>`;
      return `<table class="jm-silo-table"><thead><tr><th>Silo</th><th>Blueprint items</th><th>Pain points owned</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r)}</td><td>${tally[r].work}</td><td>${tally[r].pains}</td></tr>`).join("")}</tbody></table>`;
    }

    function drawChart(svg) {
      const W = 760, H = 340, M = { l: 48, r: 20, t: 44, b: 62 };
      const stages = state.stages;
      const x = d3.scalePoint().domain(stages.map((s) => s.id)).range([M.l, W - M.r]).padding(0.5);
      const step = x.step();
      const y = d3.scaleLinear().domain([-3, 3]).range([H - M.b, M.t]);

      // Phase bands: runs of neighbouring stages sharing a phase name.
      const bands = [];
      stages.forEach((s) => {
        const last = bands[bands.length - 1];
        if (s.phase && last && last.phase === s.phase) last.to = s.id;
        else if (s.phase) bands.push({ phase: s.phase, from: s.id, to: s.id });
      });
      const gb = svg.append("g");
      bands.forEach((b, i) => {
        const x0 = x(b.from) - step / 2, x1 = x(b.to) + step / 2;
        gb.append("rect").attr("x", x0 + 2).attr("y", 6).attr("width", x1 - x0 - 4).attr("height", 22)
          .attr("fill", i % 2 ? "#e9e9e9" : "#f2f2f2");
        gb.append("text").attr("x", (x0 + x1) / 2).attr("y", 21).attr("text-anchor", "middle")
          .attr("class", "jm-band-label").text(b.phase);
      });

      // Grid, zero line, axis.
      const gg = svg.append("g");
      d3.range(-3, 4).forEach((v) => {
        gg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(v)).attr("y2", y(v))
          .attr("stroke", v === 0 ? "#6b6b6b" : "#e5e5e5").attr("stroke-width", v === 0 ? 1.2 : 1);
        gg.append("text").attr("x", M.l - 8).attr("y", y(v) + 4).attr("text-anchor", "end")
          .attr("class", "jm-axis").text(fmt(v));
      });
      svg.append("text").attr("transform", `translate(12,${(M.t + H - M.b) / 2}) rotate(-90)`)
        .attr("text-anchor", "middle").attr("class", "jm-axis").text("Emotion");

      stages.forEach((s) => {
        svg.append("line").attr("x1", x(s.id)).attr("x2", x(s.id)).attr("y1", M.t).attr("y2", H - M.b)
          .attr("stroke", "#f0f0f0");
        svg.append("text").attr("x", x(s.id)).attr("y", H - M.b + 18).attr("text-anchor", "middle")
          .attr("class", "jm-stage-label").text(s.label);
        const ps = state.pains.filter((p) => p.stageId === s.id);
        const mots = ps.filter((p) => p.mot).length;
        if (ps.length) {
          const t = svg.append("text").attr("x", x(s.id)).attr("y", H - M.b + 38).attr("text-anchor", "middle")
            .attr("class", "jm-pain-marker");
          t.append("tspan").text("▲ " + ps.length);
          if (mots) t.append("tspan").attr("dx", 8).text("◆ " + mots);
          t.append("title").text(ps.map((p) => p.text).join("\n"));
        }
      });

      if (!state.personas.length) {
        svg.append("text").attr("x", W / 2).attr("y", y(0) - 10).attr("text-anchor", "middle")
          .attr("class", "jm-axis").text("Add a persona to draw its emotion curve");
        return;
      }

      const line = d3.line().defined((d) => d.v != null).x((d) => x(d.id)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
      state.personas.forEach((p, pi) => {
        const pts = stages.map((s) => {
          const c = p.cells[s.id] || {};
          return { id: s.id, v: c.emotion == null || c.emotion === "" ? null : Number(c.emotion), c, s };
        });
        const g = svg.append("g");
        g.append("path").datum(pts).attr("d", line).attr("fill", "none").attr("stroke", p.color).attr("stroke-width", 2.5);
        let prevSeg = null;
        pts.forEach((d) => {
          if (d.v == null) return;
          const cx = x(d.id), cy = y(d.v);
          const seg = d.c.segment || "";
          const switched = prevSeg !== null && seg && seg !== prevSeg;
          if (seg) prevSeg = seg;
          if (switched) {
            g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 10).attr("fill", "none")
              .attr("stroke", p.color).attr("stroke-width", 2);
            g.append("text").attr("x", cx).attr("y", cy + (pi % 2 ? 26 : -16)).attr("text-anchor", "middle")
              .attr("class", "jm-switch-label").attr("fill", p.color).text("→ " + seg);
          }
          const assumed = d.c.basis === "assumption";
          const dot = g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", assumed ? 4.5 : 5.5)
            .attr("fill", assumed ? "#ffffff" : p.color).attr("stroke", assumed ? p.color : "#ffffff").attr("stroke-width", assumed ? 2 : 1.5);
          dot.append("title").text(`${p.name}, ${d.s.label}: ${fmt(d.v)}, ${emotionOf(d.v) ? emotionOf(d.v).label : ""}${d.c.feeling ? " (" + d.c.feeling + ")" : ""}${d.c.goal ? "\nGoal: " + d.c.goal : ""}${d.c.trigger ? "\nTrigger: " + d.c.trigger : ""}${seg ? "\nSegment: " + seg : ""}${d.c.factor ? "\nDecides on: " + d.c.factor : ""}${d.c.source ? "\n" + (assumed ? "Assumption: " : "Source: ") + d.c.source : ""}`);
          if (d.c.feeling && !switched) {
            g.append("text").attr("x", cx + 9).attr("y", cy + (pi % 2 ? 15 : -8)).attr("class", "jm-feeling")
              .attr("fill", p.color).text(d.c.feeling);
          }
        });
      });
    }

    // ---- export ----
    function fileName(ext) {
      const base = (state.title || "customer-journey-map").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return (base || "customer-journey-map") + "." + ext;
    }
    function download(blob, name) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function exportImage(kind) {
      if (typeof html2canvas === "undefined" || (kind === "pdf" && !(window.jspdf && window.jspdf.jsPDF))) {
        setStatus("Export libraries did not load. Check the connection and reload.");
        return;
      }
      const target = document.getElementById(config.rootId + "-export");
      root.classList.add("jm-exporting");
      setStatus("Exporting");
      html2canvas(target, { scale: 2, backgroundColor: "#ffffff", windowWidth: Math.max(target.scrollWidth, 1100) })
        .then((canvas) => {
          if (kind === "png") {
            canvas.toBlob((b) => download(b, fileName("png")));
          } else {
            const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
            const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 24;
            const ratio = Math.min((pw - 2 * m) / canvas.width, (ph - 2 * m) / canvas.height);
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", m, m, canvas.width * ratio, canvas.height * ratio);
            pdf.save(fileName("pdf"));
          }
          setStatus("Exported.");
        })
        .catch(() => setStatus("Export failed."))
        .finally(() => root.classList.remove("jm-exporting"));
    }

    // ---- personas from Persona Builder ----
    function pbOptions() {
      const saved = FJ.savedPersonas().filter((x) => x.data.journey && (x.data.journey.stages || []).length);
      if (!saved.length || state.personas.length >= MAX_PERSONAS) return "";
      return `<select id="jm-from-pb" class="jm-from-pb" aria-label="Add a persona from Persona Builder">
        <option value="">Add from Persona Builder</option>
        ${saved.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}
      </select>`;
    }

    // Adds a flairmi-persona object to the map. Stages are matched by name.
    // An empty map takes the persona's stages as they are.
    function importPersona(jp) {
      if (state.personas.length >= MAX_PERSONAS) {
        setStatus("The map holds " + MAX_PERSONAS + " personas. Remove one first.");
        return;
      }
      const incoming = (jp.stages || []).filter((s) => s.label);
      if (!state.personas.length && !state.pains.length && incoming.length) {
        const tpl = TEMPLATES[jp.template];
        const phaseOf = (label) => {
          const hit = tpl && tpl.stages.find((x) => FJ.stageKey(x[0]) === FJ.stageKey(label));
          return hit ? hit[1] : "";
        };
        state.stages = incoming.map((s) => ({ id: uid("s"), label: s.label, phase: phaseOf(s.label) }));
        state.template = tpl ? jp.template : state.template;
        state.blueprint = {};
      }
      const used = state.personas.map((x) => x.color);
      const np = { id: uid("p"), name: jp.name || "Imported persona", color: PALETTE.find((c) => !used.includes(c)) || PALETTE[0], cells: {} };
      let matched = 0;
      incoming.forEach((s) => {
        const stage = state.stages.find((x) => FJ.stageKey(x.label) === FJ.stageKey(s.label));
        if (!stage) return;
        matched += 1;
        np.cells[stage.id] = {
          touchpoint: s.touchpoint || "", goal: s.goal || "",
          emotion: s.emotion == null || s.emotion === "" ? null : Number(s.emotion),
          feeling: s.feeling || "", segment: jp.segment || "", trigger: "",
          factor: s.factor || "", basis: s.basis || "", source: s.source || ""
        };
      });
      state.personas.push(np);
      activePersona = np.id;
      tab = "personas";
      refreshAll();
      const missed = incoming.length - matched;
      setStatus("Added " + np.name + "." + (missed ? " " + missed + " stage" + (missed > 1 ? "s" : "") + " had no match on this map." : ""));
    }

    refreshAll();
    const handoff = FJ.takeHandoff();
    if (handoff && handoff.format === "flairmi-persona") importPersona(handoff);
  }

  window.JourneyMapper = { mount };
})();
