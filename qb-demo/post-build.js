#!/usr/bin/env node
// Post-build script: patches the generated Metabase index.html for static hosting
// Usage: node qb-demo/post-build.js <PAGES_BASE_URL>
// Example: node qb-demo/post-build.js https://arthurpanck.github.io/metabase

const fs = require("fs");
const path = require("path");

const PAGES_URL = process.argv[2];
if (!PAGES_URL) {
  console.error("Usage: node qb-demo/post-build.js <PAGES_BASE_URL>");
  process.exit(1);
}

// e.g., "/metabase" → "/metabase/"
const parsed = new URL(PAGES_URL);
const basePath = parsed.pathname.replace(/\/*$/, "") + "/"; // e.g. "/metabase/"

const BUILD_DIR = path.join(__dirname, "..", "resources", "frontend_client");
const INDEX_HTML = path.join(BUILD_DIR, "index.html");

if (!fs.existsSync(INDEX_HTML)) {
  console.error(`Build output not found: ${INDEX_HTML}`);
  console.error("Run 'bun run build-release:js' first.");
  process.exit(1);
}

let html = fs.readFileSync(INDEX_HTML, "utf8");

// Replace Mustache-style template vars injected by the Clojure backend at runtime
const replacements = {
  "{{{instanceUrlRaw}}}": PAGES_URL,
  "{{{language}}}": "en",
  "{{{favicon}}}": `${PAGES_URL}/app/assets/img/favicon.ico`,
  "{{{baseHref}}}": basePath,
  "{{{uri}}}": "/",
  "{{{applicationName}}}": "Query Builder Demo",
  "{{{embedCode}}}": "",
  // Bootstrap JSON: minimal settings so MetabaseBootstrap is valid JSON
  "{{{bootstrapJSON}}}": JSON.stringify({ "site-url": PAGES_URL }),
  "{{{userLocalizationJSON}}}": "{}",
  "{{{siteLocalizationJSON}}}": "{}",
  "{{{userColorScheme}}}": '"light"',
  "{{{nonceJSON}}}": "null",
  // bootstrapJS and assetOnErrorJS are inline scripts injected by the backend;
  // load them from the pre-built copies shipped with the frontend.
  "{{{bootstrapJS}}}": tryReadInlineJs("index_bootstrap"),
  "{{{assetOnErrorJS}}}": tryReadInlineJs("asset_loading_error"),
};

for (const [placeholder, value] of Object.entries(replacements)) {
  html = html.split(placeholder).join(value);
}

// Inject Service Worker registration just before </body>
const SW_SNIPPET = `
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { scope: "${basePath}" })
      .then(function(reg) {
        // If the SW just installed (first visit), reload so it intercepts API calls.
        if (reg.installing) {
          reg.installing.addEventListener("statechange", function(e) {
            if (e.target.state === "activated") window.location.reload();
          });
        }
      })
      .catch(function(err) { console.error("SW registration failed:", err); });
  }
</script>`;

html = html.replace("</body>", SW_SNIPPET + "\n</body>");

fs.writeFileSync(INDEX_HTML, html);
console.log(`✓ Patched ${INDEX_HTML}`);

// Copy service worker to build output
const SW_SRC = path.join(__dirname, "sw.js");
const SW_DEST = path.join(BUILD_DIR, "sw.js");
fs.copyFileSync(SW_SRC, SW_DEST);
console.log(`✓ Copied sw.js → ${SW_DEST}`);

// Create 404.html (GitHub Pages SPA fallback — redirects unknown paths to root)
const NOT_FOUND_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Query Builder Demo</title>
  <script>
    // GitHub Pages SPA fallback: encode the path in the query string and redirect to root.
    var l = window.location;
    l.replace(l.origin + l.pathname.split('/').slice(0, 2).join('/') + '/?/' +
      encodeURIComponent(l.pathname.slice(l.pathname.indexOf('/', 1) + 1) + l.search + l.hash)
    );
  </script>
</head>
<body></body>
</html>`;
fs.writeFileSync(path.join(BUILD_DIR, "404.html"), NOT_FOUND_HTML);
console.log(`✓ Wrote 404.html (SPA fallback)`);

// Patch index.html to decode the SPA redirect on first load
const SPA_DECODE = `
<script>
  (function() {
    var l = window.location;
    if (l.search.startsWith('?/')) {
      window.history.replaceState(null, null, l.pathname + decodeURIComponent(l.search.slice(1)) + l.hash);
    }
  })();
</script>`;
html = fs.readFileSync(INDEX_HTML, "utf8");
html = html.replace("</head>", SPA_DECODE + "\n</head>");
fs.writeFileSync(INDEX_HTML, html);
console.log(`✓ Injected SPA path-decode snippet`);

console.log(`\n✓ Build ready at: ${BUILD_DIR}`);
console.log(`  Open: ${PAGES_URL}`);

function tryReadInlineJs(name) {
  const jsPath = path.join(BUILD_DIR, "inline_js", `${name}.js`);
  if (fs.existsSync(jsPath)) return fs.readFileSync(jsPath, "utf8");
  return "";
}
