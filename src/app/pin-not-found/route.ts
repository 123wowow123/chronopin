// The response for a pin that does not exist (src/proxy.ts rewrites to it).
// A route handler rather than a page, because only a handler's own status
// survives: a page streams its shell with a 200 before it could say 404.
const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pin not found · Chronopin</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #222; color: #bbb; font: 16px/1.5 system-ui, sans-serif; text-align: center; }
  h1 { color: #d7dadc; font-weight: 500; }
  a { color: #4a92d1; }
</style>
</head>
<body>
<main>
  <h1>Pin not found</h1>
  <p>That pin doesn't exist, or it was removed.</p>
  <p><a href="/">Back to the timeline</a></p>
</main>
</body>
</html>`;

export function GET() {
  return new Response(HTML, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
