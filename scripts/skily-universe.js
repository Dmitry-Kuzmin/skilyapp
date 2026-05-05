/**
 * ================================================
 * SKILY UNIVERSE — Bank of World Elements
 * ================================================
 * Each variant: { id, category, tags[], text, safeForEmergency? }
 *
 * Usage: imported by generate-images-batch.js
 * The getSkilyBranding() function picks the best match by tags.
 * safeForEmergency: true = can appear in V16/accident scenes (no branding)
 */

// ─── Category 1: Police & Control ────────────────────────────────────────────

const POLICE_VARIANTS = [
  {
    id: 'ANDROID_GUARDIA',
    category: 'police',
    tags: ['intersection', 'crosswalk', 'cruce', 'rotonda', 'roundabout', 'urban', 'traffic control', 'policia', 'agente'],
    text: `**SKILY UNIVERSE ELEMENT — Robo-Guardia:**
A sleek humanoid Android Police Robot stands calmly at the intersection, wearing a modernized Guardia Civil uniform — white and green matte panels with Electric Cyan LED accent lines on the chest and visor. It holds a glowing LED traffic baton. It looks friendly and authoritative, NOT scary. Apple/Tesla design language. In the background: a normal Skily hero car (White/Blue hatchback) passes legally.`,
  },
  {
    id: 'RADAR_DOG',
    category: 'police',
    tags: ['velocidad', 'speed', 'radar', 'adelantar', 'overtake', 'highway', 'carretera', 'autopista', 'bush', 'roadside'],
    text: `**SKILY UNIVERSE ELEMENT — Radar Dog:**
Half-hidden behind a dry Andalusian scrub bush, a robotic dog (Boston Dynamics Spot-style) painted in Traffic Police colors (yellow/blue accents) with a camera-lens head acts as a speed radar. It looks attentive and slightly sneaky. A Skily hero car drives past legally on the asphalt. The backdrop is dry golden Spanish hills.`,
  },
  {
    id: 'HOLOGRAPHIC_STOP',
    category: 'police',
    tags: ['stop', 'ceda', 'yield', 'intersection', 'cruce', 'señal', 'sign'],
    text: `**SKILY UNIVERSE ELEMENT — Holo-Stop:**
A compact police drone (White/Cyan, Skily Universe style) hovers above the road and projects a glowing holographic STOP sign in the air — the sign floats in 3D space in front of an approaching vehicle. The hologram emits clean white and red light. The road is a normal Spanish urban intersection.`,
  },
  {
    id: 'SCHOOL_PATROL_BOT',
    category: 'police',
    tags: ['school', 'escuela', 'children', 'niños', 'pedestrian', 'peatón', 'crosswalk', 'zebra'],
    text: `**SKILY UNIVERSE ELEMENT — School Patrol Bot:**
A friendly white humanoid robot with a glowing cyan safety vest and "GUARDIA ESCOLAR" text on its chest carefully guides children across a zebra crossing. The children look at it with curiosity. The scene is sunny, cheerful, and safe. Traditional Spanish school building in the background.`,
  },
];

// ─── Category 2: Smart City Infrastructure ───────────────────────────────────

const SMART_CITY_VARIANTS = [
  {
    id: 'SMART_BUS_STOP',
    category: 'city',
    tags: ['urban', 'city', 'bus', 'parada', 'avenue', 'calle', 'sidewalk', 'acera', 'ciudad'],
    text: `**SKILY UNIVERSE ELEMENT — Smart Bus Shelter:**
A stunning modern glass and steel bus shelter (MUPI) glows on the sidewalk. Its full-surface OLED screen shows a vivid Skily advertisement: a split-screen of a stressed driver sweating vs. a relaxed Skily driver giving a thumbs-up. The tagline reads "Tu carnet. Modo fácil." in bold typography. The Skily hero car drives calmly past in the adjacent lane.`,
  },
  {
    id: 'SCOOTER_DOCK',
    category: 'city',
    tags: ['parking', 'aparcar', 'estacionamiento', 'bike', 'bicicleta', 'scooter', 'patinete', 'urban', 'sidewalk'],
    text: `**SKILY UNIVERSE ELEMENT — Skily Scooter Dock:**
A sleek electric scooter docking station with backlit cyan LED rings lines the sidewalk. Each slot shows a green LED when occupied by a charged scooter. The station has a subtle "Skily Mobility" logo. The design language is clean white aluminum — Apple Store aesthetic on the street.`,
  },
  {
    id: 'SMART_ZEBRA',
    category: 'city',
    tags: ['crosswalk', 'zebra', 'peatón', 'pedestrian', 'paso', 'crossing'],
    text: `**SKILY UNIVERSE ELEMENT — Smart Crosswalk:**
The zebra crossing itself is embedded with LED strips that light up bright white under the feet of pedestrians approaching it. The stripes glow progressively as a person steps forward. Small embedded sensors are visible in the curb. A Skily hero car has stopped correctly before the glowing crossing.`,
  },
  {
    id: 'INFO_TOTEM',
    category: 'city',
    tags: ['urban', 'city', 'tourist', 'turista', 'plaza', 'square', 'intersection'],
    text: `**SKILY UNIVERSE ELEMENT — Smart Totem:**
A tall, slim glass information pillar (2m tall) stands at the edge of a Spanish plaza. Its transparent OLED surface shows a live 3D map of the area highlighting traffic, parking spots, and a Skily logo badge. The pillar glows softly in the evening light. Old Spanish stone architecture frames the background.`,
  },
];

// ─── Category 3: Delivery & Service Robots ───────────────────────────────────

