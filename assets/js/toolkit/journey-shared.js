/*
 * assets/js/toolkit/journey-shared.js
 *
 * Definitions shared by Persona Builder (tools/persona-builder/) and the
 * Customer Journey Mapper (toolkit/customer-journey-mapper.qmd), so both
 * tools use one set of stage templates, one emotion scale, and one feeling
 * vocabulary. Also carries the persona handoff between the two tools: both
 * run on flairmi.com, so they share the browser's localStorage.
 *
 * Exposes window.FlairJourney.
 */
(function () {
  "use strict";

  const TEMPLATES = {
    resort: {
      label: "Resort journey, 6 stages",
      stages: [
        ["Inspiration", "Pre-decision"],
        ["Research", "Pre-decision"],
        ["Booking", "Decision"],
        ["Pre-arrival", "Decision"],
        ["On-site", "Post-experience"],
        ["Post-stay", "Post-experience"]
      ]
    },
    funnel: {
      label: "Marketing funnel, 3 stages",
      stages: [["Awareness", ""], ["Consideration", ""], ["Decision", ""]]
    },
    visit: {
      label: "Pre-visit, visit, post-visit",
      stages: [["Pre-visit", ""], ["Visit", ""], ["Post-visit", ""]]
    }
  };

  // What each emotion score means, read as expectation confirmation: a
  // guest compares what happens with what they expected. The feeling words
  // come from the feelings list in O'Rourke et al. (2026, CC BY 4.0, see
  // SOURCE), grouped here by FlairMI by how positive each word is.
  const EMOTION_SCALE = {
    "3": { label: "Delighted", text: "Expectations exceeded. The guest is likely to return and recommend.", words: ["happy", "proud", "joyful", "loved"] },
    "2": { label: "Pleased", text: "Expectations met with warmth. The guest feels valued.", words: ["pleased", "respected", "understood"] },
    "1": { label: "Reassured", text: "Expectations met. The guest feels confident in the choice.", words: ["sure"] },
    "0": { label: "Neutral", text: "The stage passes quietly and leaves a mild impression either way.", words: [] },
    "-1": { label: "Uneasy", text: "Doubt creeps in. The guest is unsure expectations will be met.", words: ["unsure"] },
    "-2": { label: "Worried", text: "Expectations at risk. The guest expects something to go wrong.", words: ["worried", "overwhelmed"] },
    "-3": { label: "Distressed", text: "Expectations broken. The guest is at risk of leaving or posting a negative review.", words: ["frustrated", "angry", "fearful", "ashamed"] }
  };

  // Attribution required by the article's CC BY 4.0 licence.
  const SOURCE = {
    citation: "O'Rourke, V., Rodríguez-Santos, C., Diffley, S., Costa Feito, A. and Bayram Arlı, N. (2026), “Mapping the consumer journey in the hotel industry: guest segmentation and experience evolution”, Consumer Behavior in Tourism and Hospitality, Vol. 21 No. 3, pp. 382-401.",
    doi: "https://doi.org/10.1108/CBTH-04-2025-0089",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "Adapted by FlairMI: the 3 delight segments are written as personas, the reported feelings are converted to emotion scores, and the study's 3 stages are spread across a 6-stage journey. Goals, touchpoints, pre-arrival entries, the blueprint, and the pain-point gap tags are illustrative assumptions. Hollow points mark assumptions."
  };

  // Persona Builder writes a persona id here and opens the Journey Mapper,
  // which imports that persona on load and clears the key.
  const HANDOFF_KEY = "flairmi-journey-handoff";
  const PB_PREFIX = "persona-builder:";

  function emotion(v) {
    return v == null || v === "" ? null : EMOTION_SCALE[String(v)] || null;
  }
  function fmt(n) {
    return n > 0 ? "+" + n : String(n);
  }
  function stageKey(label) {
    return String(label || "").trim().toLowerCase();
  }

  // The persona format both tools read and write as JSON.
  function toJourneyPersona(pb) {
    const j = pb.journey || {};
    return {
      format: "flairmi-persona",
      version: 1,
      name: pb["f-name"] || "Unnamed persona",
      role: pb["f-role"] || "",
      segment: j.segment || "",
      share: j.share || "",
      delight: j.delight || "",
      moveTo: j.moveTo || "",
      moveWhy: j.moveWhy || "",
      evidence: j.evidence || "",
      template: j.template || "",
      stages: (j.stages || []).map((s) => ({
        label: s.label, touchpoint: s.touchpoint || "", goal: s.goal || "",
        emotion: s.emotion == null || s.emotion === "" ? null : Number(s.emotion),
        feeling: s.feeling || "", factor: s.factor || "", basis: s.basis || "", source: s.source || ""
      }))
    };
  }

  function savedPersonas() {
    try {
      const index = JSON.parse(localStorage.getItem(PB_PREFIX + "index") || "[]");
      return index.map((item) => {
        const raw = localStorage.getItem(PB_PREFIX + item.id);
        return raw ? { id: item.id, name: item.name, data: JSON.parse(raw) } : null;
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function takeHandoff() {
    try {
      const raw = localStorage.getItem(HANDOFF_KEY);
      if (!raw) return null;
      localStorage.removeItem(HANDOFF_KEY);
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function sendHandoff(persona) {
    try {
      localStorage.setItem(HANDOFF_KEY, JSON.stringify(persona));
      return true;
    } catch (e) {
      return false;
    }
  }

  window.FlairJourney = {
    TEMPLATES, EMOTION_SCALE, SOURCE, emotion, fmt, stageKey,
    toJourneyPersona, savedPersonas, takeHandoff, sendHandoff
  };
})();
