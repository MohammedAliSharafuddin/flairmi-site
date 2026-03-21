(function () {
  var links = [
    { id: "nav-menu-textbooks", href: "/textbooks/index.html" },
    { id: "nav-menu-products", href: "/products/index.html" }
  ];

  function wireDropdownOverview(item) {
    var toggle = document.getElementById(item.id);

    if (!toggle) {
      return;
    }

    toggle.setAttribute("href", item.href);

    toggle.addEventListener("click", function (event) {
      var parent = toggle.closest(".dropdown");

      if (!parent || !parent.classList.contains("show")) {
        event.preventDefault();
      }
    });
  }

  links.forEach(wireDropdownOverview);
})();
