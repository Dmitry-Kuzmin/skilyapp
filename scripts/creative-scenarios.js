export const CREATIVE_SCENARIOS = [
    // Category 1: NORTHERN SPAIN (Green, Cinematic, Dramatic Weather) - HIGH PRIORITY
    { id: 101, category: "Northern", keywords: ["mountain", "curve", "wet", "rain", "rainy", "norte", "montaña", "lluvia"], text: "Asturian Peaks (Picos de Europa): A dramatic mountain road surrounded by jagged limestone peaks. The asphalt is wet and reflective after a storm, mirroring the dark moody clouds. Patches of intense green grass neon-lit by a breakthrough sunray. Cinematic, epic scale." },
    { id: 102, category: "Northern", keywords: ["coast", "sea", "cliff", "acantilado", "mar", "cantabria"], text: "Cantabrian Coastline: A winding road hugging the edge of a massive cliff. Below, the rough Atlantic ocean crashes against rocks (white foam). The sky is a mix of deep blue and stormy grey. The air feels misty and crisp. 8k resolution, National Geographic style." },
    { id: 103, category: "Northern", keywords: ["forest", "fog", "mist", "bosque", "niebla", "galicia"], text: "Deep Galician Forest: A narrow asphalt road cutting through a dense, magical eucalyptus forest. Thick cinematic fog (volumetric lighting) filters the sunlight into 'god rays'. The atmosphere is mysterious, soft, and lush green." },
    { id: 104, category: "Northern", keywords: ["village", "rural", "stone", "pueblo", "piedra"], text: "Basque Countryside: Rolling emerald green hills dotted with traditional 'Baserri' stone farmhouses. A pristine, winding black road cuts through the vivid green landscape. Soft overcast lighting, very even and professional photography style." },
    { id: 105, category: "Northern", keywords: ["bridge", "river", "puente", "rio"], text: "Modern Bridge in Nature: A sleek, modern concrete bridge spanning a deep green river gorge in Northern Spain. Contrast between high-tech engineering and wild nature. Dramatic viewing angle from slightly below." },

    // Category 2: CINEMATIC URBAN (Modern, Skily Style)
    { id: 201, category: "Urban", keywords: ["city", "urban", "madrid", "traffic", "ciudad"], text: "Madrid Gran Vía (Cinematic): The iconic avenue bathed in 'Golden Hour' sunset light. Long shadows, warm glowing buildings. The asphalt has a slight sheen. The scene feels busy, vibrant, and high-tech." },
    { id: 202, category: "Urban", keywords: ["rain", "night", "neon", "noche", "luz"], text: "Cyberpunk Bilbao at Night: Wet asphalt reflecting vibrant red and blue city lights (neon signs, traffic lights). A modern tram passes by. The mood is moody, electric, and highly detailed. Raindrops on the lens." },
    { id: 203, category: "Urban", keywords: ["modern", "architecture", "glass", "valencia"], text: "Valencia City of Arts: Ultra-modern white organic architecture (Calatrava). Bright, high-contrast sunlight against a deep blue sky. Shallow pools of water reflecting the futuristic buildings. A clean, sci-fi utopia vibe." },

    // Category 3: SPECIAL CONDITIONS (Artistic Rendering)
    { id: 301, category: "Condition", keywords: ["snow", "ice", "winter", "nieve"], text: "Cinematic Winter Pass: A snow-cleared black road cutting through a pristine white snowscape. The sky is a piercing cold blue. Crystal clear air. The contrast between black asphalt and white snow is striking." },
    { id: 302, category: "Condition", keywords: ["sunset", "sun", "flare", "sol", "atardecer"], text: "Blinding Sunset Drive: Driving directly into a low, intense orange sun. Lens flare effects, silhouetted cars. The emotional feeling of a summer road trip evening. Warm, nostalgic color palette." },
    { id: 303, category: "Condition", keywords: ["storm", "dark", "cloud", "tormenta"], text: "Approaching Storm: The sky is arguably black/purple with heavy storm clouds. The sun illuminates the foreground road in a surreal bright yellow/white. High contrast, dramatic tension." },

    // Fallbacks for generic terms
    { id: 401, category: "Generic", keywords: ["road", "highway", "carretera"], text: "Perfect Highway: A geometrically perfect three-lane highway stretching to infinity. Lush green sound barriers. Photorealistic asphalt texture details (pebbles, slight wear). 4k automotive commercial look." }
];

export function getCreativeScenario(textContext) {
    if (!textContext) return getRandomScenario();

    // Normalize text
    const lowerText = textContext.toLowerCase();

    // Score scenarios based on keyword matches
    const scored = CREATIVE_SCENARIOS.map(scenario => {
        let score = 0;
        scenario.keywords.forEach(kw => {
            if (lowerText.includes(kw)) score += 5;
        });
        // Boost Northern scenarios slighlty to prioritize them generally
        if (scenario.category === "Northern") score += 2;
        return { scenario, score };
    });

    // Filter relevant ones
    const matches = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    // If matches found, return the top one (or pick from top 3 for variety)
    if (matches.length > 0) {
        // Take top 3 best fits and pick random to ensure variety even for same keywords
        const topCandidates = matches.slice(0, 3);
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        return selected.scenario.text;
    }

    // Fallback: mostly Northern
    return getRandomScenario();
}

function getRandomScenario() {
    // Weighted random: 60% Northern, 40% others
    const northern = CREATIVE_SCENARIOS.filter(s => s.category === "Northern");
    const others = CREATIVE_SCENARIOS.filter(s => s.category !== "Northern");

    if (Math.random() < 0.6) {
        return northern[Math.floor(Math.random() * northern.length)].text;
    }
    return others[Math.floor(Math.random() * others.length)].text;
}
