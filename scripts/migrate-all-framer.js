import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(srcDir);

let updatedCount = 0;
let skippedCount = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Regex для поиска импортов motion и AnimatePresence
    // Ловит: import { motion } from "framer-motion"
    // Ловит: import { motion, AnimatePresence } from 'framer-motion'
    // Ловит: import { AnimatePresence, motion } from "framer-motion"
    // Игнорирует сложные импорты (useAnimation, Variants и т.д.)
    
    const regex = /import\s+\{\s*(motion|AnimatePresence|m)(?:\s*,\s*(motion|AnimatePresence|m))*\s*\}\s+from\s+['"]framer-motion['"];?/g;
    
    content = content.replace(regex, (match) => {
        // Проверяем, нет ли там лишних импортов, которые мы не поддерживаем в нашей обертке
        if (match.includes('useAnimation') || match.includes('Variants') || match.includes('AnimationControls')) {
            console.log(`⚠️ Skipped complex import in ${path.basename(file)}: ${match}`);
            return match;
        }
        
        // Заменяем на наш путь
        return match.replace(/['"]framer-motion['"]/, '"@/components/optimized/Motion"');
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Updated: ${path.relative(srcDir, file)}`);
        updatedCount++;
    } else if (content.includes('from "framer-motion"') || content.includes("from 'framer-motion'")) {
        console.log(`⚠️ Manual check needed: ${path.relative(srcDir, file)}`);
        skippedCount++;
    }
});

console.log(`\n🎉 Migration complete!`);
console.log(`Updated files: ${updatedCount}`);
console.log(`Files needing manual check: ${skippedCount}`);
