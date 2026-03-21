(function () {
  // Contact forms are submitted through FormSubmit with a fallback to mailto.
  // A hidden honeypot field is injected into every form to reduce basic spam.
  var recipient = "mohammedali.page@gmail.com";
  var endpoint = "https://formsubmit.co/ajax/" + recipient;
  var forms = document.querySelectorAll("[data-contact-form]");

  if (!forms.length) {
    return;
  }

  function trackLead(formName) {
    if (typeof window.gtag === "function") {
      window.gtag("event", "generate_lead", {
        form_name: formName,
        page_location: window.location.href
      });
    }
  }

  function openMailto(subject, payload) {
    var lines = Object.keys(payload)
      .filter(function (key) {
        return payload[key];
      })
      .map(function (key) {
        return key + ": " + payload[key];
      });
    var body = encodeURIComponent(lines.join("\n"));
    window.location.href =
      "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + body;
  }

  function ensureHoneypot(form) {
    if (form.querySelector('input[name="_honey"]')) {
      return;
    }

    var honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "_honey";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true");
    honeypot.className = "contact-honeypot";
    form.prepend(honeypot);
  }

  forms.forEach(function (form) {
    ensureHoneypot(form);

    var statusId = form.getAttribute("data-status-id");
    var statusEl = statusId ? document.getElementById(statusId) : null;
    var submitButton = form.querySelector('button[type="submit"]');
    var defaultLabel = submitButton ? submitButton.textContent : "";

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (statusEl) {
        statusEl.textContent = "Sending...";
      }
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      var formData = new FormData(form);
      var payload = Object.fromEntries(formData.entries());
      var subject = form.getAttribute("data-form-subject") || "Website enquiry";

      payload._subject = subject;
      payload._replyto = payload.email || "";
      payload._captcha = "false";
      payload._template = "table";
      payload.page = window.location.href;

      try {
        var response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        });

        var result = await response.json().catch(function () {
          return {};
        });

        if (!response.ok || (result.success !== undefined && result.success !== "true" && result.success !== true)) {
          throw new Error("Form submission failed");
        }

        form.reset();
        trackLead(subject);
        if (statusEl) {
          statusEl.textContent = "Thanks. Your message has been sent.";
        }
      } catch (error) {
        openMailto(subject, payload);
        if (statusEl) {
          statusEl.textContent =
            "Your email app has been opened as a fallback. If it did not open, write to " +
            recipient +
            ".";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = defaultLabel;
        }
      }
    });
  });
})();
