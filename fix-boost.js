const fs = require('fs');
const content = fs.readFileSync('src/components/shop/BoostShopModal.tsx', 'utf8');
const fixed = content.replace(/const \[activeTab, setActiveTab\] = useState<'boosts' \| 'coins' \| 'premium' \| 'history'>\('boosts'\);/, "const [activeTab, setActiveTab] = useState<'boosts' | 'coins' | 'premium' | 'history'>(initialTab || 'boosts');\n\n  useEffect(() => {\n    if (open && initialTab) {\n      setActiveTab(initialTab);\n    }\n  }, [open, initialTab]);");
fs.writeFileSync('src/components/shop/BoostShopModal.tsx', fixed);
