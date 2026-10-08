// file: assets/js/walkthrough.js
// Click-through walkthrough shared by the product pages that use it
// (products/ethos.qmd, products/surveyframe.qmd). Each page supplies its
// screenshots' folder in data-dir, the alt-text prefix in data-alt, and the
// step titles as JSON in <script type="application/json" data-steps>.
// It moves only when the visitor presses Next, Back or an arrow key.
// Without this script the first screen still shows.
(function () {
  "use strict";

  // Each section is one screen tall below the navbar. Measure from the hero
  // itself, since the navbar height and Quarto's top gap vary by width.
  function fit() {
    var header = document.getElementById("quarto-header");
    var hero = document.querySelector(".wt-hero");
    var nav = header ? header.getBoundingClientRect().height : 72;
    var top = hero ? hero.getBoundingClientRect().top + window.scrollY : nav;
    var root = document.documentElement.style;
    root.setProperty("--wt-nav", nav + "px");
    root.setProperty("--wt-screen", (window.innerHeight - top) + "px");
  }
  fit();
  window.addEventListener("resize", fit);

  document.querySelectorAll("[data-demo]").forEach(function (demo) {
    var q = function (name) { return demo.querySelector('[data-el="' + name + '"]'); };
    var data = demo.querySelector("script[data-steps]");
    var steps = data ? JSON.parse(data.textContent) : [];
    if (!steps.length) return;
    var dir = demo.getAttribute("data-dir");
    var altPrefix = demo.getAttribute("data-alt") || "";
    var img = q("img");
    var prev = demo.querySelector("[data-prev]");
    var next = demo.querySelector("[data-next]");
    var at = 0;
    var src = function (i) { return dir + "step-" + (i + 1) + ".webp"; };
    q("total").textContent = String(steps.length);

    function go(i) {
      at = Math.max(0, Math.min(steps.length - 1, i));
      img.src = src(at);
      img.alt = altPrefix + steps[at].charAt(0).toLowerCase() + steps[at].slice(1) + ".";
      q("n").textContent = String(at + 1);
      q("title").textContent = steps[at];
      q("bar").style.width = ((at + 1) / steps.length * 100) + "%";
      prev.disabled = at === 0;
      next.textContent = at === steps.length - 1 ? "Start again" : "Next";
      // Fetch the following screen ahead, so Next never waits.
      if (at + 1 < steps.length) { var pre = new Image(); pre.src = src(at + 1); }
    }

    prev.addEventListener("click", function () { go(at - 1); });
    next.addEventListener("click", function () { go(at === steps.length - 1 ? 0 : at + 1); });
    demo.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") { event.preventDefault(); go(at + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); go(at - 1); }
    });
    go(0);
  });
})();
