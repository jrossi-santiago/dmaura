// Third-party tracking scripts for every page. Loaded once from a single
// <script src="/scripts/tracking.js" defer> tag in each page's <head> — add
// new trackers (Google Analytics, etc.) below and every page picks them up
// with no further per-page changes.

function loadTrackingScript(attrs) {
  var s = document.createElement("script");
  for (var key in attrs) s.setAttribute(key, attrs[key]);
  document.head.appendChild(s);
}

// Datafast
loadTrackingScript({
  src: "https://datafa.st/js/script.js",
  defer: "",
  "data-website-id": "dfid_xwg5aBISznGIAytqBDmrG",
  "data-domain": "dmaura.xyz",
});

// X (Twitter) conversion tracking
!(function (e, t, n, s, u, a) {
  e.twq ||
    ((s = e.twq =
      function () {
        s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
      }),
    (s.version = "1.1"),
    (s.queue = []),
    (u = t.createElement(n)),
    (u.async = !0),
    (u.src = "https://static.ads-twitter.com/uwt.js"),
    (a = t.getElementsByTagName(n)[0]),
    a.parentNode.insertBefore(u, a));
})(window, document, "script");
twq("config", "revbw");
