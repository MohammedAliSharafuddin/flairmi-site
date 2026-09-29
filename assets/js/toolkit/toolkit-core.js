/*
 * assets/js/toolkit/toolkit-core.js
 *
 * Shared helpers for the Marketing Toolkit Hub tools: escaping, number
 * formatting, CSV parsing, browser storage, file downloads, PNG and PDF
 * export, a few statistics routines (normal distribution, ordinary least
 * squares), and the categorical palette. Every tool that loads this file
 * finds it at window.TK. Nothing here makes a network call.
 */
(function () {
  "use strict";

  // Categorical palette from the dataviz skill's validated reference
  // palette, the same slots the other toolkit tools use. Colour marks
  // category identity only, the rest of the site stays ink on white.
  const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
  const INK = "#111111", MUTED = "#6b6b6b", BORDER = "#e5e5e5", GOOD = "#1baf7a", BAD = "#b42318";

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function num(v, fallback) {
    const n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : (fallback === undefined ? NaN : fallback);
  }

  function fmt(n, digits) {
    if (!Number.isFinite(n)) return "n/a";
    const d = digits === undefined ? 2 : digits;
    return n.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtInt(n) {
    return Number.isFinite(n) ? Math.round(n).toLocaleString("en-GB") : "n/a";
  }
  function fmtPct(p, digits) {
    return Number.isFinite(p) ? fmt(p * 100, digits === undefined ? 1 : digits) + "%" : "n/a";
  }
  function fmtMoney(n, symbol, digits) {
    if (!Number.isFinite(n)) return "n/a";
    const s = symbol === undefined ? "" : symbol;
    return (n < 0 ? "-" : "") + s + fmt(Math.abs(n), digits === undefined ? 0 : digits);
  }

  // CSV: detects comma, semicolon, or tab, honours double-quoted fields.
  function parseCSV(text) {
    const src = String(text || "").replace(/\r\n?/g, "\n").trim();
    if (!src) return [];
    const first = src.split("\n")[0];
    const counts = { ",": (first.match(/,/g) || []).length, ";": (first.match(/;/g) || []).length, "\t": (first.match(/\t/g) || []).length };
    const delim = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (quoted) {
        if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === delim) { row.push(field.trim()); field = ""; }
      else if (c === "\n") { row.push(field.trim()); rows.push(row); row = []; field = ""; }
      else field += c;
    }
    row.push(field.trim());
    rows.push(row);
    return rows.filter((r) => r.some((x) => x !== ""));
  }
  function csvObjects(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) return { headers: rows[0] || [], rows: [] };
    const headers = rows[0].map((h) => h.trim());
    return { headers, rows: rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] === undefined ? "" : r[i]]))) };
  }
  function toCSV(rows) {
    return rows.map((r) => r.map((v) => {
      const s = String(v == null ? "" : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
  }

  const store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadText(text, name, type) {
    download(new Blob([text], { type: type || "text/plain" }), name);
  }
  function slug(s, fallback) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback || "export";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
    return Promise.resolve();
  }

  // PNG and PDF export of one element. Needs html2canvas, and jsPDF for PDF.
  function exportImage(el, name, kind) {
    if (typeof html2canvas === "undefined") return Promise.reject(new Error("html2canvas missing"));
    el.classList.add("tk-exporting");
    return html2canvas(el, { scale: 2, backgroundColor: "#ffffff", windowWidth: Math.max(el.scrollWidth, 1000) })
      .then((canvas) => {
        if (kind === "pdf") {
          if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error("jsPDF missing");
          const landscape = canvas.width >= canvas.height;
          const pdf = new window.jspdf.jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
          const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 24;
          const ratio = Math.min((pw - 2 * m) / canvas.width, (ph - 2 * m) / canvas.height);
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", m, m, canvas.width * ratio, canvas.height * ratio);
          pdf.save(name + ".pdf");
        } else {
          canvas.toBlob((b) => download(b, name + ".png"));
        }
      })
      .finally(() => el.classList.remove("tk-exporting"));
  }

  // A status line that clears itself.
  function status(el, msg) {
    if (!el) return;
    el.textContent = msg;
    if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 4000);
  }

  // Standard export row: PNG, PDF, plus any extra buttons.
  function exportRow(target, name, extras) {
    const row = document.createElement("div");
    row.className = "tk-export-row";
    row.innerHTML = `<button type="button" class="toolkit-btn" data-x="png">Export PNG</button>
      <button type="button" class="toolkit-btn" data-x="pdf">Export PDF</button>
      ${(extras || []).map((x, i) => `<button type="button" class="toolkit-btn secondary" data-extra="${i}">${esc(x.label)}</button>`).join("")}
      <span class="tk-status" role="status"></span>`;
    const st = row.querySelector(".tk-status");
    row.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.x) {
        const el = typeof target === "function" ? target() : target;
        status(st, "Exporting");
        exportImage(el, typeof name === "function" ? name() : name, b.dataset.x)
          .then(() => status(st, "Exported."))
          .catch(() => status(st, "Export needs the export libraries, reload and try again."));
      } else if (b.dataset.extra) {
        extras[Number(b.dataset.extra)].run(st);
      }
    });
    return row;
  }

  // ---- statistics ----
  function mean(a) {
    const v = a.filter(Number.isFinite);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
  }
  function sd(a) {
    const v = a.filter(Number.isFinite), m = mean(v);
    return v.length > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / (v.length - 1)) : NaN;
  }
  // Standard normal CDF, Abramowitz and Stegun 7.1.26 via erf.
  function erf(x) {
    const s = Math.sign(x), t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCdf(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }
  function normPdf(z) {
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }
  // Inverse standard normal, Acklam's rational approximation.
  function normInv(p) {
    if (p <= 0 || p >= 1) return NaN;
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const lo = 0.02425, hi = 1 - lo;
    let q, r;
    if (p < lo) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > hi) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // Ordinary least squares by the normal equations, solved with Gaussian
  // elimination and partial pivoting. X is an array of rows, each row
  // already carrying a leading 1 when an intercept is wanted.
  function ols(X, y) {
    const n = X.length, k = X[0].length;
    const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < k; a++) {
        for (let b = 0; b < k; b++) A[a][b] += X[i][a] * X[i][b];
        A[a][k] += X[i][a] * y[i];
      }
    }
    for (let col = 0; col < k; col++) {
      let piv = col;
      for (let r = col + 1; r < k; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-12) return null;
      [A[col], A[piv]] = [A[piv], A[col]];
      for (let r = 0; r < k; r++) {
        if (r === col) continue;
        const f = A[r][col] / A[col][col];
        for (let c = col; c <= k; c++) A[r][c] -= f * A[col][c];
      }
    }
    const beta = A.map((row, i) => row[k] / row[i]);
    const fitted = X.map((row) => row.reduce((s, x, j) => s + x * beta[j], 0));
    const ym = mean(y);
    const ssTot = y.reduce((s, v) => s + (v - ym) * (v - ym), 0);
    const ssRes = y.reduce((s, v, i) => s + (v - fitted[i]) * (v - fitted[i]), 0);
    return { beta, fitted, r2: ssTot > 0 ? 1 - ssRes / ssTot : NaN, ssRes, n, k };
  }

  // A deterministic pseudo-random generator, so sample data is identical
  // on every load.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 1e9) / 1e9;
    };
  }

  // D3 helpers.
  function svg(container, w, h, label) {
    return d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("class", "tk-chart")
      .attr("role", "img")
      .attr("aria-label", label || "Chart");
  }
  function axisStyle(g) {
    g.selectAll("text").attr("fill", MUTED).attr("font-size", 11);
    g.selectAll("line,path").attr("stroke", "#c9c9c9");
    return g;
  }

  window.TK = {
    PALETTE, INK, MUTED, BORDER, GOOD, BAD,
    esc, num, fmt, fmtInt, fmtPct, fmtMoney, parseCSV, csvObjects, toCSV,
    store, download, downloadText, slug, copyText, exportImage, exportRow, status,
    mean, sd, normCdf, normPdf, normInv, ols, rng, svg, axisStyle
  };
})();
