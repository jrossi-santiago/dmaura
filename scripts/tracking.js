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
