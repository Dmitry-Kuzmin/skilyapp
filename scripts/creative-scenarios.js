export const CREATIVE_SCENARIOS = [
    // Category 1: NORTHERN SPAIN (Green, Cinematic, Dramatic Weather) - HIGH PRIORITY
    { id: 101, category: "Northern", keywords: ["mountain", "curve", "wet", "rain", "rainy", "norte", "montaña", "lluvia"], text: "Asturian Peaks (Picos de Europa): A dramatic mountain road surrounded by jagged limestone peaks. The asphalt is wet and reflective after a storm, mirroring the dark moody clouds. Patches of intense green grass neon-lit by a breakthrough sunray. Cinematic, epic scale." },
    { id: 102, category: "Northern", keywords: ["coast", "sea", "cliff", "acantilado", "mar", "cantabria"], text: "Cantabrian Coastline: A winding road hugging the edge of a massive cliff. Below, the rough Atlantic ocean crashes against rocks (white foam). The sky is a mix of deep blue and stormy grey. The air feels misty and crisp. 8k resolution, National Geographic style." },
    { id: 103, category: "Northern", keywords: ["forest", "fog", "mist", "bosque", "niebla", "galicia"], text: "Deep Galician Forest: A narrow asphalt road cutting through a dense, magical eucalyptus forest. Thick cinematic fog (volumetric lighting) filters the sunlight into 'god rays'. The atmosphere is mysterious, soft, and lush green." },
    { id: 104, category: "Northern", keywords: ["village", "rural", "stone", "pueblo", "piedra"], text: "Basque Countryside: Rolling emerald green hills dotted with traditional 'Baserri' stone farmhouses. A pristine, winding black road cuts through the vivid green landscape. Soft overcast lighting, very even and professional photography style." },
    { id: 105, category: "Northern", keywords: ["bridge", "puente"], text: "Modern Overpass in Nature: A sleek, modern concrete bridge overpassing a lush green valley in Northern Spain. Contrast between high-tech engineering and wild nature. Dramatic viewing angle from slightly below." },
    { id: 106, category: "Professional", keywords: ["policia", "police", "guardia civil", "agente", "inmovilizar"], text: "Guardia Civil Checkpoint: A professional 3D scene of a Spanish Traffic Police (Guardia Civil) patrol car (White/Green) parked safely on the side of a highway with blue lights flashing. Two officers in high-visibility uniforms are present. Clean, authoritative, and educational atmosphere." },

    // Category 2: CINEMATIC URBAN (Modern, Skily Style)
    { id: 201, category: "Urban", keywords: ["city", "urban", "madrid", "traffic", "ciudad"], text: "Madrid Gran Vía (Cinematic): The iconic avenue bathed in 'Golden Hour' sunset light. Long shadows, warm glowing buildings. The asphalt has a slight sheen. The scene feels busy, vibrant, and high-tech." },
    { id: 202, category: "Urban", keywords: ["rain", "night", "neon", "noche", "luz"], text: "Bilbao Modern District: The iconic Guggenheim Museum's titanium curves glow amber in the evening light. Wet streets shine with city lights. A lone Skily car drives across a sleek modern bridge area. The mood is cinematic, electric, and rich." },
    { id: 203, category: "Urban", keywords: ["modern", "architecture", "glass", "valencia"], text: "Valencia City of Arts: Ultra-modern white organic architecture (Calatrava). Bright, high-contrast sunlight against a deep blue sky. Shallow pools of water reflecting the futuristic buildings. A clean, sci-fi utopia vibe." },
    { id: 204, category: "Urban", keywords: ["intersection", "cruce", "roundabout", "rotonda", "urban", "city"], text: "San Sebastián (Donostia) Old Town: A charming intersection in the Parte Vieja district. Old stone buildings with wrought-iron balconies, bursting with hanging flower pots. The road surface is old cobblestone transitioning to modern asphalt at the junction. Golden afternoon light." },
    { id: 205, category: "Urban", keywords: ["bus", "parada", "sidewalk", "acera", "avenue", "calle"], text: "Pamplona Central Avenue: A wide, tree-lined boulevard in Pamplona, famous for its running of the bulls — but today, calm and modern. The old city wall is visible in the background. Gentle dappled sunlight through the plane trees. The road is immaculate." },
    { id: 206, category: "Urban", keywords: ["parking", "aparcar", "estacionamiento", "urban"], text: "Vitoria-Gasteiz Green City: Known as Spain's greenest city. Wide cycle lanes painted vivid green line the road. Electric trams glide silently. Modern buildings are partially covered in vertical gardens. The sky is a perfect Nordic blue. Clean, orderly, progressive." },
    { id: 207, category: "Urban", keywords: ["port", "puerto", "harbor", "coast", "city"], text: "Santander Waterfront: The elegant Cantabrian bay glitters in the background. A wide coastal boulevard lined with Belle Époque buildings on one side and the shimmering sea on the other. A Skily hero car drives along the promenade. White sails of yachts punctuate the blue horizon." },
    { id: 208, category: "Urban", keywords: ["night", "noche", "city", "urban", "lights", "luces"], text: "A Coruña at Blue Hour: The famous Glass Tower Houses (Casas de Cristal) of the old port city glow amber from inside as the sky turns deep indigo at dusk. The reflective sea in the background. Street lights begin to flicker on. A premium, moody, editorial atmosphere." },
    { id: 209, category: "Urban", keywords: ["tunnel", "tunel", "underpass", "urban", "highway"], text: "Oviedo Ring Road at Night: A modern highway slices through the charming Asturian capital. The medieval Cathedral of San Salvador is dramatically floodlit in the background, juxtaposed against the glowing tunnel entrance of the urban motorway. Cinematic high-contrast shot." },

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
