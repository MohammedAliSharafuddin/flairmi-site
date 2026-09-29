/*
 * assets/js/toolkit/execution.js
 *
 * The nine execution-asset tools of the Marketing Toolkit Hub, one mount
 * function each: UTM Campaign URL Builder, Meta Tag and Open Graph Preview,
 * Schema Markup Generator, Canonical Tag Generator, Readability and
 * Headline Analyser, Robots.txt and Sitemap Generator, Colour Contrast
 * Checker, Hashtag and Character Counter, and the A/B Test Sample Size and
 * Significance Calculator. Everything runs in the browser.
 *
 * Usage: window.Execution.<tool>({ rootId }).
 */
(function () {
  "use strict";
  const TK = window.TK;

  function el(root, k) { return root.querySelector(`[data-k="${k}"]`); }
  function copyBtn(label, getText) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toolkit-btn secondary";
    b.textContent = label || "Copy";
    b.addEventListener("click", () => TK.copyText(getText()).then(() => { const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1500); }));
    return b;
  }
  function tiles(items) {
    return items.map(([v, l, cls]) => `<div class="tk-kpi"><span class="tk-kpi-v ${cls || ""}">${v}</span><span class="tk-kpi-l">${l}</span></div>`).join("");
  }
  function isUrl(s) {
    try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch (e) { return false; }
  }

  // ---------------- UTM builder ----------------
  function utm(config) {
    const root = document.getElementById(config.rootId);
    if (!root || !TK) return;
    const LOG = "flairmi-utm-log-v1";
    const F = [["url", "Website URL", "https://example.com/offers/spring", true], ["source", "Campaign source (utm_source)", "newsletter, linkedin, google", true],
      ["medium", "Campaign medium (utm_medium)", "email, social, cpc", true], ["campaign", "Campaign name (utm_campaign)", "spring_sale_2027", true],
      ["term", "Campaign term (utm_term)", "paid search keyword", false], ["content", "Campaign content (utm_content)", "header_button", false], ["id", "Campaign ID (utm_id)", "optional", false]];
    root.innerHTML = `
      <div class="tk-grid">${F.map(([k, l, ph, req]) => `<label>${l}${req ? " *" : ""}<input type="text" data-k="${k}" placeholder="${ph}"></label>`).join("")}</div>
      <div class="tk-row">
        <label class="tk-check-row"><input type="checkbox" data-k="lower" checked> Lower-case every value</label>
        <label class="tk-check-row">Replace spaces with <select data-k="space"><option value="_">underscores</option><option value="-">hyphens</option><option value="%20">%20</option></select></label>
      </div>
      <h4>Tagged URL</h4>
      <div class="tk-output" data-k="out">Fill in the starred fields.</div>
      <ul class="tk-list" data-k="warn"></ul>
      <div class="tk-row" data-k="actions"></div>
      <details class="tk-details"><summary>Bulk mode</summary>
        <p class="tk-help">One link per line: url, source, medium, campaign, content. Options above apply.</p>
        <textarea class="tk-mono" rows="5" data-k="bulk" placeholder="https://example.com/,linkedin,social,spring_sale,carousel_1"></textarea>
        <div class="tk-row"><button type="button" class="toolkit-btn" data-a="bulk">Build all</button></div>
        <div class="tk-output" data-k="bulkout" hidden></div>
      </details>
      <h4>Saved links on this device</h4><ul class="tk-list" data-k="log"></ul>`;
    const clean = (v) => {
      let s = String(v || "").trim();
      if (el(root, "lower").checked) s = s.toLowerCase();
      const sp = el(root, "space").value;
      return sp === "%20" ? s.replace(/\s+/g, " ") : s.replace(/\s+/g, sp);
    };
    function build(vals) {
      if (!isUrl(vals.url)) return { error: "Enter a full URL starting with https://" };
      const u = new URL(vals.url.trim());
      const warns = [];
      ["source", "medium", "campaign", "term", "content", "id"].forEach((k) => {
        if (u.searchParams.has("utm_" + k)) warns.push(`The URL already had utm_${k}. It has been replaced.`);
        u.searchParams.delete("utm_" + k);
        if (vals[k]) u.searchParams.set("utm_" + k, clean(vals[k]));
      });
      if (!vals.source || !vals.medium || !vals.campaign) return { error: "Source, medium, and campaign are all required." };
      if (/[A-Z]/.test(vals.source + vals.medium + vals.campaign) && !el(root, "lower").checked) warns.push("Mixed case splits one channel into two rows in most analytics tools. Use lower case throughout.");
      if (["email", "social", "cpc", "paid_social", "display", "affiliate", "referral", "organic", "video", "sms", "push"].indexOf(clean(vals.medium)) < 0) warns.push(`"${clean(vals.medium)}" is not a common medium. Analytics default channel groups may file it as unassigned.`);
      const out = u.toString();
      return { url: el(root, "space").value === "%20" ? out.replace(/\+/g, "%20") : out, warns };
    }
    let last = "";
    function update() {
      const vals = Object.fromEntries(F.map(([k]) => [k, el(root, k).value.trim()]));
      const r = build(vals);
      el(root, "out").textContent = r.error || r.url;
      el(root, "warn").innerHTML = (r.warns || []).map((w) => `<li>${TK.esc(w)}</li>`).join("");
      last = r.error ? "" : r.url;
    }
    root.querySelectorAll("input,select").forEach((i) => i.addEventListener("input", update));
    const actions = el(root, "actions");
    actions.appendChild(copyBtn("Copy URL", () => last));
    const saveB = document.createElement("button");
    saveB.type = "button"; saveB.className = "toolkit-btn secondary"; saveB.textContent = "Save to list";
    saveB.addEventListener("click", () => { if (!last) return; const log = TK.store.get(LOG, []); log.unshift({ url: last, at: new Date().toISOString().slice(0, 10) }); TK.store.set(LOG, log.slice(0, 25)); renderLog(); });
    actions.appendChild(saveB);
    function renderLog() {
      const log = TK.store.get(LOG, []);
      el(root, "log").innerHTML = log.length ? log.map((x) => `<li><span class="tk-mono">${TK.esc(x.url)}</span> <span class="tk-help">${x.at}</span></li>`).join("") : `<li class="tk-help">Saved links appear here.</li>`;
    }
    root.querySelector('[data-a="bulk"]').addEventListener("click", () => {
      const rows = TK.parseCSV(el(root, "bulk").value);
      const out = rows.map((r) => { const b = build({ url: r[0], source: r[1], medium: r[2], campaign: r[3], content: r[4] }); return [r[0], b.error || b.url]; });
      const box = el(root, "bulkout");
      box.hidden = false;
      box.textContent = out.map((o) => o[1]).join("\n");
      const dl = document.createElement("button");
      dl.type = "button"; dl.className = "toolkit-btn secondary"; dl.textContent = "Download CSV";
      dl.addEventListener("click", () => TK.downloadText(TK.toCSV([["original", "tagged"]].concat(out)), "utm-links.csv", "text/csv"));
      box.after(dl);
    });
    el(root, "url").value = "https://example.com/offers/spring";
    el(root, "source").value = "newsletter";
    el(root, "medium").value = "email";
    el(root, "campaign").value = "Spring Sale 2027";
    el(root, "content").value = "header button";
    update();
    renderLog();
  }

  // ---------------- Meta tags and Open Graph preview ----------------
  function textWidth(text, font) {
    const c = textWidth.c || (textWidth.c = document.createElement("canvas").getContext("2d"));
    c.font = font;
    return c.measureText(text).width;
  }
  function meta(config) {
    const root = document.getElementById(config.rootId);
    if (!root || !TK) return;
    root.innerHTML = `
      <div class="tk-grid">
        <label>Page title <input type="text" data-k="title" value="Customer Journey Mapper: free browser tool | FlairMI"></label>
        <label>Page URL <input type="text" data-k="url" value="https://flairmi.com/toolkit/customer-journey-mapper.html"></label>
        <label>Site name <input type="text" data-k="site" value="FlairMI"></label>
        <label>Image URL (1200 by 630) <input type="text" data-k="image" placeholder="https://example.com/og-image.png"></label>
        <label>X handle <input type="text" data-k="handle" placeholder="@yourbrand"></label>
        <label>Content type <select data-k="type"><option>website</option><option>article</option><option>product</option></select></label>
      </div>
      <label>Meta description <textarea rows="2" data-k="desc">Map each persona's goals and emotions stage by stage, with a service blueprint and pain points tagged to the four service gaps. Free, no sign-up.</textarea></label>
      <div class="tk-kpis" data-k="tiles"></div>
      <div class="tk-split">
        <div><h4>Search result</h4><div class="mp-serp" data-k="serp"></div></div>
        <div><h4>Facebook and LinkedIn</h4><div class="mp-card" data-k="og"></div></div>
      </div>
      <h4>X (summary with large image)</h4><div class="mp-card mp-x" data-k="x"></div>
      <h4>HTML for the page head</h4><div class="tk-output" data-k="code"></div><div class="tk-row" data-k="actions"></div>`;
    let code = "";
    function update() {
      const v = (k) => el(root, k).value.trim();
      const title = v("title"), desc = v("desc"), url = v("url"), image = v("image");
      let host = "";
      try { host = new URL(url).hostname; } catch (e) { host = url; }
      const tw = textWidth(title, "20px Arial"), dw = textWidth(desc, "14px Arial");
      const st = (ok) => (ok ? "tk-pos" : "tk-neg");
      el(root, "tiles").innerHTML = tiles([
        [`${title.length} chars`, `Title, about ${Math.round(tw)} of 600 px`, st(tw <= 600 && title.length >= 30)],
        [`${desc.length} chars`, `Description, about ${Math.round(dw)} of 920 px`, st(dw <= 920 && desc.length >= 70)],
        [isUrl(url) ? "Valid" : "Check", "Canonical URL", st(isUrl(url))],
        [image ? (isUrl(image) ? "Set" : "Check") : "Missing", "Share image", st(isUrl(image))]]);
      const trunc = (s, px, font) => { if (textWidth(s, font) <= px) return s; let t = s; while (t.length && textWidth(t + " …", font) > px) t = t.slice(0, -1); return t.trim() + " …"; };
      el(root, "serp").innerHTML = `<div class="mp-site">${TK.esc(v("site") || host)}<span>${TK.esc(url)}</span></div><div class="mp-title">${TK.esc(trunc(title, 600, "20px Arial"))}</div><div class="mp-desc">${TK.esc(trunc(desc, 920, "14px Arial"))}</div>`;
      const img = isUrl(image) ? `<div class="mp-img" style="background-image:url('${TK.esc(image)}')"></div>` : `<div class="mp-img mp-noimg">No image set. Shares show a small or empty preview.</div>`;
      el(root, "og").innerHTML = `${img}<div class="mp-body"><div class="mp-host">${TK.esc(host.toUpperCase())}</div><div class="mp-otitle">${TK.esc(title)}</div><div class="mp-odesc">${TK.esc(trunc(desc, 700, "14px Arial"))}</div></div>`;
      el(root, "x").innerHTML = `${img}<div class="mp-body"><div class="mp-otitle">${TK.esc(title)}</div><div class="mp-host">From ${TK.esc(host)}</div></div>`;
      const a = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      code = [`<title>${a(title)}</title>`, `<meta name="description" content="${a(desc)}">`, `<link rel="canonical" href="${a(url)}">`,
        `<meta property="og:type" content="${a(v("type"))}">`, `<meta property="og:site_name" content="${a(v("site"))}">`, `<meta property="og:title" content="${a(title)}">`,
        `<meta property="og:description" content="${a(desc)}">`, `<meta property="og:url" content="${a(url)}">`]
        .concat(image ? [`<meta property="og:image" content="${a(image)}">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`] : [])
        .concat([`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`, `<meta name="twitter:title" content="${a(title)}">`, `<meta name="twitter:description" content="${a(desc)}">`])
        .concat(image ? [`<meta name="twitter:image" content="${a(image)}">`] : []).concat(v("handle") ? [`<meta name="twitter:site" content="${a(v("handle"))}">`] : []).join("\n");
      el(root, "code").textContent = code;
    }
    root.querySelectorAll("input,select,textarea").forEach((i) => i.addEventListener("input", update));
    el(root, "actions").appendChild(copyBtn("Copy HTML", () => code));
    update();
  }

  // ---------------- Schema markup ----------------
  const SCHEMAS = {
    Organization: { fields: [["name", "Name", 1], ["url", "Website URL", 1], ["logo", "Logo URL", 0], ["sameAs", "Profile URLs, one per line", 0, "lines"], ["email", "Contact email", 0], ["telephone", "Telephone", 0]] },
    LocalBusiness: { fields: [["name", "Business name", 1], ["url", "Website URL", 0], ["telephone", "Telephone", 0], ["streetAddress", "Street address", 1], ["addressLocality", "Town or city", 1], ["postalCode", "Postcode", 0], ["addressCountry", "Country code, e.g. PT", 1], ["openingHours", "Opening hours, e.g. Mo-Fr 09:00-17:00", 0], ["priceRange", "Price range, e.g. €€", 0]] },
    Hotel: { fields: [["name", "Hotel name", 1], ["url", "Website URL", 0], ["telephone", "Telephone", 0], ["streetAddress", "Street address", 1], ["addressLocality", "Town or city", 1], ["addressCountry", "Country code", 1], ["starRating", "Star rating, 1 to 5", 0], ["checkinTime", "Check-in time, e.g. 15:00", 0], ["checkoutTime", "Check-out time, e.g. 11:00", 0], ["priceRange", "Price range", 0]] },
    Article: { fields: [["headline", "Headline", 1], ["author", "Author name", 1], ["datePublished", "Date published (YYYY-MM-DD)", 1], ["dateModified", "Date modified", 0], ["image", "Image URL", 1], ["publisher", "Publisher name", 0], ["url", "Article URL", 0]] },
    Product: { fields: [["name", "Product name", 1], ["description", "Description", 0], ["image", "Image URL", 1], ["brand", "Brand", 0], ["sku", "SKU", 0], ["price", "Price", 1], ["priceCurrency", "Currency, e.g. EUR", 1], ["availability", "Availability", 0, ["InStock", "OutOfStock", "PreOrder"]], ["ratingValue", "Average rating", 0], ["reviewCount", "Number of reviews", 0]] },
    Event: { fields: [["name", "Event name", 1], ["startDate", "Start (YYYY-MM-DDTHH:MM)", 1], ["endDate", "End", 0], ["locationName", "Venue name", 1], ["addressLocality", "Town or city", 1], ["eventAttendanceMode", "Attendance", 0, ["OfflineEventAttendanceMode", "OnlineEventAttendanceMode", "MixedEventAttendanceMode"]], ["url", "Event URL", 0]] },
    FAQPage: { fields: [["faq", "Questions and answers: a question line, then its answer line, repeated", 1, "pairs"]] },
    BreadcrumbList: { fields: [["crumbs", "One crumb per line: name, URL", 1, "lines"]] }
  };
  function buildSchema(type, v) {
    const L = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const o = { "@context": "https://schema.org", "@type": type };
    const set = (k, val) => { if (val !== "" && val != null && !(Array.isArray(val) && !val.length)) o[k] = val; };
    const address = () => ({ "@type": "PostalAddress", streetAddress: v.streetAddress || undefined, addressLocality: v.addressLocality || undefined, postalCode: v.postalCode || undefined, addressCountry: v.addressCountry || undefined });
    if (type === "Organization") { ["name", "url", "logo", "email", "telephone"].forEach((k) => set(k, v[k])); set("sameAs", L(v.sameAs)); }
    if (type === "LocalBusiness" || type === "Hotel") {
      ["name", "url", "telephone", "priceRange", "checkinTime", "checkoutTime"].forEach((k) => set(k, v[k]));
      if (type === "LocalBusiness") set("openingHours", v.openingHours);
      o.address = JSON.parse(JSON.stringify(address()));
      if (v.starRating) o.starRating = { "@type": "Rating", ratingValue: v.starRating };
    }
    if (type === "Article") {
      ["headline", "datePublished", "dateModified", "image", "url"].forEach((k) => set(k, v[k]));
      if (v.author) o.author = { "@type": "Person", name: v.author };
      if (v.publisher) o.publisher = { "@type": "Organization", name: v.publisher };
    }
    if (type === "Product") {
      ["name", "description", "image", "sku"].forEach((k) => set(k, v[k]));
      if (v.brand) o.brand = { "@type": "Brand", name: v.brand };
      if (v.price) o.offers = { "@type": "Offer", price: v.price, priceCurrency: v.priceCurrency || undefined, availability: v.availability ? "https://schema.org/" + v.availability : undefined };
      if (v.ratingValue && v.reviewCount) o.aggregateRating = { "@type": "AggregateRating", ratingValue: v.ratingValue, reviewCount: v.reviewCount };
    }
    if (type === "Event") {
      ["name", "startDate", "endDate", "url"].forEach((k) => set(k, v[k]));
      if (v.eventAttendanceMode) o.eventAttendanceMode = "https://schema.org/" + v.eventAttendanceMode;
      o.location = { "@type": "Place", name: v.locationName || undefined, address: { "@type": "PostalAddress", addressLocality: v.addressLocality || undefined } };
    }
    if (type === "FAQPage") {
      const lines = L(v.faq), qs = [];
      for (let i = 0; i + 1 < lines.length; i += 2) qs.push({ "@type": "Question", name: lines[i], acceptedAnswer: { "@type": "Answer", text: lines[i + 1] } });
      o.mainEntity = qs;
    }
    if (type === "BreadcrumbList") {
      o.itemListElement = L(v.crumbs).map((line, i) => { const [name, url] = line.split(",").map((s) => (s || "").trim()); return { "@type": "ListItem", position: i + 1, name, item: url || undefined }; });
    }
    return JSON.parse(JSON.stringify(o));
  }
  function schema(config) {
    const root = document.getElementById(config.rootId);
    if (!root || !TK) return;
    const SAMPLE = { Hotel: { name: "Casa Alfama Boutique Hotel", url: "https://example.com", telephone: "+351 21 000 0000", streetAddress: "Rua de Exemplo 12", addressLocality: "Lisbon", addressCountry: "PT", starRating: "4", checkinTime: "15:00", checkoutTime: "11:00", priceRange: "€€€" } };
    root.innerHTML = `
      <label>Schema type <select data-k="type">${Object.keys(SCHEMAS).map((t) => `<option${t === "Hotel" ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <div class="tk-grid" data-k="fields"></div>
      <ul class="tk-list" data-k="warn"></ul>
      <h4>JSON-LD</h4><div class="tk-output" data-k="out"></div><div class="tk-row" data-k="actions"></div>`;
    let values = Object.assign({}, SAMPLE.Hotel), out = "";
    function renderFields() {
      const t = el(root, "type").value;
      el(root, "fields").innerHTML = SCHEMAS[t].fields.map(([k, l, req, kind]) => {
        if (Array.isArray(kind)) return `<label>${l}<select data-f="${k}"><option value=""></option>${kind.map((o) => `<option${values[k] === o ? " selected" : ""}>${o}</option>`).join("")}</select></label>`;
        if (kind === "lines" || kind === "pairs") return `<label style="grid-column:1/-1">${l}${req ? " *" : ""}<textarea rows="5" data-f="${k}">${TK.esc(values[k] || "")}</textarea></label>`;
        return `<label>${l}${req ? " *" : ""}<input type="text" data-f="${k}" value="${TK.esc(values[k] || "")}"></label>`;
      }).join("");
      el(root, "fields").querySelectorAll("[data-f]").forEach((i) => i.addEventListener("input", () => { values[i.dataset.f] = i.value; update(); }));
      update();
    }
    function update() {
      const t = el(root, "type").value;
      const missing = SCHEMAS[t].fields.filter(([k, , req]) => req && !String(values[k] || "").trim()).map(([, l]) => l);
      const warns = missing.map((m) => `Required for rich results: ${m}`);
      ["url", "logo", "image"].forEach((k) => { if (values[k] && !isUrl(values[k]) && SCHEMAS[t].fields.some((f) => f[0] === k)) warns.push(`${k} should be a full URL.`); });
      el(root, "warn").innerHTML = warns.map((w) => `<li class="tk-warn">${TK.esc(w)}</li>`).join("");
      out = `<script type="application/ld+json">\n${JSON.stringify(buildSchema(t, values), null, 2)}\n</` + `script>`;
      el(root, "out").textContent = out;
    }
    el(root, "type").addEventListener("change", () => { values = Object.assign({}, SAMPLE[el(root, "type").value] || {}); renderFields(); });
    el(root, "actions").appendChild(copyBtn("Copy JSON-LD", () => out));
    renderFields();
  }

  // ---------------- Canonical tags ----------------
  const TRACKING = /^(utm_\w+|gclid|gbraid|wbraid|fbclid|msclkid|dclid|mc_cid|mc_eid|_ga|_gl|ref|igshid|yclid)$/i;
  function canonical(config) {
    const root = document.getElementById(config.rootId);
    if (!root || !TK) return;
    root.innerHTML = `
      <label>URLs, one per line <textarea class="tk-mono" rows="6" data-k="in">https://Example.com/Rooms/?utm_source=newsletter&utm_medium=email
http://www.example.com/rooms
https://example.com/rooms/index.html#gallery
https://example.com/rooms?sort=price&gclid=abc123
https://example.com/offers/spring/?ref=partner</textarea></label>
      <div class="tk-grid">
        <label>Protocol <select data-k="proto"><option value="https">Force https</option><option value="keep">Keep</option></select></label>
        <label>www <select data-k="www"><option value="remove">Remove www</option><option value="add">Add www</option><option value="keep">Keep</option></select></label>
        <label>Trailing slash <select data-k="slash"><option value="remove">Remove</option><option value="add">Add</option><option value="keep">Keep</option></select></label>
        <label>Query string <select data-k="query"><option value="tracking">Strip tracking only</option><option value="all">Strip everything</option><option value="keep">Keep</option></select></label>
      </div>
      <div class="tk-row"><label class="tk-check-row"><input type="checkbox" data-k="lowerpath"> Lower-case the path</label><label class="tk-check-row"><input type="checkbox" data-k="index" checked> Drop index.html</label></div>
      <div class="tk-kpis" data-k="tiles"></div>
      <div class="tk-table-wrap"><table class="tk-table" data-k="table"></table></div>
      <h4>Canonical tags</h4><div class="tk-output" data-k="out"></div><div class="tk-row" data-k="actions"></div>`;
    let tags = "";
    function norm(raw) {
      const changes = [];
      if (!isUrl(raw)) return { error: "Not a full URL" };
      const u = new URL(raw);
      if (el(root, "proto").value === "https" && u.protocol !== "https:") { u.protocol = "https:"; changes.push("https"); }
      const hostLower = u.hostname.toLowerCase();
      if (hostLower !== u.hostname) changes.push("lower-case host");
      u.hostname = hostLower;
      const w = el(root, "www").value;
      if (w === "remove" && u.hostname.startsWith("www.")) { u.hostname = u.hostname.slice(4); changes.push("removed www"); }
      if (w === "add" && !u.hostname.startsWith("www.")) { u.hostname = "www." + u.hostname; changes.push("added www"); }
      if (u.hash) { u.hash = ""; changes.push("removed fragment"); }
      if (el(root, "index").checked && /\/index\.(html?|php)$/i.test(u.pathname)) { u.pathname = u.pathname.replace(/index\.(html?|php)$/i, ""); changes.push("dropped index file"); }
      if (el(root, "lowerpath").checked && u.pathname !== u.pathname.toLowerCase()) { u.pathname = u.pathname.toLowerCase(); changes.push("lower-case path"); }
      const q = el(root, "query").value;
      if (q === "all" && u.search) { u.search = ""; changes.push("removed query"); }
      if (q === "tracking") {
        const drop = Array.from(u.searchParams.keys()).filter((k) => TRACKING.test(k));
        drop.forEach((k) => u.searchParams.delete(k));
        if (drop.length) changes.push("removed " + drop.join(", "));
        u.searchParams.sort();
      }
      const s = el(root, "slash").value, last = u.pathname.split("/").pop();
      if (s === "remove" && u.pathname.length > 1 && u.pathname.endsWith("/")) { u.pathname = u.pathname.replace(/\/+$/, ""); changes.push("removed trailing slash"); }
      if (s === "add" && !u.pathname.endsWith("/") && !/\.\w+$/.test(last)) { u.pathname += "/"; changes.push("added trailing slash"); }
      let out = u.toString();
      if (u.pathname === "/" && !u.search && s === "remove") out = out.replace(/\/$/, "");
      return { url: out, changes };
    }
    function update() {
      const lines = el(root, "in").value.split("\n").map((l) => l.trim()).filter(Boolean);
      const rows = lines.map((l) => Object.assign({ raw: l }, norm(l)));
      const groups = d3.group(rows.filter((r) => r.url), (r) => r.url);
      el(root, "tiles").innerHTML = tiles([[lines.length, "URLs entered"], [groups.size, "Distinct canonical URLs"], [lines.length - groups.size - rows.filter((r) => r.error).length, "Duplicates merged"]]);
      el(root, "table").innerHTML = `<thead><tr><th>Entered</th><th>Canonical</th><th>Changes</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="tk-mono">${TK.esc(r.raw)}</td><td class="tk-mono">${r.error ? `<span class="tk-neg">${r.error}</span>` : TK.esc(r.url)}</td><td>${TK.esc((r.changes || []).join(", ") || "none")}</td></tr>`).join("")}</tbody>`;
      tags = Array.from(groups.keys()).map((u) => `<link rel="canonical" href="${TK.esc(u)}">`).join("\n");
      el(root, "out").textContent = tags;
    }
    root.querySelectorAll("input,select,textarea").forEach((i) => i.addEventListener("input", update));
    el(root, "actions").appendChild(copyBtn("Copy tags", () => tags));
    update();
  }

  // ---------------- Readability and headlines ----------------
  function syllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    if (w.length <= 3) return 1;
    const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
  }
  function readability(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    const SAMPLE = "Guests who book direct want answers before they pay. They check the price, the cancellation terms, and the check-in time. When the website answers those questions, most of them book. When it does not, they leave and compare three other hotels, and a large share of them never come back to the original site because the booking platforms that they found in the meantime had already shown every rate side by side and made the comparison easy for them. Show the full price on the first page. Put check-in times next to the room photos.";
    root.innerHTML = `
      <label>Headline <input type="text" data-k="head" value="How to win direct bookings from guests who compare every rate"></label>
      <div class="tk-grid"><label>Target keyword <input type="text" data-k="kw" value="direct bookings"></label></div>
      <div class="tk-kpis" data-k="htiles"></div>
      <ul class="tk-list" data-k="hchecks"></ul>
      <label>Body text <textarea rows="8" data-k="body">${SAMPLE}</textarea></label>
      <div class="tk-report">
        <h3 class="tk-report-title">Readability</h3>
        <div class="tk-kpis" data-k="tiles"></div>
        <h4>Words per sentence</h4><div class="tk-chart-box" data-k="chart"></div>
        <h4>Text with long sentences marked</h4><div class="rd-view" data-k="view"></div>
      </div>`;
    root.appendChild(TK.exportRow(root.querySelector(".tk-report"), "readability-report"));
    function sentencesOf(text) {
      return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter((s) => /\w/.test(s));
    }
    function update() {
      const text = el(root, "body").value;
      const sents = sentencesOf(text);
      const words = (text.match(/[A-Za-zÀ-ɏ'’-]+/g) || []);
      const syl = d3.sum(words, syllables);
      const W = words.length || 1, S = sents.length || 1;
      const fre = 206.835 - 1.015 * (W / S) - 84.6 * (syl / W);
      const fk = 0.39 * (W / S) + 11.8 * (syl / W) - 15.59;
      const lens = sents.map((s) => (s.match(/[A-Za-zÀ-ɏ'’-]+/g) || []).length);
      const long = lens.filter((n) => n > 25).length;
      const passive = (text.match(/\b(am|is|are|was|were|be|been|being)\s+(\w+ly\s+)?\w+(ed|en)\b/gi) || []).length;
      const band = fre >= 70 ? "Easy" : fre >= 60 ? "Plain English" : fre >= 50 ? "Fairly difficult" : fre >= 30 ? "Difficult" : "Very difficult";
      el(root, "tiles").innerHTML = tiles([[TK.fmt(fre, 0), `Flesch reading ease, ${band}`, fre >= 60 ? "tk-pos" : "tk-neg"], [TK.fmt(fk, 1), "Flesch-Kincaid grade"],
        [TK.fmt(W / S, 1), "Words per sentence"], [`${long} of ${sents.length}`, "Sentences over 25 words", long ? "tk-neg" : "tk-pos"], [String(passive), "Possible passive phrases"], [TK.fmtInt(words.length), "Words"]]);
      const box = el(root, "chart");
      box.innerHTML = "";
      if (lens.length) {
        const Wd = 760, H = 200, M = { l: 40, r: 10, t: 10, b: 26 };
        const svg = TK.svg(box, Wd, H, "Bar chart of words in each sentence");
        const x = d3.scaleBand().domain(d3.range(lens.length)).range([M.l, Wd - M.r]).padding(0.15);
        const y = d3.scaleLinear().domain([0, Math.max(30, d3.max(lens))]).nice().range([H - M.b, M.t]);
        TK.axisStyle(svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(4)));
        svg.append("line").attr("x1", M.l).attr("x2", Wd - M.r).attr("y1", y(25)).attr("y2", y(25)).attr("stroke", TK.BAD).attr("stroke-dasharray", "4 3");
        svg.append("text").attr("x", Wd - M.r).attr("y", y(25) - 4).attr("text-anchor", "end").attr("font-size", 10).attr("fill", TK.BAD).text("25 words");
        lens.forEach((n, i) => svg.append("rect").attr("x", x(i)).attr("y", y(n)).attr("width", x.bandwidth()).attr("height", y(0) - y(n)).attr("fill", n > 25 ? TK.BAD : TK.PALETTE[0])
          .append("title").text(`Sentence ${i + 1}: ${n} words`));
        svg.append("text").attr("x", (M.l + Wd) / 2).attr("y", H - 6).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", TK.MUTED).text("Sentences in order");
      }
      el(root, "view").innerHTML = sents.map((s, i) => `<span class="${lens[i] > 25 ? "rd-long" : ""}">${TK.esc(s)}</span>`).join(" ");
      const h = el(root, "head").value.trim(), kw = el(root, "kw").value.trim().toLowerCase();
      const hw = h.split(/\s+/).filter(Boolean);
      const px = textWidth(h, "20px Arial");
      const kwPos = kw ? h.toLowerCase().indexOf(kw) : -1;
      el(root, "htiles").innerHTML = tiles([[`${h.length}`, "Headline characters"], [`${hw.length}`, "Headline words"], [`${Math.round(px)} px`, "Width in search results, limit about 600", px <= 600 ? "tk-pos" : "tk-neg"]]);
      const checks = [
        [px <= 600, px <= 600 ? "Fits a search result title without truncation." : "Likely truncated in search results. Shorten or move key words forward."],
        [hw.length >= 5 && hw.length <= 14, hw.length < 5 ? "Short. It may not say enough to earn the click." : hw.length > 14 ? "Long. Cut words that do not change the meaning." : "Word count in a readable range."],
        [!kw || kwPos >= 0, !kw ? "Add a target keyword to check its position." : kwPos < 0 ? "The keyword does not appear in the headline." : kwPos <= 30 ? "The keyword appears early, where readers and search engines weight it most." : "The keyword appears late. Consider moving it forward."],
        [true, /\d/.test(h) ? "Contains a number, which sets a specific expectation." : "No number. A specific figure can sharpen the promise where one fits."],
        [true, /^[^a-z]*[A-Z][^A-Z]*$/.test(h.replace(/\b[A-Z]{2,}\b/g, "")) ? "Sentence case." : "Title case or mixed case. Pick one style and use it across the site."]];
      el(root, "hchecks").innerHTML = checks.map(([ok, t]) => `<li><span class="tk-badge ${ok ? "pass" : "fail"}">${ok ? "OK" : "Check"}</span> ${t}</li>`).join("");
    }
    root.querySelectorAll("input,textarea").forEach((i) => i.addEventListener("input", update));
    update();
  }

  // ---------------- Robots.txt and sitemap ----------------
  const AI_BOTS = [
    ["GPTBot", "OpenAI, model training", "train"], ["ClaudeBot", "Anthropic, model training", "train"], ["Google-Extended", "Google, Gemini training (a control token, not a crawler)", "train"],
    ["CCBot", "Common Crawl, open dataset used for training", "train"], ["Applebot-Extended", "Apple, model training", "train"], ["Meta-ExternalAgent", "Meta, model training", "train"], ["Bytespider", "ByteDance, model training", "train"],
    ["OAI-SearchBot", "OpenAI, search answers", "answer"], ["Claude-SearchBot", "Anthropic, search answers", "answer"], ["PerplexityBot", "Perplexity, search answers", "answer"]];
  function robots(config) {
    const root = document.getElementById(config.rootId);
    if (!root || !TK) return;
    root.innerHTML = `
      <div class="tk-split">
        <div class="tk-panel"><h3>robots.txt</h3>
          <label>Sitemap URL <input type="text" data-k="sitemap" value="https://example.com/sitemap.xml"></label>
          <label>Paths to keep out of search, one per line <textarea class="tk-mono" rows="4" data-k="disallow">/admin/
/checkout/
/search?</textarea></label>
          <p class="tk-help">AI crawlers. Blocking training crawlers keeps your pages out of future model training. Blocking answer crawlers also removes your pages from AI search answers, which lowers visibility.</p>
          ${AI_BOTS.map(([b, d]) => `<label class="tk-check-row"><input type="checkbox" data-bot="${b}"> <strong>${b}</strong> <span class="tk-help">${d}</span></label>`).join("")}
        </div>
        <div class="tk-panel"><h3>sitemap.xml</h3>
          <label>URLs, one per line, optionally followed by a comma and a last-modified date <textarea class="tk-mono" rows="8" data-k="urls">https://example.com/,2026-09-20
https://example.com/rooms/,2026-09-01
https://example.com/offers/spring/
https://example.com/contact/</textarea></label>
          <div class="tk-grid"><label>Default change frequency <select data-k="freq"><option value="">Leave out</option><option>daily</option><option>weekly</option><option selected>monthly</option><option>yearly</option></select></label></div>
        </div>
      </div>
      <h4>robots.txt</h4><div class="tk-output" data-k="robots"></div><div class="tk-row" data-k="ra"></div>
      <h4>sitemap.xml</h4><ul class="tk-list" data-k="warn"></ul><div class="tk-output" data-k="xml"></div><div class="tk-row" data-k="sa"></div>`;
    let rtxt = "", xml = "";
    function update() {
      const dis = el(root, "disallow").value.split("\n").map((s) => s.trim()).filter(Boolean);
      const bots = Array.from(root.querySelectorAll("[data-bot]:checked")).map((c) => c.dataset.bot);
      const lines = ["User-agent: *"].concat(dis.length ? dis.map((d) => "Disallow: " + d) : ["Disallow:"]);
      bots.forEach((b) => lines.push("", "User-agent: " + b, "Disallow: /"));
      if (el(root, "sitemap").value.trim()) lines.push("", "Sitemap: " + el(root, "sitemap").value.trim());
      rtxt = lines.join("\n") + "\n";
      el(root, "robots").textContent = rtxt;
      const xmlEsc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
      const rows = el(root, "urls").value.split("\n").map((s) => s.trim()).filter(Boolean).map((l) => l.split(",").map((x) => x.trim()));
      const warns = [];
      const bad = rows.filter((r) => !isUrl(r[0]));
      if (bad.length) warns.push(`${bad.length} line${bad.length > 1 ? "s are" : " is"} not a full URL and ${bad.length > 1 ? "were" : "was"} left out.`);
      const good = rows.filter((r) => isUrl(r[0]));
      const hosts = new Set(good.map((r) => new URL(r[0]).host));
      if (hosts.size > 1) warns.push("URLs come from more than one host. A sitemap should list one host only.");
      if (good.length > 50000) warns.push("A sitemap holds at most 50,000 URLs. Split it and use a sitemap index.");
      const freq = el(root, "freq").value;
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        good.map((r) => `  <url>\n    <loc>${xmlEsc(r[0])}</loc>\n${r[1] && /^\d{4}-\d{2}-\d{2}/.test(r[1]) ? `    <lastmod>${r[1]}</lastmod>\n` : ""}${freq ? `    <changefreq>${freq}</changefreq>\n` : ""}  </url>`).join("\n") + "\n</urlset>\n";
      el(root, "xml").textContent = xml;
      el(root, "warn").innerHTML = warns.map((w) => `<li class="tk-warn">${w}</li>`).join("");
    }
    root.querySelectorAll("input,textarea,select").forEach((i) => i.addEventListener("input", update));
    root.querySelectorAll("[data-bot]").forEach((i) => i.addEventListener("change", update));
    el(root, "ra").append(copyBtn("Copy robots.txt", () => rtxt));
    const d1 = document.createElement("button"); d1.type = "button"; d1.className = "toolkit-btn secondary"; d1.textContent = "Download robots.txt";
    d1.addEventListener("click", () => TK.downloadText(rtxt, "robots.txt")); el(root, "ra").append(d1);
    el(root, "sa").append(copyBtn("Copy sitemap", () => xml));
    const d2 = document.createElement("button"); d2.type = "button"; d2.className = "toolkit-btn secondary"; d2.textContent = "Download sitemap.xml";
    d2.addEventListener("click", () => TK.downloadText(xml, "sitemap.xml", "application/xml")); el(root, "sa").append(d2);
    update();
  }

  // ---------------- Colour contrast ----------------
  function hexToRgb(h) {
    let s = String(h || "").trim().replace(/^#/, "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(s)) return null;
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  }
  function luminance(rgb) {
    const c = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function contrast(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    root.innerHTML = `
      <div class="tk-grid">
        <label>Text colour <span class="cc-pair"><input type="color" data-k="fgc" value="#6b6b6b"><input type="text" data-k="fg" value="#6b6b6b"></span></label>
        <label>Background colour <span class="cc-pair"><input type="color" data-k="bgc" value="#f7f7f6"><input type="text" data-k="bg" value="#f7f7f6"></span></label>
      </div>
      <div class="cc-preview" data-k="preview"><p class="cc-normal">Normal text at 16 px. Book direct for the best rate.</p><p class="cc-large">Large text at 24 px</p></div>
      <div class="tk-kpis" data-k="tiles"></div>
      <p data-k="suggest"></p>
      <details class="tk-details" open><summary>Check a whole palette</summary>
        <p class="tk-help">Colours as hex codes, separated by commas or new lines. Every pair is checked for normal text (4.5:1).</p>
        <input type="text" data-k="palette" value="#111111, #ffffff, #6b6b6b, #2a78d6, #eb6834, #1baf7a, #eda100">
        <div class="tk-chart-box" data-k="grid"></div>
      </details>`;
    function sync(from, to) { el(root, to).value = el(root, from).value; update(); }
    ["fg", "bg"].forEach((k) => {
      el(root, k + "c").addEventListener("input", () => sync(k + "c", k));
      el(root, k).addEventListener("input", () => { if (hexToRgb(el(root, k).value)) el(root, k + "c").value = "#" + el(root, k).value.replace("#", "").padEnd(6, "0").slice(0, 6); update(); });
    });
    el(root, "palette").addEventListener("input", drawGrid);
    function suggest(fg, bg, target) {
      const c = d3.hsl(d3.rgb(fg[0], fg[1], fg[2]));
      const dir = luminance(bg) > 0.18 ? -1 : 1;
      for (let i = 0; i <= 100; i++) {
        const t = d3.hsl(c.h, c.s, Math.min(1, Math.max(0, c.l + dir * i / 100))).rgb();
        const rgb = [t.r, t.g, t.b].map(Math.round);
        if (ratio(rgb, bg) >= target) return d3.rgb(rgb[0], rgb[1], rgb[2]).formatHex();
      }
      return null;
    }
    function update() {
      const fg = hexToRgb(el(root, "fg").value), bg = hexToRgb(el(root, "bg").value);
      if (!fg || !bg) { el(root, "tiles").innerHTML = `<p class="tk-warn">Enter both colours as hex codes, such as #111111.</p>`; return; }
      const r = ratio(fg, bg);
      const pv = el(root, "preview");
      pv.style.color = el(root, "fgc").value;
      pv.style.background = el(root, "bgc").value;
      const pf = (ok) => (ok ? "tk-pos" : "tk-neg");
      el(root, "tiles").innerHTML = tiles([[TK.fmt(r, 2) + ":1", "Contrast ratio"], [r >= 4.5 ? "Pass" : "Fail", "AA normal text (4.5:1)", pf(r >= 4.5)], [r >= 3 ? "Pass" : "Fail", "AA large text (3:1)", pf(r >= 3)],
        [r >= 7 ? "Pass" : "Fail", "AAA normal text (7:1)", pf(r >= 7)], [r >= 4.5 ? "Pass" : "Fail", "AAA large text (4.5:1)", pf(r >= 4.5)], [r >= 3 ? "Pass" : "Fail", "Interface parts and graphics (3:1)", pf(r >= 3)]]);
      const s = r < 4.5 ? suggest(fg, bg, 4.5) : null;
      el(root, "suggest").innerHTML = s ? `Nearest text colour that passes AA on this background: <strong class="tk-mono">${s}</strong> <span class="cc-swatch" style="background:${s}"></span> <button type="button" class="toolkit-btn secondary" data-use="${s}">Use it</button>` : r >= 4.5 ? "This pair passes AA for normal text." : "";
      const use = root.querySelector("[data-use]");
      if (use) use.addEventListener("click", () => { el(root, "fg").value = use.dataset.use; el(root, "fgc").value = use.dataset.use; update(); });
    }
    function drawGrid() {
      const cols = el(root, "palette").value.split(/[\s,]+/).map((s) => s.trim()).filter((s) => hexToRgb(s)).slice(0, 12);
      const box = el(root, "grid");
      box.innerHTML = "";
      if (cols.length < 2) return;
      const cell = 64, M = 70, W = M + cols.length * cell + 10, H = M + cols.length * cell + 10;
      const svg = TK.svg(box, W, H, "Contrast ratio for every pair of palette colours");
      cols.forEach((c, i) => {
        svg.append("rect").attr("x", M + i * cell + 16).attr("y", 18).attr("width", 32).attr("height", 18).attr("fill", c).attr("stroke", TK.BORDER);
        svg.append("text").attr("x", M + i * cell + 32).attr("y", 52).attr("text-anchor", "middle").attr("font-size", 9).attr("fill", TK.MUTED).text(c);
        svg.append("rect").attr("x", 8).attr("y", M + i * cell + 16).attr("width", 18).attr("height", 32).attr("fill", c).attr("stroke", TK.BORDER);
        svg.append("text").attr("x", 30).attr("y", M + i * cell + 36).attr("font-size", 9).attr("fill", TK.MUTED).text(c);
        cols.forEach((d, j) => {
          const r = ratio(hexToRgb(c), hexToRgb(d));
          const g = svg.append("g").attr("transform", `translate(${M + j * cell},${M + i * cell})`);
          g.append("rect").attr("width", cell - 4).attr("height", cell - 4).attr("fill", d).attr("stroke", r >= 4.5 ? TK.GOOD : r >= 3 ? "#eda100" : TK.BAD).attr("stroke-width", i === j ? 0 : 3);
          if (i !== j) g.append("text").attr("x", (cell - 4) / 2).attr("y", (cell - 4) / 2 + 4).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", c).text(TK.fmt(r, 1));
        });
      });
    }
    update();
    drawGrid();
  }

  // ---------------- Hashtag and character counter ----------------
  const PLATFORMS = [["X", 280], ["Bluesky", 300], ["Threads", 500], ["Pinterest description", 500], ["Instagram caption", 2200], ["LinkedIn post", 3000], ["TikTok caption", 4000], ["YouTube description", 5000], ["Facebook post", 63206]];
  function counter(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    root.innerHTML = `
      <label>Post text <textarea rows="7" data-k="text">Know everything before you book. All-in prices, Wi-Fi speeds, and check-in times on the first page. Members save 8% on stays in Lisbon, Porto, and Munich. https://example.com/members #businesstravel #hotels #Lisbon #BookDirect @flairmi</textarea></label>
      <div class="tk-kpis" data-k="tiles"></div>
      <h4>Length against platform limits</h4>
      <div class="tk-chart-box" data-k="chart"></div>
      <p class="tk-help">Limits are the published maximums as of September 2026. Platforms change them, so check the platform's help page before a large campaign. X counts every link as 23 characters, and that rule is applied to the X bar.</p>
      <h4>Hashtags</h4><div data-k="tags"></div>`;
    const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
    function update() {
      const t = el(root, "text").value;
      const chars = seg ? Array.from(seg.segment(t)).length : Array.from(t).length;
      const urls = t.match(/https?:\/\/\S+/g) || [];
      const tags = t.match(/#[\p{L}\p{N}_]+/gu) || [];
      const mentions = t.match(/(^|\s)@[\w.]+/g) || [];
      const words = t.split(/\s+/).filter(Boolean).length;
      const xLen = chars - d3.sum(urls, (u) => (seg ? Array.from(seg.segment(u)).length : u.length)) + urls.length * 23;
      el(root, "tiles").innerHTML = tiles([[TK.fmtInt(chars), "Characters"], [TK.fmtInt(xLen), "Characters as X counts them"], [TK.fmtInt(words), "Words"], [tags.length, "Hashtags"], [mentions.length, "Mentions"], [urls.length, "Links"]]);
      const rows = PLATFORMS.map(([p, lim]) => ({ p, lim, n: p === "X" ? xLen : chars }));
      const box = el(root, "chart");
      box.innerHTML = "";
      const W = 760, H = 30 + rows.length * 28, M = { l: 160, r: 110, t: 6, b: 10 };
      const svg = TK.svg(box, W, H, "Share of each platform's character limit used by this post");
      const x = d3.scaleLinear().domain([0, 1]).range([M.l, W - M.r]).clamp(true);
      rows.forEach((r, i) => {
        const y = M.t + i * 28, share = r.n / r.lim;
        svg.append("text").attr("x", M.l - 8).attr("y", y + 16).attr("text-anchor", "end").attr("font-size", 12).text(r.p);
        svg.append("rect").attr("x", M.l).attr("y", y + 4).attr("width", W - M.r - M.l).attr("height", 16).attr("fill", "#f0f0f0");
        svg.append("rect").attr("x", M.l).attr("y", y + 4).attr("width", Math.max(1, x(share) - M.l)).attr("height", 16).attr("fill", share > 1 ? TK.BAD : share > 0.9 ? "#eda100" : TK.PALETTE[0]);
        svg.append("text").attr("x", W - M.r + 8).attr("y", y + 16).attr("font-size", 11).attr("fill", share > 1 ? TK.BAD : TK.MUTED).text(`${TK.fmtInt(r.n)} / ${TK.fmtInt(r.lim)}${share > 1 ? " over" : ""}`);
      });
      const counts = d3.rollups(tags.map((s) => s.toLowerCase()), (v) => v.length, (d) => d);
      const dup = counts.filter((c) => c[1] > 1);
      el(root, "tags").innerHTML = tags.length ? `<p>${tags.map((s) => `<span class="tk-badge">${TK.esc(s)}</span>`).join(" ")}</p>${dup.length ? `<p class="tk-warn">Repeated: ${dup.map((d) => TK.esc(d[0])).join(", ")}</p>` : ""}${tags.some((s) => /[A-Z]/.test(s.slice(1)) && /[a-z]/.test(s)) ? "" : `<p class="tk-help">Capitalising each word in a multi-word hashtag, such as #BookDirect, makes it readable for screen readers.</p>`}` : `<p class="tk-help">No hashtags found.</p>`;
    }
    el(root, "text").addEventListener("input", update);
    update();
  }

  // ---------------- A/B test ----------------
  function abtest(config) {
    const root = document.getElementById(config.rootId);
    if (!root || typeof d3 === "undefined" || !TK) return;
    root.innerHTML = `
      <div class="tk-split">
        <div class="tk-panel"><h3>Sample size before the test</h3>
          <div class="tk-grid">
            <label>Baseline conversion rate (%) <input type="number" step="0.1" min="0.01" max="99" data-k="p1" value="3.2"></label>
            <label>Smallest lift worth detecting (% relative) <input type="number" step="1" min="1" data-k="mde" value="15"></label>
            <label>Significance level <select data-k="alpha"><option value="0.1">90% confidence</option><option value="0.05" selected>95% confidence</option><option value="0.01">99% confidence</option></select></label>
            <label>Power <select data-k="power"><option value="0.8" selected>80%</option><option value="0.9">90%</option></select></label>
            <label>Visitors per day, all variants <input type="number" min="1" data-k="traffic" value="2400"></label>
            <label>Variants including control <input type="number" min="2" max="10" data-k="variants" value="2"></label>
          </div>
          <div class="tk-kpis" data-k="ss"></div>
        </div>
        <div class="tk-panel"><h3>Significance after the test</h3>
          <div class="tk-grid">
            <label>Control visitors <input type="number" min="1" data-k="na" value="15400"></label>
            <label>Control conversions <input type="number" min="0" data-k="ca" value="492"></label>
            <label>Variant visitors <input type="number" min="1" data-k="nb" value="15250"></label>
            <label>Variant conversions <input type="number" min="0" data-k="cb" value="571"></label>
          </div>
          <div class="tk-kpis" data-k="sig"></div>
          <p data-k="verdict"></p>
        </div>
      </div>
      <div class="tk-report"><h3 class="tk-report-title">Conversion rates with 95% confidence intervals</h3><div class="tk-chart-box" data-k="chart"></div></div>`;
    root.appendChild(TK.exportRow(root.querySelector(".tk-report"), "ab-test-result"));
    function update() {
      const v = (k) => TK.num(el(root, k).value);
      const p1 = v("p1") / 100, p2 = p1 * (1 + v("mde") / 100), a = v("alpha"), pw = v("power");
      const za = TK.normInv(1 - a / 2), zb = TK.normInv(pw), pbar = (p1 + p2) / 2;
      const n = Math.ceil(Math.pow(za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2));
      const days = Math.ceil((n * v("variants")) / v("traffic"));
      el(root, "ss").innerHTML = tiles([[Number.isFinite(n) ? TK.fmtInt(n) : "n/a", "Visitors per variant"], [Number.isFinite(n) ? TK.fmtInt(n * v("variants")) : "n/a", "Visitors in total"],
        [Number.isFinite(days) ? `${days} day${days === 1 ? "" : "s"}` : "n/a", "Run time at this traffic"], [TK.fmtPct(p2, 2), "Variant rate you can detect"]]);
      const na = v("na"), ca = v("ca"), nb = v("nb"), cb = v("cb");
      const ra = ca / na, rb = cb / nb, pool = (ca + cb) / (na + nb);
      const z = (rb - ra) / Math.sqrt(pool * (1 - pool) * (1 / na + 1 / nb));
      const p = 2 * (1 - TK.normCdf(Math.abs(z)));
      const se = Math.sqrt(ra * (1 - ra) / na + rb * (1 - rb) / nb);
      const lo = rb - ra - 1.96 * se, hi = rb - ra + 1.96 * se;
      const alpha = v("alpha");
      el(root, "sig").innerHTML = tiles([[TK.fmtPct(ra, 2), "Control rate"], [TK.fmtPct(rb, 2), "Variant rate"], [(rb >= ra ? "+" : "") + TK.fmtPct((rb - ra) / ra, 1), "Relative lift"],
        [p < 0.0001 ? "< 0.0001" : TK.fmt(p, 4), "p-value, two-sided", p < alpha ? "tk-pos" : ""], [`${TK.fmt(lo * 100, 2)} to ${TK.fmt(hi * 100, 2)} pts`, "95% interval for the difference"]]);
      const powered = Math.min(na, nb) >= n;
      el(root, "verdict").innerHTML = !(na > 0 && nb > 0) ? "" : p < alpha
        ? `<strong>Significant at the ${TK.fmtPct(1 - alpha, 0)} level.</strong> The variant ${rb > ra ? "converts better" : "converts worse"} than control, and the interval for the difference ${lo > 0 || hi < 0 ? "excludes zero" : "is wide"}.${powered ? "" : " Each group is below the planned sample size, so treat the size of the lift with caution."}`
        : `<strong>Not significant at the ${TK.fmtPct(1 - alpha, 0)} level.</strong> The data are consistent with no difference.${powered ? " The test reached its planned size, so a lift this small is unlikely to matter." : " Each group is below the planned sample size, so the test may be too small to detect the lift you care about."}`;
      drawCI([{ name: "Control", r: ra, n: na, c: TK.PALETTE[0] }, { name: "Variant", r: rb, n: nb, c: TK.PALETTE[1] }]);
    }
    function drawCI(groups) {
      const box = el(root, "chart");
      box.innerHTML = "";
      const g = groups.filter((x) => Number.isFinite(x.r));
      if (!g.length) return;
      g.forEach((x) => { const se = Math.sqrt(x.r * (1 - x.r) / x.n); x.lo = x.r - 1.96 * se; x.hi = x.r + 1.96 * se; });
      const W = 760, H = 170, M = { l: 90, r: 30, t: 20, b: 34 };
      const svg = TK.svg(box, W, H, "Conversion rate and confidence interval for control and variant");
      const x = d3.scaleLinear().domain([Math.max(0, d3.min(g, (d) => d.lo) * 0.9), d3.max(g, (d) => d.hi) * 1.1]).range([M.l, W - M.r]);
      const y = d3.scaleBand().domain(g.map((d) => d.name)).range([M.t, H - M.b]).padding(0.4);
      TK.axisStyle(svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(6).tickFormat((d) => TK.fmt(d * 100, 1) + "%")));
      g.forEach((d) => {
        const cy = y(d.name) + y.bandwidth() / 2;
        svg.append("text").attr("x", M.l - 10).attr("y", cy + 4).attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 700).text(d.name);
        svg.append("line").attr("x1", x(d.lo)).attr("x2", x(d.hi)).attr("y1", cy).attr("y2", cy).attr("stroke", d.c).attr("stroke-width", 4);
        [d.lo, d.hi].forEach((v) => svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", cy - 8).attr("y2", cy + 8).attr("stroke", d.c).attr("stroke-width", 2));
        svg.append("circle").attr("cx", x(d.r)).attr("cy", cy).attr("r", 7).attr("fill", "#fff").attr("stroke", d.c).attr("stroke-width", 3);
        svg.append("text").attr("x", x(d.hi) + 8).attr("y", cy + 4).attr("font-size", 11).attr("fill", TK.MUTED).text(`${TK.fmtPct(d.r, 2)} (${TK.fmtPct(d.lo, 2)} to ${TK.fmtPct(d.hi, 2)})`);
      });
    }
    root.querySelectorAll("input,select").forEach((i) => i.addEventListener("input", update));
    update();
  }

  window.Execution = { utm, meta, schema, canonical, readability, robots, contrast, counter, abtest };
})();
