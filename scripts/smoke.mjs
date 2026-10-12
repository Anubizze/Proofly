// Run against an already started production server: node scripts/smoke.mjs
const origin = process.env.PROOFLY_TEST_ORIGIN || "http://localhost:3000";
const paths = ["/", "/register", "/verify", "/dashboard", "/proof/invalid"];
let registrationHtml = "";
for (const path of paths) {
  const response = await fetch(new URL(path, origin));
  const html = await response.text();
  if (response.status !== 200 || !html.includes("<html")) throw new Error(`${path}: expected HTTP 200 with HTML`);
  console.log(`${path}: HTTP ${response.status}`);
  if (path === "/register") registrationHtml = html;
}
const assets = new Set([...registrationHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(match => match[1]));
if (!assets.size) throw new Error("No script or stylesheet assets were found.");
for (const asset of assets) {
  const response = await fetch(new URL(asset, origin));
  if (!response.ok) throw new Error(`Asset failed: ${asset}`);
}
console.log(`${assets.size} JavaScript/CSS assets: HTTP 200`);
