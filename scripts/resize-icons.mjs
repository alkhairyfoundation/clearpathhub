import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'logo.jpg');
const outputDir = join(root, 'public', 'icons');

const sizes = [48, 72, 96, 128, 144, 152, 167, 180, 192, 512];

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

async function resize() {
  const img = sharp(source);
  const metadata = await img.metadata();
  console.log(`Source: ${source}`);
  console.log(`Dimensions: ${metadata.width}x${metadata.height}\n`);

  for (const size of sizes) {
    const outPath = join(outputDir, `icon-${size}x${size}.png`);
    await sharp(source)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated: icon-${size}x${size}.png (${size}x${size})`);
  }

  console.log('\nDone! All icons generated.');
}

resize().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