const DELIVERY_VARIANTS = [
  {
    id: 'SIDEWALK_ROVER',
    category: 'delivery',
    tags: ['sidewalk', 'acera', 'urban', 'city', 'residential', 'barrio', 'pedestrian'],
    text: `**SKILY UNIVERSE ELEMENT — Skily Sidewalk Rover:**
A friendly six-wheeled autonomous delivery robot navigates the sidewalk confidently. Its body is matte white with Electric Cyan accents and a small Skily logo on the side. A green LED indicator shows it's in "happy delivery mode". Locals pass by without concern — it's become a normal part of city life.`,
  },
  {
    id: 'COFFEE_BOT',
    category: 'delivery',
    tags: ['parking', 'traffic jam', 'atasco', 'semaforo', 'traffic light', 'wait', 'cola'],
    text: `**SKILY UNIVERSE ELEMENT — Coffee Bot:**
A charming Robot Barista on wheels (White/Copper design, "Café Skily" logo) rolls between cars stopped at a red light. A driver is accepting a small coffee cup through the car window, smiling. Steam rises from the cups. The robot has a small display screen showing "Americano — €1.50". A light-hearted, human moment.`,
  },
  {
    id: 'PHARMACY_ROVER',
    category: 'delivery',
    tags: ['village', 'pueblo', 'rural', 'residential', 'barrio'],
    text: `**SKILY UNIVERSE ELEMENT — Pharmacy Rover:**
A small, boxy white robot with a large green cross on its side (Farmacia logo) trundles down a narrow village street with stone cobbles. It carries a small box of medicine. An elderly woman at her door reaches down to accept the delivery. The village architecture is traditional Spanish stone. Warm golden afternoon light.`,
  },
];

// ─── Category 4: Nature & Agro-Tech ─────────────────────────────────────────

const NATURE_VARIANTS = [
  {
    id: 'DRONE_SHEPHERD',
    category: 'nature',
    tags: ['mountain', 'montaña', 'rural', 'field', 'campo', 'coast', 'scenic', 'highway', 'animals', 'ganado'],
    text: `**SKILY UNIVERSE ELEMENT — Drone Shepherd:**
A large, graceful white agricultural drone (wide wingspan, Skily-branded) glides silently over a flock of sheep on a vivid green Asturian hillside. The drone projects a soft blue grid of light on the ground below to guide the animals. The ancient stone farmhouse in the distance and the ultra-modern tech create a beautiful contrast.`,
  },
  {
    id: 'SOLAR_BULL',
    category: 'nature',
    tags: ['highway', 'autopista', 'carretera', 'scenic', 'field', 'horizon'],
    text: `**SKILY UNIVERSE ELEMENT — Solar Bull:**
The iconic Osborne Bull silhouette on a Spanish hillside, but reimagined: its surface is completely covered with high-efficiency black solar panels. At the base, a small "Skily Energy" badge. The scene is a wide highway shot at golden hour, the bull a powerful black shape against an intense orange-red sky.`,
  },
  {
    id: 'BEACH_CLEANER',
    category: 'nature',
    tags: ['coast', 'playa', 'beach', 'sea', 'mar', 'coastal'],
    text: `**SKILY UNIVERSE ELEMENT — Beach Cleaner:**
At sunrise on an empty Spanish beach, a compact white robot silently sifts through the golden sand, collecting microplastics and debris. Its underside acts as a sand sieve. A small Skily "Eco" logo is on its side. The sea is calm and turquoise. The robot casts a long shadow in the early morning light.`,
  },
];

// ─── Category 5: Spanish Lifestyle ──────────────────────────────────────────

const LIFESTYLE_VARIANTS = [
  {
    id: 'SKILY_MEETUP',
    category: 'lifestyle',
    tags: ['students', 'group', 'learning', 'test', 'preparation', 'urban', 'park', 'sea'],
    text: `**SKILY UNIVERSE ELEMENT — Skily Meetup:**
A group of 3-4 young, diverse students sit around a parked Skily hero car (White/Blue hatchback) near a scenic Spanish seafront promenade. They hold tablets showing the Skily app UI. They're laughing and studying together. The vibe is energetic, modern, and aspirational. Golden hour light. Skily logo visible on the car door.`,
  },
  {
    id: 'FESTIVAL_DRONE_SHOW',
    category: 'lifestyle',
    tags: ['night', 'noche', 'plaza', 'city', 'urban', 'fiesta', 'festival'],
    text: `**SKILY UNIVERSE ELEMENT — Drone Light Show:**
Instead of fireworks, dozens of small LED drones form glowing patterns in the night sky above a Spanish plaza. They form the shape of a Spanish flag, then morph into a car shape. People below watch with phones up. The Skily hero car is parked elegantly in the foreground, its headlights framing the scene.`,
  },
];

// ─── Combined export ──────────────────────────────────────────────────────────

export const SKILY_UNIVERSE = [
  ...POLICE_VARIANTS,
  ...SMART_CITY_VARIANTS,
  ...DELIVERY_VARIANTS,
  ...NATURE_VARIANTS,
  ...LIFESTYLE_VARIANTS,
];

/**
 * Find the best matching Skily Universe element for the given scene text.
 * Returns the element's text, or null if no good match found.
 *
 * @param {string} sceneText - combined question text + vision analysis
 * @param {number} minScore - minimum tag match score to use an element (default 1)
 */
export function pickSkilyElement(sceneText, minScore = 1) {
  if (!sceneText) return null;
  const lower = sceneText.toLowerCase();

  const scored = SKILY_UNIVERSE.map(el => {
    const score = el.tags.reduce((acc, tag) => acc + (lower.includes(tag) ? 1 : 0), 0);
    return { el, score };
  }).filter(x => x.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  // Pick from top 3 for variety
  const top = scored.slice(0, 3);
  return top[Math.floor(Math.random() * top.length)].el;
}
