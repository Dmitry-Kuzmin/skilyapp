export type VehicleType = 'car' | 'ambulance' | 'police' | 'fire' | 'tram' | 'truck' | 'bus' | 'motorcycle';
export type Direction = 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';
export type TurnDirection = 'left' | 'straight' | 'right' | 'u-turn';
export type IntersectionType = 'regular' | 't-shape' | 'roundabout' | 'multi-lane' | 'diagonal';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Position {
    x: number;
    y: number;
    rotation: number;
}

export type TrafficLightState = 'red' | 'yellow' | 'green' | 'red-yellow';
export type RegulatorSignal = 'hands-out' | 'hand-up' | 'hand-forward';

export interface TrafficLightConfig {
    position: Direction;
    state: TrafficLightState;
}

export interface Vehicle {
    id: string;
    type: VehicleType;
    color: string;
    direction: Direction;
    turn: TurnDirection;
    priority: number; // 0 = normal, 1 = right-hand rule, 2 = special (siren), 3 = tram
    label: string;
    position: Position;
    isClicked: boolean;
    isCorrect: boolean | null;
    correctOrder: number;
    speed?: number; // for animation
    brand?: string; // for visual variety
}

export interface Scenario {
    id: string;
    title: string;
    description: string;
    type: IntersectionType;
    hasTrafficLights: boolean;
    trafficLights?: TrafficLightConfig[];
    hasRegulator?: boolean;
    regulatorSignal?: RegulatorSignal;
    hasMainRoad: boolean;
    mainRoadDirections?: Direction[];
    vehicles: Vehicle[];
    explanation: string;
    difficulty: Difficulty;
    tags?: string[];
}

export interface GameState {
    status: 'menu' | 'playing' | 'checking' | 'result' | 'paused';
    currentScenarioIndex: number;
    score: number;
    combo: number;
    correctAnswers: number;
    totalAttempts: number;
    elapsedTime: number;
    history: string[]; // ids of completed scenarios
}
