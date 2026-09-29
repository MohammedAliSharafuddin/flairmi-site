/*
 * assets/js/toolkit/toolkit-tour.js
 *
 * Guided demos for the Marketing Toolkit Hub. Each tool gets a "Watch the
 * demo" button above it. The demo moves through the tool one part at a
 * time: it scrolls to the part, outlines it, explains it in a caption
 * pinned to the bottom of the screen (so it works on a phone), and where a
 * step says so, fills in fields and presses buttons itself, typing the way a
 * person would. It plays on its own, or step by step with Back and Next.
 *
 * Demo scripts live in tours.js, keyed by the id of the tool's mount
 * element. This file has no other dependency, so Persona Builder, which is
 * a standalone page, uses it too.
 *
 * Step format: { sel, title, text, do: [ops] }. Ops: ["click", sel],
 * ["type", sel, text], ["set", sel, value], ["select", sel, value],
 * ["check", sel, true|false], ["submit", sel], ["wait", ms], ["open", sel],
 * ["pick", sel, optionIndex].
 */
(function () {
  "use strict";

  const NAVBAR = 84;
  let active = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (sel) => (sel ? document.querySelector(sel) : null);

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }
  function setValue(el, v) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  }

  async function runOps(ops, token) {
    // Tools ask "replace the current work?" before loading samples. The demo
    // answers yes on the user's behalf, only while its own steps run.
    const realConfirm = window.confirm;
    window.confirm = () => true;
    try {
      for (const op of ops || []) {
        if (token.cancelled) return;
        const [kind, sel, val] = op;
        if (kind === "wait") { await sleep(sel); continue; }
        const el = $(sel);
        if (!el) continue;
        if (kind === "click") { el.click(); await sleep(350); }
        else if (kind === "submit") { (el.form || el).requestSubmit ? (el.form || el).requestSubmit() : el.click(); await sleep(350); }
        else if (kind === "open") { el.open = true; await sleep(250); }
        else if (kind === "check") { if (el.checked !== !!val) { el.checked = !!val; fire(el, "change"); fire(el, "input"); } await sleep(250); }
        else if (kind === "pick") { if (el.options[val]) { el.selectedIndex = val; fire(el, "input"); fire(el, "change"); } await sleep(300); }
        else if (kind === "select") { setValue(el, String(val)); fire(el, "input"); fire(el, "change"); await sleep(300); }
        else if (kind === "set") { setValue(el, String(val)); fire(el, "input"); fire(el, "change"); await sleep(300); }
        else if (kind === "type") {
          el.focus({ preventScroll: true });
          setValue(el, "");
          const text = String(val);
          const step = text.length > 60 ? 4 : 1;
          for (let i = step; i <= text.length + step - 1; i += step) {
            if (token.cancelled) return;
            setValue(el, text.slice(0, i));
            fire(el, "input");
            await sleep(28);
          }
          fire(el, "change");
          el.blur();
          await sleep(250);
        }
      }
    } finally {
      window.confirm = realConfirm;
    }
  }

  function focusOn(sel) {
    document.querySelectorAll(".tk-tour-focus").forEach((e) => e.classList.remove("tk-tour-focus"));
    const el = $(sel);
    if (!el) return;
    el.classList.add("tk-tour-focus");
    const card = document.querySelector(".tk-tour-card");
    const cardH = card ? card.offsetHeight : 160;
    const r = el.getBoundingClientRect();
    const room = window.innerHeight - NAVBAR - cardH - 24;
    const top = r.height <= room ? r.top + window.scrollY - NAVBAR - Math.max(12, (room - r.height) / 3) : r.top + window.scrollY - NAVBAR - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function readTime(step) {
    const words = (step.title + " " + step.text).split(/\s+/).length;
    return Math.max(4500, words * 330);
  }

  function start(tour) {
    stop();
    const token = { cancelled: false };
    const state = { i: 0, playing: true, done: new Set(), token, timer: null, busy: false };
    active = state;
    const card = document.createElement("div");
    card.className = "tk-tour-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-live", "polite");
    card.setAttribute("aria-label", "Tool demo");
    card.innerHTML = `
      <div class="tk-tour-top"><span class="tk-tour-count"></span><div class="tk-tour-progress"><span></span></div>
        <button type="button" class="tk-tour-x" data-t="close" aria-label="Close the demo">&times;</button></div>
      <h4 class="tk-tour-title"></h4>
      <p class="tk-tour-text"></p>
      <div class="tk-tour-actions">
        <button type="button" data-t="back">Back</button>
        <button type="button" data-t="play"></button>
        <button type="button" data-t="next" class="tk-tour-primary">Next</button>
      </div>`;
    document.body.appendChild(card);
    document.body.classList.add("tk-tour-on");
    card.addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]");
      if (!b) return;
      const t = b.dataset.t;
      if (t === "close") return stop();
      if (t === "play") { state.playing = !state.playing; paint(); schedule(); return; }
      if (state.busy) return;
      if (t === "back") go(state.i - 1);
      if (t === "next") go(state.i + 1);
    });
    state.key = (e) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight" && !state.busy) go(state.i + 1);
      if (e.key === "ArrowLeft" && !state.busy) go(state.i - 1);
    };
    document.addEventListener("keydown", state.key);

    function paint() {
      const s = tour.steps[state.i];
      card.querySelector(".tk-tour-count").textContent = `${state.i + 1} of ${tour.steps.length}`;
      card.querySelector(".tk-tour-progress span").style.width = `${((state.i + 1) / tour.steps.length) * 100}%`;
      card.querySelector(".tk-tour-title").textContent = s.title;
      card.querySelector(".tk-tour-text").textContent = s.text;
      card.querySelector('[data-t="back"]').disabled = state.i === 0;
      card.querySelector('[data-t="next"]').textContent = state.i === tour.steps.length - 1 ? "Finish" : "Next";
      card.querySelector('[data-t="play"]').textContent = state.playing ? "Pause" : "Play";
      card.classList.toggle("tk-tour-busy", state.busy);
    }
    function schedule() {
      clearTimeout(state.timer);
      if (state.playing && !state.busy) state.timer = setTimeout(() => go(state.i + 1), readTime(tour.steps[state.i]));
    }
    async function go(i) {
      clearTimeout(state.timer);
      if (i >= tour.steps.length) return finish();
      if (i < 0) return;
      state.i = i;
      const s = tour.steps[i];
      state.busy = true;
      paint();
      focusOn(s.sel);
      await sleep(450);
      if (!state.done.has(i) && s.do) {
        state.done.add(i);
        await runOps(s.do, token);
        if (token.cancelled) return;
        focusOn(s.sel);
      }
      state.busy = false;
      paint();
      schedule();
    }
    function finish() {
      stop();
      const note = document.querySelector(".tk-tour-launch .tk-tour-note");
      if (note) note.textContent = "Demo finished. Everything on screen is yours to edit.";
    }
    state.stopUi = () => {
      clearTimeout(state.timer);
      card.remove();
      document.body.classList.remove("tk-tour-on");
      document.removeEventListener("keydown", state.key);
      document.querySelectorAll(".tk-tour-focus").forEach((e) => e.classList.remove("tk-tour-focus"));
    };
    go(0);
  }

  function stop() {
    if (!active) return;
    active.token.cancelled = true;
    active.stopUi();
    active = null;
  }

  // Adds the launch bar above a tool. `before` is the element it sits above.
  function attach(before, tour) {
    if (!before || before.previousElementSibling && before.previousElementSibling.classList.contains("tk-tour-launch")) return;
    const bar = document.createElement("div");
    bar.className = "tk-tour-launch";
    const secs = Math.round(tour.steps.reduce((s, x) => s + readTime(x), 0) / 10000) * 10;
    bar.innerHTML = `<button type="button" class="tk-tour-go"><span aria-hidden="true">&#9654;</span> Watch the demo</button>
      <span class="tk-tour-note">${tour.steps.length} steps, about ${Math.max(1, Math.round(secs / 60 * 2) / 2)} min. The demo fills in sample data, so export your own work first.</span>`;
    bar.querySelector("button").addEventListener("click", () => start(tour));
    before.parentNode.insertBefore(bar, before);
  }

  function init() {
    const tours = window.TKTours || {};
    Object.keys(tours).forEach((id) => {
      const root = document.getElementById(id);
      if (!root) return;
      const host = root.closest(".toolkit-app") || root.closest(".layout") || root;
      attach(host, tours[id]);
    });
  }

  window.TKTour = { start, stop, attach };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
