import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile("src/data/products.ts", "utf8");
const ids = [...source.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
for (const id of ids) {
  const file = `public/products/${id}.webp`;
  const image = await sharp(file).metadata();
  assert.equal(image.format, "webp", id);
  assert.ok(image.width >= 1000 && image.height >= 700, id);
  assert.ok((await stat(file)).size < 300_000, `${id}: imagen demasiado pesada`);
}

const routes = ["/", "/productos", "/nosotros", "/ubicacion", ...ids.map((id) => `/productos/${id}`)];
for (const route of routes) {
  const response = await fetch(`http://localhost:3000${route}`);
  assert.equal(response.status, 200, route);
  const html = await response.text();
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/\b3D\b|próximamente|proyecto académico|Muy pronto|modelos interactivos/i.test(visible), `${route}: texto de prototipo`);
  const models = (html.match(/class="api-glass-3d"/g) ?? []).length;
  assert.equal(models, route === "/" ? 1 : 0, `${route}: cantidad de visores`);
  if (route === "/productos") assert.equal((html.match(/class="product-photo product-photo--card"/g) ?? []).length, ids.length);
}
const optimized = await fetch("http://localhost:3000/_next/image?url=%2Fproducts%2Fapi-tradicional.webp&w=640&q=75");
assert.equal(optimized.status, 200, "Optimización de imágenes");
assert.ok(optimized.headers.get("content-type").startsWith("image/"));
console.log(`${ids.length} imágenes WebP válidas, ${routes.length} páginas correctas y un único visor 3D en el inicio.`);
