const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = 'landing/public/images';

async function optimize() {
  const files = fs.readdirSync(imagesDir);
  
  for (const file of files) {
    if (!file.match(/\.(png|jpg|jpeg)$/i)) continue;
    
    const inputPath = path.join(imagesDir, file);
    const outputPath = path.join(imagesDir, file.split('.')[0] + '.webp');
    
    console.log(`Optimizing ${file}...`);
    let pipeline = sharp(inputPath);
    
    // Default resize for large images, special case for the huge test image
    if (file === 'test-image-s28.jpg') {
      pipeline = pipeline.resize({ width: 800 });
    } else {
      pipeline = pipeline.resize({ width: 1200, withoutEnlargement: true });
    }

    await pipeline
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    const oldSize = fs.statSync(inputPath).size / 1024;
    const newSize = fs.statSync(outputPath).size / 1024;
    console.log(`  Done: ${oldSize.toFixed(1)}KB -> ${newSize.toFixed(1)}KB`);
  }
}

optimize().catch(console.error);
