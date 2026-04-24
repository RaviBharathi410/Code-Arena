import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input: workspace asset dropped by Cursor
const INPUT =
  'C:\\Users\\Ravi\\.cursor\\projects\\d-Projects-Voice-Activated-Code-Based-Arena\\assets\\c__Users_Ravi_AppData_Roaming_Cursor_User_workspaceStorage_81536e7893acf0c51cbde936d3ba6c08_images_image-bc94f22e-6df0-4519-bb67-5ee5737af3c4.png';

// Output: web app asset
const OUTPUT = path.resolve(__dirname, '../src/assets/codearena-mark.png');

function isCyanLike(r, g, b, a) {
  if (a < 10) return false;
  // target the light-blue/cyan band (including anti-aliased edge pixels)
  // avoid purple by requiring blue/green dominance over red.
  const bgDominant = b > r + 30 && g > r + 20;
  const brightEnough = b > 120 && g > 120;
  const notPurple = !(r > 120 && b > 120 && g < 120);
  return bgDominant && brightEnough && notPurple;
}

function recolorToWhite(png) {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx + 0];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];

      if (isCyanLike(r, g, b, a)) {
        png.data[idx + 0] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
        // preserve alpha
      }
    }
  }
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

const buf = fs.readFileSync(INPUT);
const png = PNG.sync.read(buf);
recolorToWhite(png);
const out = PNG.sync.write(png);
fs.writeFileSync(OUTPUT, out);

console.log(`Wrote ${OUTPUT}`);

