import { Hono } from "hono";

// User-facing landing page for shared puzzle links.
//
// Shared links look like https://<backend>/puzzle/ABC123. When opened on a
// phone we try to bounce straight into the installed app via its custom URL
// scheme (vibecode://puzzle/ABC123). If the app isn't installed, the visitor
// stays on this page and can tap through to the App Store.
//
// NOTE: this route is intentionally mounted at the site root (not under /api)
// so the shared URLs stay short and clean.

// Keep these in sync with mobile/src/lib/links.ts
const APP_SCHEME = "vibecode";
const APP_STORE_URL =
  "https://apps.apple.com/us/app/puzzle-pics-hidden-hunt/id6775047272";

const puzzleLandingRouter = new Hono();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

puzzleLandingRouter.get("/:code", (c) => {
  const rawCode = c.req.param("code") ?? "";
  const code = escapeHtml(rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
  const deepLink = `${APP_SCHEME}://puzzle/${code}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-itunes-app" content="app-argument=${deepLink}" />
<title>Play Puzzle Pics: Hidden Hunt</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: #0B0B14; color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 380px; text-align: center;
    background: #161626; border: 2px solid rgba(255,255,255,0.08);
    border-radius: 24px; padding: 32px 24px;
  }
  h1 { font-size: 24px; margin: 0 0 6px; }
  p { color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.5; margin: 0 0 20px; }
  .code {
    display: inline-block; letter-spacing: 8px; font-size: 34px; font-weight: 800;
    color: #FFE600; background: #000; border: 3px solid #FFE600;
    border-radius: 14px; padding: 12px 22px; margin: 4px 0 24px;
  }
  a.btn {
    display: block; text-decoration: none; font-weight: 800; font-size: 17px;
    padding: 16px; border-radius: 16px; margin-bottom: 12px;
  }
  a.primary { background: #FF2D95; color: #fff; }
  a.secondary { background: rgba(255,255,255,0.08); color: #fff; border: 2px solid rgba(255,255,255,0.15); }
  .hint { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <div style="font-size:44px">🕵️</div>
    <h1>Puzzle Pics: Hidden Hunt</h1>
    <p>A friend sent you a puzzle to solve!</p>
    <div class="code">${code || "?????"}</div>
    <a class="btn primary" id="open" href="${deepLink}">Open in the App</a>
    <a class="btn secondary" href="${APP_STORE_URL}">Get the App (Free)</a>
    <div class="hint">Already installed? Tap “Open in the App”. New here? Download it, then enter code ${code}.</div>
  </div>
  <script>
    // Try to launch the app automatically. If it isn't installed nothing
    // happens and the buttons above remain for the visitor.
    (function () {
      var deepLink = ${JSON.stringify(deepLink)};
      var triedAt = Date.now();
      // Attempt the custom scheme on load.
      window.location.href = deepLink;
      // (No forced App Store redirect — let the user choose, so we never send
      // an installed user to the store by mistake.)
    })();
  </script>
</body>
</html>`;

  return c.html(html);
});

export { puzzleLandingRouter };
