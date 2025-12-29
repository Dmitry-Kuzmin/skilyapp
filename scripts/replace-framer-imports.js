import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Файлы, которые нужно обновить
const filesToUpdate = [
  '/src/pages/TestResults.tsx',
  '/src/pages/TestSession.tsx',
  '/src/pages/games/Duel.tsx',
  '/src/pages/games/FlashCardsGame.tsx',
  '/src/pages/games/MatchingGame.tsx',
  '/src/pages/games/RaceGame.tsx',
  '/src/pages/games/FourVariantsGame.tsx',
  '/src/pages/games/IntersectionGame.tsx',
  '/src/pages/games/GuessTheSign.tsx',
  '/src/pages/Partners.tsx',
  '/src/pages/Games.tsx',
  '/src/pages/Tests.tsx',
  '/src/pages/HallOfFame.tsx',
  '/src/pages/admin/AdminSeasonsManagement.tsx',
  '/src/pages/admin/AdminSecurityMonitoring.tsx',
  '/src/pages/admin/AdminDashboard.tsx',
  '/src/pages/admin/AdminPartners.tsx',
  '/src/pages/admin/AdminRewardReports.tsx',
  '/src/pages/TopicsMode.tsx',
  '/src/pages/learn/LearnCountryHome.tsx'
];

const replacementMap = {
  // Заменяем импорт на оптимизированную версию
  'import { motion, AnimatePresence } from "framer-motion"': 'import { MotionDiv as motion, AnimatePresence } from "@/components/optimized/Motion"',
  'import { motion } from "framer-motion"': 'import { MotionDiv as motion } from "@/components/optimized/Motion"',
  'import { AnimatePresence } from "framer-motion"': 'import { AnimatePresence } from "@/components/optimized/Motion"',
};

function updateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Файл не найден: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;

  for (const [oldImport, newImport] of Object.entries(replacementMap)) {
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      updated = true;
      console.log(`Обновлен импорт в: ${filePath}`);
    }
  }

  if (updated) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Файл обновлен: ${filePath}`);
  } else {
    console.log(`- Импорт не найден в: ${filePath}`);
  }
}

console.log('Начинаем обновление импортов Framer Motion...\n');

filesToUpdate.forEach(updateFile);

console.log('\n✅ Все файлы обработаны!');
console.log('\n📋 Следующие шаги:');
console.log('1. Запустите: node scripts/replace-framer-imports.js');
console.log('2. Проверьте, что все импорты работают корректно');
console.log('3. Запустите: npm run build:analyze для проверки размера бандла');