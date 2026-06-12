// Engångskonvertering: public/exercise-images/*.png → .webp (1920px, q80).
// Original-PNG:erna flyttas till assets-src/exercise-images-original/ så de
// inte skeppas i dist (28 MB) men finns kvar som källmaterial.
// Kör: node scripts/convert-exercise-images.mjs
import sharp from "sharp";
import { readdir, mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";

const SRC = "public/exercise-images";
const ORIGINALS = "assets-src/exercise-images-original";

await mkdir(ORIGINALS, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));

for (const file of files) {
  const src = path.join(SRC, file);
  const out = path.join(SRC, file.replace(/\.png$/, ".webp"));
  const before = (await stat(src)).size;
  await sharp(src)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  const after = (await stat(out)).size;
  await rename(src, path.join(ORIGINALS, file));
  console.log(
    `${file}: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e3).toFixed(0)} KB`,
  );
}
console.log("Done.");
