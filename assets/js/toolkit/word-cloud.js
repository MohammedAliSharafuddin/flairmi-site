/*
 * assets/js/toolkit/word-cloud.js
 *
 * Word Cloud Maker. Paste open-ended answers, a saved Zoom chat or a column
 * exported from a form, and the tool counts the terms and draws them as a
 * word cloud with a frequency table beside it. Two ways to count:
 *
 *   each answer   every line (or comma-separated item) is one term, so
 *                 "cared for" stays together, the usual choice for a
 *                 one-word poll
 *   single words  answers are split into words and common words dropped
 *
 * Chat clean-up removes the time, sender and "to Everyone" parts that Zoom
 * writes in front of each message, in both its older one-line and newer
 * two-line formats. Layout uses d3-cloud (Jason Davies), sized by the square
 * root of the count so a term said twice as often is not twice as wide.
 *
 * Usage: window.WordCloud.mount("wc-app", { embed: false }). The pure
 * functions in window.WordCloud.compute need no page and no d3.
 */
(function () {
  "use strict";
  const TK = window.TK;

  // ---------- pure calculations ----------
  const STOP = new Set(("a about above after again against all am an and any are as at be because been before being below between both but by " +
    "can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how " +
    "i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over " +
    "own same she should so some such than that the their theirs them themselves then there these they this those through to too under " +
    "until up very was we were what when where which while who whom why will with would you your yours yourself yourselves " +
    "im ive id dont didnt doesnt isnt wasnt cant couldnt wont also really got get much many lot lots one us").split(" "));

  // Zoom, older format: "10:02:15 From Ali Hassan to Everyone : awe"
  // Zoom, newer format: "10:02:15 From Ali Hassan to Everyone:" then the message on the next line
  // Zoom cloud transcript: "00:12:34<TAB>Ali Hassan:<TAB>awe"
  const ZOOM_LINE = /^\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?\s+From\s+.+?:\s*(.*)$/i;
  const ZOOM_TAB = /^\d{1,2}:\d{2}(?::\d{2})?\t[^\t]+:\t(.*)$/;
  const STAMP_ONLY = /^\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?$/i;

  function cleanChat(text) {
    const out = [];
    String(text || "").split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || STAMP_ONLY.test(line)) return;
      let m = line.match(ZOOM_LINE) || raw.match(ZOOM_TAB);
      if (m) { if (m[1].trim()) out.push(m[1].trim()); return; }
      out.push(line);
    });
    return out.join("\n");
  }
  function normalise(s) {
    return String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}'\- ]+/gu, " ").replace(/\s+/g, " ").trim().replace(/^['-]+|['-]+$/g, "");
  }
  // mode "answer": each line or comma-separated item is one term
  // mode "word": every word is a term, common words dropped when stop is true
  function terms(text, opts) {
    const o = Object.assign({ mode: "answer", stop: true, chat: true }, opts || {});
    const body = o.chat ? cleanChat(text) : String(text || "");
    if (o.mode === "word") {
      return normalise(body.replace(/[\r\n,;]+/g, " ")).split(" ")
        .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
        .filter((w) => w.length > 1 && !/^\d+$/.test(w) && !(o.stop && STOP.has(w.replace(/'/g, ""))));
    }
    return body.split(/[\r\n,;]+/).map(normalise).filter(Boolean);
  }
  function counts(list) {
    const m = new Map();
    list.forEach((t) => m.set(t, (m.get(t) || 0) + 1));
    return [...m].map(([term, n]) => ({ term, n })).sort((a, b) => b.n - a.n || a.term.localeCompare(b.term));
  }

  // ---------- drawing ----------
  let layout = null;
  function draw(box, rows, opts, done) {
    if (layout) layout.stop();
    box.innerHTML = "";
    if (!rows.length || !(d3.layout && d3.layout.cloud)) return done(0);
    const W = Math.max(300, Math.min(900, box.clientWidth || 900)), H = Math.round(W * 0.56);
    const max = rows[0].n, min = rows[rows.length - 1].n;
    const big = Math.round(W / 9), small = Math.max(13, Math.round(W / 50));
    const size = d3.scaleSqrt().domain([min, Math.max(max, min + 1)]).range([small, big]);
    const shade = d3.scaleLinear().domain([min, Math.max(max, min + 1)]).range([TK.MUTED, TK.INK]);
    // The accent marks the three most frequent terms, and any term tied with the third.
    const top = rows[Math.min(2, rows.length - 1)].n;
    const colour = (d, i) => (opts.colour === "mixed" ? TK.PALETTE[i % TK.PALETTE.length] : d.n >= top ? TK.PALETTE[0] : shade(d.n));
    const words = rows.map((r) => ({ text: r.term, n: r.n, size: size(r.n) }));
    const svg = TK.svg(box, W, H, `Word cloud of ${rows.length} terms. Most frequent: ${rows.slice(0, 10).map((r) => `${r.term} (${r.n})`).join(", ")}`);
    const g = svg.append("g").attr("transform", `translate(${W / 2},${H / 2})`);
    layout = d3.layout.cloud().size([W, H]).words(words).padding(3)
      .rotate(() => (opts.rotate && Math.random() < 0.3 ? 90 : 0))
      .font("Lato, Helvetica Neue, Arial, sans-serif").fontWeight(700).fontSize((d) => d.size)
      .on("end", (placed) => {
        g.selectAll("text").data(placed).enter().append("text")
          .attr("text-anchor", "middle")
          .attr("font-family", "Lato, Helvetica Neue, Arial, sans-serif").attr("font-weight", 700)
          .attr("font-size", (d) => d.size)
          .attr("fill", (d, i) => colour(d, i))
          .attr("transform", (d) => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
          .text((d) => d.text)
          .append("title").text((d) => `${d.text}: ${d.n}`);
        done(placed.length);
      });
    layout.start();
  }

  // ---------- the tool ----------
  const SAMPLE = ["10:02:15 From Aishath to Everyone:", "\tawe", "10:02:21 From Hassan to Everyone:", "\tcared for",
    "10:02:24 From Priya to Everyone:", "\tsurprised", "10:02:30 From Marco to Everyone:", "\tfree",
    "awe", "cared for", "safe", "relaxed", "surprised", "awe", "recognised", "cared for", "peaceful", "welcomed",
    "awe", "special", "free", "cared for", "connected", "joy", "awe", "home"].join("\n");

  function mount(rootId, options) {
    const root = document.getElementById(rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const embed = !!(options && options.embed);
    const qs = new URLSearchParams(window.location.search);
    const q = (k) => root.querySelector(`[data-k="${k}"]`);

    root.innerHTML = `
      <label>Answers <textarea data-k="text" rows="8" class="tk-mono" aria-label="Answers to count"></textarea></label>
      <p class="tk-help">Paste one answer per line, a saved Zoom chat, or a column copied from Moodle, Microsoft Forms or a spreadsheet.</p>
      <div class="tk-grid">
        <label>Count <select data-k="mode">
          <option value="answer">Each answer as one term</option>
          <option value="word">Single words</option></select></label>
        <label>Most terms shown <input type="number" data-k="max" min="5" max="150" step="5" value="60"></label>
        <label>Colour <select data-k="colour">
          <option value="shade">Darker is more frequent</option>
          <option value="mixed">Mixed colours</option></select></label>
      </div>
      <div class="tk-row">
        <label class="tk-check-row"><input type="checkbox" data-k="chat" checked> Remove chat times and names</label>
        <label class="tk-check-row"><input type="checkbox" data-k="stop" checked> Drop common words (single words only)</label>
        <label class="tk-check-row"><input type="checkbox" data-k="rotate"> Turn some words upright</label>
      </div>
      <div class="tk-toolbar"><button type="button" class="toolkit-btn secondary" data-k="redraw">Redraw</button>
        <button type="button" class="toolkit-btn secondary" data-k="clear">Clear</button></div>
      <div class="tk-report">
        <h3 class="tk-report-title">Word cloud</h3>
        <div class="tk-kpis wc-kpis"></div>
        <div class="tk-chart-box wc-chart"></div>
        <p class="tk-help wc-note"></p>
        <div class="tk-table-wrap"><table class="tk-table wc-table"></table></div>
      </div>`;
    const report = root.querySelector(".tk-report");
    let rows = [];
    const csv = () => TK.toCSV([["term", "count"]].concat(rows.map((r) => [r.term, r.n])));
    if (!embed) root.appendChild(TK.exportRow(report, "word-cloud", [
      { label: "Download CSV", run: (st) => { TK.downloadText(csv(), "word-cloud-counts.csv", "text/csv"); TK.status(st, "Downloaded."); } },
      { label: "Copy list", run: (st) => TK.copyText(rows.map((r) => `${r.term}\t${r.n}`).join("\n")).then(() => TK.status(st, "Copied.")) }
    ]));
    q("text").value = qs.has("words") ? qs.get("words").split("|").join("\n") : SAMPLE;

    function render() {
      const max = Math.max(5, Math.min(150, TK.num(q("max").value) || 60));
      const list = terms(q("text").value, { mode: q("mode").value, stop: q("stop").checked, chat: q("chat").checked });
      const all = counts(list);
      rows = all.slice(0, max);
      const kp = report.querySelector(".wc-kpis"), note = report.querySelector(".wc-note"), tbl = report.querySelector(".wc-table");
      q("stop").disabled = q("mode").value !== "word";
      if (!all.length) {
        kp.innerHTML = `<p class="tk-help">Paste some answers to draw the cloud.</p>`;
        note.textContent = ""; tbl.innerHTML = ""; report.querySelector(".wc-chart").innerHTML = "";
        return;
      }
      kp.innerHTML = [[TK.fmtInt(list.length), q("mode").value === "word" ? "Words counted" : "Answers"], [TK.fmtInt(all.length), "Different terms"],
        [TK.esc(all[0].term), `Most frequent, ${all[0].n} of ${list.length}`]]
        .map(([v, l]) => `<div class="tk-kpi"><span class="tk-kpi-v">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
      tbl.innerHTML = `<thead><tr><th>Term</th><th class="tk-num">Count</th><th class="tk-num">Share</th></tr></thead><tbody>${rows.map((r) =>
        `<tr><td>${TK.esc(r.term)}</td><td class="tk-num">${r.n}</td><td class="tk-num">${TK.fmtPct(r.n / list.length, 1)}</td></tr>`).join("")}</tbody>`;
      draw(report.querySelector(".wc-chart"), rows, { colour: q("colour").value, rotate: q("rotate").checked }, (placed) => {
        const cut = all.length - rows.length, missed = rows.length - placed;
        note.textContent = [cut > 0 ? `${cut} less frequent terms are left out of the cloud by the limit above.` : "",
          missed > 0 ? `${missed} terms did not fit and are listed only in the table.` : ""].filter(Boolean).join(" ");
      });
    }
    let timer = null;
    const later = () => { clearTimeout(timer); timer = setTimeout(render, 250); };
    root.querySelectorAll("input, select, textarea").forEach((el) => el.addEventListener("input", later));
    q("redraw").addEventListener("click", render);
    q("clear").addEventListener("click", () => { q("text").value = ""; render(); q("text").focus(); });
    render();
    let lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      later();
    });
  }

  window.WordCloud = { mount, compute: { cleanChat, terms, counts, STOP } };
})();
