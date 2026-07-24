// js/app.js
// StatChooser. Renders the decision tree from data/decisions.json,
// or from window.STATCHOOSER_DATA when the data is inlined.

(function () {
  "use strict";

  var DATA = null;
  var path = []; // array of option indices from the start node
  var root = document.getElementById("app");
  var STAGES = ["Goal", "Design", "Data", "Result"];

  // ---------- related projects ----------
  // StatChooser is one of three connected, free, open projects. The block
  // below cross-links all three so a visitor to any one can find the others.
  // There are no paid offers: visibility and cross-referencing are the goal.
  var RELATED = [
    {
      name: "surveyframe",
      tag: "R package, runs the analysis",
      blurb:
        "Every recommendation here carries a method ID that drops straight into run_analysis_plan(). Install it from CRAN and the chosen test runs with no further mapping.",
      url: "https://CRAN.R-project.org/package=surveyframe",
      cta: "View on CRAN",
    },
    {
      name: "Quantitative Analysis with Small Samples",
      tag: "Open textbook, the method behind the advice",
      blurb:
        "The free textbook these recommendations are built on. It covers when each method holds up under a small n, the exact and resampling alternatives, effect sizes, and how to report them.",
      url: "https://doi.org/10.5281/zenodo.20221929",
      cta: "Read the book",
    },
    {
      name: "StatChooser",
      tag: "This advisor, open source",
      blurb:
        "The interactive test advisor you are using now. Browse or reuse the source, file an issue, or share a result permalink to point someone straight to the right test.",
      url: "https://github.com/MohammedAliSharafuddin/statchooser",
      cta: "Open the repository",
    },
  ];

  // ---------- boot ----------

  function boot(data) {
    DATA = data;
    var m = window.location.search.match(/[?&]p=([\d.]+)/);
    if (m) {
      path = m[1].split(".").map(Number).filter(function (n) { return !isNaN(n); });
      path = validPrefix(path);
    }
    render();
  }

  if (window.STATCHOOSER_DATA) {
    boot(window.STATCHOOSER_DATA);
  } else {
    fetch("data/decisions.json")
      .then(function (r) { return r.json(); })
      .then(boot)
      .catch(function () {
        root.innerHTML =
          '<div class="card"><h2>The decision data did not load</h2>' +
          "<p>Reload the page. If the problem persists, open data/decisions.json directly to check that it is reachable.</p></div>";
      });
  }

  // ---------- tree walking ----------

  function nodeAt(p) {
    var id = DATA.start;
    for (var i = 0; i < p.length; i++) {
      var node = DATA.nodes[id];
      if (!node || node.type !== "question") return null;
      var opt = node.options[p[i]];
      if (!opt) return null;
      id = opt.next;
    }
    return DATA.nodes[id] ? { id: id, node: DATA.nodes[id] } : null;
  }

  function validPrefix(p) {
    var ok = [];
    for (var i = 0; i < p.length; i++) {
      var probe = ok.concat([p[i]]);
      if (nodeAt(probe)) ok = probe; else break;
    }
    return ok;
  }

  function trail() {
    var segs = [];
    var id = DATA.start;
    for (var i = 0; i < path.length; i++) {
      var node = DATA.nodes[id];
      var opt = node.options[path[i]];
      segs.push({ token: opt.token, upto: i });
      id = opt.next;
    }
    return segs;
  }

  function permalink() {
    var base = window.location.origin + window.location.pathname;
    return path.length ? base + "?p=" + path.join(".") : base;
  }

  function syncUrl() {
    var q = path.length ? "?p=" + path.join(".") : "";
    try { history.replaceState(null, "", window.location.pathname + q); } catch (e) {}
  }

  // ---------- rendering ----------

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    syncUrl();
    var cur = nodeAt(path);
    root.innerHTML = "";
    root.appendChild(renderStages(cur));
    root.appendChild(renderRecord());
    if (!cur) { path = []; cur = nodeAt(path); }
    if (cur.node.type === "question") root.appendChild(renderQuestion(cur.node));
    else renderResult(cur.node);
    window.scrollTo({ top: 0 });
  }

  function renderStages(cur) {
    var bar = el("div", "stages");
    var nowStage = cur && cur.node.type === "result" ? "Result" : (cur ? cur.node.stage : "Goal");
    var nowIdx = STAGES.indexOf(nowStage);
    STAGES.forEach(function (s, i) {
      var sp = el("span", i < nowIdx ? "done" : i === nowIdx ? "now" : "", s);
      bar.appendChild(sp);
    });
    return bar;
  }

  function renderRecord() {
    var rec = el("div", "record");
    rec.setAttribute("aria-label", "Decision record");
    var segs = trail();
    if (!segs.length) {
      rec.appendChild(el("span", "hint", "# your decision record builds here"));
      return rec;
    }
    segs.forEach(function (s, i) {
      if (i > 0) rec.appendChild(el("span", "sep", "\u25B8"));
      var b = el("button", "seg", s.token);
      b.title = "Go back to this step";
      b.addEventListener("click", function () {
        path = path.slice(0, s.upto);
        render();
      });
      rec.appendChild(b);
    });
    return rec;
  }

  function renderQuestion(node) {
    var card = el("div", "card");
    card.appendChild(el("h2", null, node.question));
    if (node.help) card.appendChild(el("p", "help", node.help));
    var opts = el("div", "opts");
    node.options.forEach(function (opt, i) {
      var b = el("button", "opt");
      b.appendChild(document.createTextNode(opt.label));
      if (opt.sub) b.appendChild(el("span", "sub", opt.sub));
      b.addEventListener("click", function () {
        path.push(i);
        render();
      });
      opts.appendChild(b);
    });
    card.appendChild(opts);
    if (path.length) {
      var row = el("div", "backrow");
      var back = el("button", "linklike", "Back");
      back.addEventListener("click", function () { path.pop(); render(); });
      row.appendChild(back);
      row.appendChild(document.createTextNode("  \u00B7  "));
      var again = el("button", "linklike", "Start again");
      again.addEventListener("click", function () { path = []; render(); });
      row.appendChild(again);
      card.appendChild(row);
    }
    return card;
  }

  // ---------- result ----------

  function renderResult(t) {
    var card = el("div", "card");

    var v = el("div", "verdict");
    v.appendChild(el("div", "eyebrow", "Recommended"));
    v.appendChild(el("h2", null, t.name));
    if (t.surveyframe_id) {
      var tok = el("span", "token mono");
      tok.textContent = 'method = "' + t.surveyframe_id + '"';
      tok.title = "surveyframe method ID, runs in run_analysis_plan()";
      v.appendChild(tok);
    }
    v.appendChild(el("p", null, t.verdict));
    card.appendChild(v);

    // beginner example, always visible
    if (t.example) {
      var exBox = el("div", "example");
      exBox.appendChild(el("span", "example-label", "For example"));
      exBox.appendChild(el("span", "example-text", t.example));
      card.appendChild(exBox);
    }

    // tabs
    var tabNames = ["Assumptions", "Small sample", "R code", "JASP", "Report"];
    if (t.skeleton) tabNames.splice(3, 0, "Sample survey skeleton");
    if (t.survey) tabNames.splice(4, 0, "Preview");
    var tabs = el("div", "tabs");
    var pane = el("div", "pane");
    var current = 0;

    function showPane(i) {
      current = i;
      Array.prototype.forEach.call(tabs.children, function (b, j) {
        b.className = "tab" + (j === i ? " on" : "");
      });
      pane.innerHTML = "";
      var name = tabNames[i];
      if (name === "Assumptions") paneAssumptions(pane, t);
      if (name === "Small sample") paneSmallSample(pane, t);
      if (name === "R code") paneR(pane, t);
      if (name === "Sample survey skeleton") paneSkeleton(pane, t);
      if (name === "Preview") panePreview(pane, t);
      if (name === "JASP") paneJasp(pane, t);
      if (name === "Report") paneReport(pane, t);
    }

    tabNames.forEach(function (n, i) {
      var b = el("button", "tab", n);
      b.addEventListener("click", function () { showPane(i); });
      tabs.appendChild(b);
    });
    card.appendChild(tabs);
    card.appendChild(pane);
    showPane(0);

    // alternative
    if (t.alternative && t.alternative.label) {
      var alt = el("p", "note");
      alt.appendChild(document.createTextNode("Alternative: "));
      if (t.alternative.node && DATA.nodes[t.alternative.node]) {
        var a = el("button", "linklike", t.alternative.label);
        a.addEventListener("click", function () {
          renderDirect(t.alternative.node);
        });
        alt.appendChild(a);
      } else {
        alt.appendChild(document.createTextNode(t.alternative.label));
      }
      pane.parentNode.insertBefore(alt, null);
      card.appendChild(alt);
    }

    // restart shortcut for the reframe leaf
    if (t.restart) {
      var rs = el("p", "note");
      var rb = el("button", "linklike", "Restart in the comparison branch");
      rb.addEventListener("click", function () { path = [0]; render(); });
      rs.appendChild(rb);
      card.appendChild(rs);
    }

    // exports
    var ex = el("div", "exports");
    ex.appendChild(actionBtn("Copy as prompt", "primary", function () { return buildPrompt(t); }));
    ex.appendChild(actionBtn("Copy R plan", "", function () { return t.r; }));
    if (t.skeleton) ex.appendChild(actionBtn("Copy survey (R)", "", function () { return t.skeleton; }));
    ex.appendChild(actionBtn("Copy Markdown", "", function () { return buildMarkdown(t); }));
    ex.appendChild(actionBtn("Copy permalink", "", function () { return permalink(); }));
    if (t.surveyframe_id) {
      var api = el("a", "btn mono", "JSON endpoint");
      api.href = "api/tests/" + t.surveyframe_id + ".json";
      api.target = "_blank";
      api.rel = "noopener";
      api.style.textDecoration = "none";
      ex.appendChild(api);
    }
    card.appendChild(ex);

    // back / start again
    var row = el("div", "backrow");
    var back = el("button", "linklike", "Back");
    back.addEventListener("click", function () { path.pop(); render(); });
    row.appendChild(back);
    row.appendChild(document.createTextNode("  \u00B7  "));
    var again = el("button", "linklike", "Start again");
    again.addEventListener("click", function () { path = []; render(); });
    row.appendChild(again);
    card.appendChild(row);

    root.appendChild(card);

    // next steps
    var ns = el("div", "nextsteps");
    ns.appendChild(el("h3", null, "Run it properly"));
    var p1 = el("p");
    p1.innerHTML =
      'Verify the assumptions on your own data with <span class="mono">assumption_report()</span>, then run the plan with <span class="mono">run_analysis_plan()</span> in the ' +
      '<a href="https://CRAN.R-project.org/package=surveyframe" target="_blank" rel="noopener">surveyframe</a> R package. ' +
      "It returns the APA statistic, the effect size, a writing prompt, and the supporting reference for every research question.";
    ns.appendChild(p1);
    var p2 = el("p");
    p2.innerHTML =
      'Working with a small sample? The open textbook <a href="https://doi.org/10.5281/zenodo.20221929" target="_blank" rel="noopener">Quantitative Analysis with Small Samples</a> covers when each method holds up and what to report.';
    ns.appendChild(p2);
    root.appendChild(ns);

    // cross-reference block
    root.appendChild(buildRelatedBlock());

    // citation footer
    var cf = el("div", "citefoot");
    cf.appendChild(el("div", null, "If this tool informed your method choice, please cite:"));
    cf.appendChild(el("div", "mono", DATA.meta.citation.tool));
    cf.appendChild(el("div", "mono", DATA.meta.citation.package_text));
    root.appendChild(cf);
  }

  // ---------- cross-reference block ----------

  function buildRelatedBlock() {
    var box = el("div", "related");
    var head = el("div", "related-head");
    head.appendChild(el("h3", null, "Part of the surveyframe ecosystem"));
    head.appendChild(
      el(
        "p",
        "related-sub",
        "This advisor, the R package that runs the tests, and the textbook behind them are built to work together. Each one points to the other two. All three are free and open."
      )
    );
    box.appendChild(head);

    var grid = el("div", "related-grid");
    RELATED.forEach(function (p) {
      var cardEl = el("div", "related-card");
      cardEl.appendChild(el("div", "related-tag mono", p.tag));
      cardEl.appendChild(el("div", "related-name", p.name));
      cardEl.appendChild(el("p", "related-blurb", p.blurb));
      var a = el("a", "btn related-cta", p.cta);
      a.href = p.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.textDecoration = "none";
      cardEl.appendChild(a);
      grid.appendChild(cardEl);
    });
    box.appendChild(grid);

    var note = el("p", "related-note");
    note.textContent =
      "No ads, no paid tiers. These are companion open-source and open-access projects by the same author.";
    box.appendChild(note);
    return box;
  }

  // jump straight to a leaf without a question path (alternative links)
  function renderDirect(nodeId) {    root.innerHTML = "";
    root.appendChild(renderStages({ node: { type: "result" } }));
    root.appendChild(renderRecord());
    renderResult(DATA.nodes[nodeId]);
    window.scrollTo({ top: 0 });
  }

  // ---------- panes ----------

  function paneAssumptions(pane, t) {
    var ul = el("ul");
    t.assumptions.forEach(function (a) { ul.appendChild(el("li", null, a)); });
    pane.appendChild(ul);
    if (t.surveyframe_id) {
      var n = el("p", "note");
      n.innerHTML =
        'Check these against your data with <span class="mono">assumption_report()</span> before reporting the result.';
      pane.appendChild(n);
    }
  }

  function paneSmallSample(pane, t) {
    if (!t.smallSample) {
      pane.appendChild(el("p", "note", "No small-sample note applies to this step."));
      return;
    }
    pane.appendChild(el("p", null, t.smallSample));
    var n = el("p", "note");
    n.innerHTML =
      'Survey and small-sample design is the focus of this tool. For the full treatment of exact tests, resampling, effect sizes, and reporting under a small n, see the open textbook ' +
      '<a href="https://doi.org/10.5281/zenodo.20221929" target="_blank" rel="noopener">Quantitative Analysis with Small Samples</a>.';
    pane.appendChild(n);
  }

  function paneSkeleton(pane, t) {
    if (!t.skeleton) {
      pane.appendChild(el("p", "note", "No sample survey skeleton applies to this step."));
      return;
    }
    var intro = el("p", "note");
    intro.innerHTML =
      "A ready-to-adopt surveyframe instrument. Section A is a standard demographic block; " +
      "Section B onward carry the measures this analysis needs. The item and scale ids already match the " +
      "analysis plan, so the survey feeds straight into <span class=\"mono\">run_analysis_plan()</span>. " +
      "Replace the bracketed stems with your own validated items.";
    pane.appendChild(intro);
    pane.appendChild(el("pre", "code mono", t.skeleton));
  }

  // pipeline call to action, surfaced on the preview
  function pipelineCta() {
    var box = el("div", "cta");
    var p = el("p", "cta-text",
      "One pipeline for questionnaire, analysis, and reporting.");
    box.appendChild(p);
    var a = el("a", "btn primary", "Build it in surveyframe →");
    a.href = "https://CRAN.R-project.org/package=surveyframe";
    a.target = "_blank";
    a.rel = "noopener";
    a.style.textDecoration = "none";
    box.appendChild(a);
    return box;
  }

  function panePreview(pane, t) {
    if (!t.survey || !t.survey.sections) {
      pane.appendChild(el("p", "note", "No survey preview applies to this step."));
      return;
    }
    var note = el("p", "note");
    note.textContent =
      "How the sample survey looks to a respondent. The questions are placeholders, ready for you to replace.";
    pane.appendChild(note);

    var form = el("div", "survey");
    form.appendChild(el("div", "survey-title", "[Your study title]"));

    var qn = 0;
    t.survey.sections.forEach(function (sec) {
      var s = el("div", "survey-section");
      s.appendChild(el("div", "survey-sec-head", "Section " + sec.letter + ": " + sec.title));
      if (sec.intro) s.appendChild(el("div", "survey-sec-intro", sec.intro));
      sec.items.forEach(function (it) {
        qn += 1;
        var qd = el("div", "survey-q");
        var lab = el("div", "survey-label");
        lab.appendChild(document.createTextNode(qn + ". " + it.label));
        if (it.placeholder) lab.appendChild(el("span", "survey-tag", "sample"));
        qd.appendChild(lab);
        qd.appendChild(renderControl(it));
        s.appendChild(qd);
      });
      form.appendChild(s);
    });

    form.appendChild(pipelineCta());
    pane.appendChild(form);
  }

  function renderControl(it) {
    if (it.type === "numeric") {
      var num = el("div", "survey-num", "");
      num.appendChild(el("span", "survey-num-box", "0"));
      return num;
    }
    if (it.type === "likert" || it.type === "single_choice") {
      var wrap = el("div", it.type === "likert" ? "survey-likert" : "survey-opts");
      (it.choices || []).forEach(function (c) {
        var opt = el("label", "survey-opt");
        opt.appendChild(el("span", "survey-radio", ""));
        opt.appendChild(document.createTextNode(c));
        wrap.appendChild(opt);
      });
      return wrap;
    }
    return el("div", "survey-text", "");
  }

  function paneR(pane, t) {
    var pre = el("pre", "code mono", t.r);
    pane.appendChild(pre);
    var n = el("p", "note");
    n.textContent =
      "The method ID and role names are verified against surveyframe " +
      DATA.meta.surveyframe.version_verified + ".";
    pane.appendChild(n);
  }

  function paneJasp(pane, t) {
    var ol = el("ol");
    t.jasp.forEach(function (s) { ol.appendChild(el("li", null, s)); });
    pane.appendChild(ol);
  }

  function paneReport(pane, t) {
    if (!t.report) {
      pane.appendChild(el("p", "note", "No reporting template applies to this step."));
      return;
    }
    pane.appendChild(el("div", "reportbox", t.report));
    var n = el("p", "note");
    n.textContent =
      "Past tense, APA style. Replace each placeholder with your statistic. Reference: " +
      (t.refs[0] || "");
    pane.appendChild(n);
  }

  // ---------- exports ----------

  function buildPrompt(t) {
    var lines = [
      "You are assisting with a statistical analysis.",
      "",
      "Study design (decision record): " + trail().map(function (s) { return s.token; }).join("; "),
      "Recommended test: " + t.name + (t.surveyframe_id ? ' (surveyframe method = "' + t.surveyframe_id + '")' : ""),
      "Why: " + t.verdict,
    ];
    if (t.example) lines.push("Plain example: " + t.example);
    if (t.smallSample) lines.push("Small-sample consideration: " + t.smallSample);
    lines.push("", "Assumptions to verify before reporting:");
    t.assumptions.forEach(function (a) { lines.push("- " + a); });
    lines.push(
      "",
      "Task: write a complete, reproducible R script for this analysis using the surveyframe package (install.packages(\"surveyframe\")). Start from this plan entry:",
      "",
      t.r,
      "",
      "Adapt the variable names to my data, add assumption checks, and report the result in APA style using this template: " + (t.report || "n/a")
    );
    if (t.skeleton) {
      lines.push(
        "",
        "If I still need to collect data, here is a matching surveyframe survey skeleton. Its item and scale ids already align with the plan above, so the instrument feeds run_analysis_plan() directly. Adapt the placeholder question stems to my study:",
        "",
        t.skeleton
      );
    }
    lines.push(
      "",
      "Attribution: recommendation generated by StatChooser, companion to surveyframe. " + DATA.meta.citation.package_text
    );
    return lines.join("\n");
  }

  function buildMarkdown(t) {
    var md = [
      "## " + t.name,
      "",
      t.verdict,
      "",
      t.surveyframe_id ? "surveyframe method: `" + t.surveyframe_id + "`" : "",
      "",
    ];
    if (t.example) md.push("**For example**", "", t.example, "");
    md.push("**Assumptions**", "");
    t.assumptions.forEach(function (a) { md.push("- " + a); });
    if (t.smallSample) md.push("", "**Small sample**", "", t.smallSample);
    md.push("", "**R**", "", "```r", t.r, "```", "");
    if (t.skeleton) md.push("**Sample survey skeleton (surveyframe)**", "", "```r", t.skeleton, "```", "");
    if (t.report) md.push("**Report**", "", "> " + t.report, "");
    md.push("---", "", "_" + DATA.meta.citation.tool + "_");
    return md.join("\n");
  }

  function actionBtn(label, extra, getText) {
    var b = el("button", "btn" + (extra ? " " + extra : ""), label);
    b.addEventListener("click", function () {
      copyText(getText(), label);
    });
    return b;
  }

  function copyText(text, label) {
    function done() { toast(label + ": copied"); }
    function fail() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { toast("Copy failed: select the text manually"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else fail();
  }

  var toastEl = null;
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = el("div", "toast");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }
})();
