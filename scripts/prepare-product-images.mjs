import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const entries = JSON.parse(await readFile(process.argv[2], "utf8"));
const destination = path.resolve("public/products");
await mkdir(destination, { recursive: true });
for (const { id, source } of entries) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Identificador de imagen inválido");
  const file = path.join(destination, `${id}.webp`);
  await sharp(source).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 84 }).toFile(file);
}
console.log(`${entries.length} imágenes WebP preparadas.`);
