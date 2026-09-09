/* assets/js/consent.js
   Cookie consent gate for Google Analytics.

   The 2026-09-09 site audit found GA4 loading on every page with no
   disclosure anywhere and no consent step, on a site that markets
   privacy-first software. This file is the consent half of that fix. The
   disclosure half is downloads/PrivacyPolicy.md.

   Behaviour:
   - Visitors in the EU and UK see a banner and analytics stay off until they
     accept. Declining is honoured and no analytics cookie is ever set.
   - Everyone else is treated as consented, matching how the site behaved
     before, and can still opt out from the footer link.
   - Region is guessed from the browser timezone, which needs no network call
     and no third-party geolocation service. It is approximate. When the guess
     is uncertain the code asks for consent rather than assuming it.

   No CDN, no dependencies, no network request of its own. */
(function (window, document) {
  "use strict";

  var KEY = "flairmi-consent";
  var EU_UK = /^(Europe\/|Atlantic\/(Azores|Canary|Faroe|Madeira|Reykjavik)$|Arctic\/Longyearbyen$)/;

  function stored() {
    try {
      return window.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function remember(value) {
    try {
      window.localStorage.setItem(KEY, value);
    } catch (e) {
      /* Private mode or blocked storage. The banner reappears next visit,
         which is the safe direction to fail in. */
    }
  }

  function needsAsking() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) { return true; }
      return EU_UK.test(tz);
    } catch (e) {
      return true;
    }
  }

  function startAnalytics() {
    if (window.__ga4Loaded) { return; }
    var s = document.createElement("script");
    s.defer = true;
    s.src = "/assets/js/ga4.js";
    document.head.appendChild(s);
  }

  function removeBanner() {
    var el = document.getElementById("flairmi-consent-banner");
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }

  function showBanner() {
    var bar = document.createElement("div");
    bar.id = "flairmi-consent-banner";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie choice");
    bar.innerHTML =
      '<div class="flairmi-consent-inner">' +
      '<p>This site would like to use Google Analytics to see which pages are ' +
      'useful. It sets cookies. Analytics stay off unless you accept. ' +
      '<a href="/downloads/PrivacyPolicy.html">Privacy policy</a>.</p>' +
      '<div class="flairmi-consent-actions">' +
      '<button type="button" data-consent="declined">Decline</button>' +
      '<button type="button" data-consent="granted" class="primary">Accept</button>' +
      "</div></div>";
    document.body.appendChild(bar);

    bar.addEventListener("click", function (ev) {
      var choice = ev.target.getAttribute("data-consent");
      if (!choice) { return; }
      remember(choice);
      removeBanner();
      if (choice === "granted") { startAnalytics(); }
    });
  }

  function init() {
    var choice = stored();
    if (choice === "granted") { startAnalytics(); return; }
    if (choice === "declined") { return; }
    if (needsAsking()) { showBanner(); return; }
    remember("granted");
    startAnalytics();
  }

  /* Footer link, so a choice can always be changed. */
  window.flairmiChangeCookieChoice = function () {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    removeBanner();
    showBanner();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
