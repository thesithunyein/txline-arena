const sharp = require('sharp');
const fs = require('fs');

async function convert(svgPath, pngPath, width) {
  const svg = fs.readFileSync(svgPath);
  await sharp(svg, { density: 2 })
    .resize(width)
    .png()
    .toFile(pngPath);
  console.log(`Converted ${svgPath} -> ${pngPath}`);
}

(async () => {
  await convert('architecture.svg', 'architecture.png', 960);
  await convert('data-pipeline.svg', 'data-pipeline.png', 1120);
  await convert('logo.svg', 'logo.png', 256);
  console.log('All done!');
})();
