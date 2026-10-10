/*
 * assets/js/toolkit/toolkit-data.js
 *
 * Loads a sample dataset into a toolkit tool. Two routes: the
 * copy served from /downloads/toolkit/data/, which is byte-identical to
 * the source file, or the user's own copy opened
 * from their device. Both routes parse with TK.csvObjects, which honours
 * quoted fields, and both check the expected column names before the tool
 * sees any rows. Nothing in the file is altered or re-saved.
 *
 * Usage: const box = window.TKData.loader({ file, label, required, onLoad });
 *   onLoad({ headers, rows }, sourceName) runs on every successful load.
 *   box.loadServed() fetches the served copy, used to open on the sample.
 */
(function () {
  "use strict";
  const TK = window.TK;
  const BASE = "/downloads/toolkit/data/";

  function check(parsed, required) {
    const missing = (required || []).filter((h) => !parsed.headers.includes(h));
    return missing.length ? `This file lacks the column${missing.length > 1 ? "s" : ""} ${missing.join(", ")}. Open the original sample file.` : "";
  }

  function loader(opts) {
    const box = document.createElement("div");
    box.className = "tk-toolbar tk-data-loader";
    box.innerHTML = `
      <button type="button" class="toolkit-btn secondary" data-load="served">Load ${TK.esc(opts.label || opts.file)}</button>
      <label class="toolkit-btn secondary tk-file-btn">Open your own copy<input type="file" accept=".csv,text/csv" hidden></label>
      <a class="tk-help" href="${BASE + opts.file}" download>Download ${TK.esc(opts.file)}</a>
      <span class="tk-status" role="status"></span>`;
    const st = box.querySelector(".tk-status");

    function accept(text, name) {
      const parsed = TK.csvObjects(text);
      const problem = check(parsed, opts.required);
      if (problem) { st.textContent = problem; return false; }
      opts.onLoad(parsed, name);
      TK.status(st, `Loaded ${name}, ${parsed.rows.length} rows.`);
      return true;
    }
    function loadServed() {
      return fetch(BASE + opts.file, { cache: "no-cache" })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then((text) => accept(text, opts.file))
        .catch(() => { st.textContent = "The file could not be fetched. Use Open your own copy."; return false; });
    }
    box.querySelector('[data-load="served"]').addEventListener("click", loadServed);
    box.querySelector('input[type="file"]').addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => accept(String(reader.result), f.name);
      reader.readAsText(f);
      e.target.value = "";
    });
    box.loadServed = loadServed;
    return box;
  }

  // A "Sample file" or "Your own" switch shared by the tools.
  function tabs(labels, onPick) {
    const nav = document.createElement("div");
    nav.className = "toolkit-stage-nav";
    nav.setAttribute("role", "tablist");
    nav.innerHTML = labels.map((l, i) => `<button type="button" role="tab" data-tab="${i}"${i ? "" : ' aria-current="step"'}>${TK.esc(l)}</button>`).join("");
    nav.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      nav.querySelectorAll("[data-tab]").forEach((x) => x.removeAttribute("aria-current"));
      b.setAttribute("aria-current", "step");
      onPick(Number(b.dataset.tab));
    });
    return nav;
  }

  // Uniform pseudo-random numbers on [0, 1), mulberry32. The simulators use
  // this one: TK.rng takes a 32-bit value modulo 1e9, which favours low
  // numbers (about 0.534 fall below 0.5), fine for sample data and wrong
  // for a fair coin.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.TKData = { loader, tabs, rng, BASE };
})();
