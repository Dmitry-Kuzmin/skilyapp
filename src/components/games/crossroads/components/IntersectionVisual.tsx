import React from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { IntersectionType, Direction, Vehicle as VehicleType, TrafficLightConfig, RegulatorSignal } from '../types';
import { Vehicle } from './Vehicle';
import { cn } from '@/lib/utils';
import { User, ShieldCheck } from 'lucide-react';

interface VisualProps {
    type: IntersectionType;
    hasMainRoad: boolean;
    mainRoadDirections?: Direction[];
    vehicles: VehicleType[];
    onVehicleClick: (id: string) => void;
    clickedOrder: Map<string, number>;
    status: string;
    trafficLights?: TrafficLightConfig[];
    hasRegulator?: boolean;
    regulatorSignal?: RegulatorSignal;
}

export const IntersectionVisual: React.FC<VisualProps> = ({
    type,
    hasMainRoad,
    mainRoadDirections,
    vehicles,
    onVehicleClick,
    clickedOrder,
    status,
    trafficLights,
    hasRegulator,
    regulatorSignal
}) => {
    const Crosswalk = ({ vertical }: { vertical?: boolean }) => (
        <div className={cn(
            "flex gap-1 justify-center items-center opacity-30",
            vertical ? "flex-col w-full h-[30px]" : "flex-row h-full w-[30px]"
        )}>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={cn("bg-white rounded-sm", vertical ? "h-1 w-full" : "w-1 h-full")} />
            ))}
        </div>
    );

    const TrafficLight = ({ config }: { config: TrafficLightConfig }) => {
        const getRot = () => {
            switch (config.position) {
                case 'north': return 0;
                case 'south': return 180;
                case 'east': return 90;
                case 'west': return -90;
                default: return 0;
            }
        };

        return (
            <div
                className="absolute w-6 h-12 bg-slate-900 rounded-md border-2 border-slate-700 flex flex-col items-center justify-around py-1 shadow-lg"
                style={{
                    transform: `rotate(${getRot()}deg)`,
                    top: config.position === 'north' ? '30%' : config.position === 'south' ? '60%' : '45%',
                    left: config.position === 'west' ? '30%' : config.position === 'east' ? '60%' : '45%',
                    marginLeft: config.position === 'north' || config.position === 'south' ? '-45px' : '0',
                    marginTop: config.position === 'west' || config.position === 'east' ? '-45px' : '0',
                    zIndex: 20
                }}
            >
                <div className={cn("w-3 h-3 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]", config.state === 'red' || config.state === 'red-yellow' ? "bg-red-500" : "bg-red-900")} />
                <div className={cn("w-3 h-3 rounded-full shadow-[0_0_5px_rgba(251,191,36,0.5)]", config.state === 'yellow' || config.state === 'red-yellow' ? "bg-amber-400" : "bg-amber-900")} />
                <div className={cn("w-3 h-3 rounded-full shadow-[0_0_5px_rgba(52,211,153,0.5)]", config.state === 'green' ? "bg-emerald-500" : "bg-emerald-900")} />
            </div>
        );
    };

    const Regulator = () => {
        return (
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
            >
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-glow-blue">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    {/* Regulator Stick/Arms */}
                    {regulatorSignal === 'hands-out' && (
                        <>
                            <div className="absolute w-10 h-1 bg-white left-1/2 -translate-x-1/2" />
                            <div className="absolute w-1 h-3 bg-yellow-400 right-0 border border-slate-900" />
                        </>
                    )}
                    {regulatorSignal === 'hand-up' && (
                        <div className="absolute h-10 w-1 bg-white bottom-full left-1/2 -translate-x-1/2">
                            <div className="absolute w-2 h-4 bg-yellow-400 top-0 left-1/2 -translate-x-1/2 border border-slate-900" />
                        </div>
                    )}
                    {regulatorSignal === 'hand-forward' && (
                        <div className="absolute w-10 h-1 bg-white left-full top-1/2 -translate-y-1/2 origin-left -rotate-45">
                            <div className="absolute w-3 h-1 bg-yellow-400 right-0 border border-slate-900" />
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="relative w-full aspect-square max-w-[550px] mx-auto group perspective-1000">
            {/* Tilt Wrapper for 3D effect */}
            <div className="absolute inset-0 transition-transform duration-700 ease-out" style={{ transform: 'rotateX(15deg) translateY(-20px)' }}>
                {/* Base Grass Background */}
                <div className="absolute inset-0 rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] border-8 border-emerald-950/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-900 to-emerald-950" />
                    <div className="absolute inset-0 opacity-20 mix-blend-overlay"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
                    />
                </div>

                {/* Roads Layout */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Horizontal Road */}
                    <div className={cn(
                        "absolute w-full h-[28%] bg-slate-900/90 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-between",
                        type === 'roundabout' ? "hidden" : "block"
                    )}>
                        {type !== 't-shape' && (
                            <>
                                <div className="absolute left-[15%] h-full flex items-center"><Crosswalk /></div>
                                <div className="absolute right-[15%] h-full flex items-center"><Crosswalk /></div>
                            </>
                        )}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 border-t-4 border-dashed border-white/20 -translate-y-1/2" />
                        <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-600/20" />
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-yellow-600/20" />
                    </div>

                    {/* Vertical Road */}
                    <div className={cn(
                        "absolute h-full w-[28%] bg-slate-900/90 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between",
                        type === 't-shape' ? "top-1/2 h-1/2 border-t-4 border-white/10" : type === 'roundabout' ? "hidden" : "block"
                    )}>
                        <div className="absolute top-[15%] w-full flex justify-center"><Crosswalk vertical /></div>
                        {type !== 't-shape' && <div className="absolute bottom-[15%] w-full flex justify-center"><Crosswalk vertical /></div>}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 border-l-4 border-dashed border-white/20 -translate-x-1/2" />
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-yellow-600/20" />
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-yellow-600/20" />
                    </div>

                    {/* Roundabout Visuals */}
                    {type === 'roundabout' && (
                        <div className="absolute inset-8 flex items-center justify-center">
                            {['0deg', '90deg', '180deg', '270deg'].map((rot) => (
                                <div key={rot} className="absolute w-[110%] h-[28%] bg-slate-900/90" style={{ transform: `rotate(${rot})` }}>
                                    <div className="absolute top-1/2 left-0 right-0 h-1 border-t-2 border-dashed border-white/10" />
                                </div>
                            ))}
                            <div className="absolute w-[65%] h-[65%] rounded-full border-[10px] border-slate-800 bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                                <div className="absolute inset-0 border-4 border-dashed border-white/5 rounded-full" />
                                <div className="absolute inset-[25%] rounded-full border-4 border-emerald-500/20 bg-gradient-to-br from-emerald-800 to-green-900 shadow-2xl flex items-center justify-center">
                                    <div className="absolute w-6 h-6 rounded-full bg-emerald-400/20 animate-ping" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Elements Layer */}
                {trafficLights?.map((tl, i) => <TrafficLight key={i} config={tl} />)}
                {hasRegulator && <Regulator />}

                {/* Main Road Signs */}
                {hasMainRoad && mainRoadDirections?.map(dir => (
                    <motion.div
                        key={dir}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                            "absolute w-10 h-10 flex items-center justify-center",
                            dir === 'north' ? "top-[5%] left-1/2 -translate-x-1/2" :
                                dir === 'south' ? "bottom-[5%] left-1/2 -translate-x-1/2" :
                                    dir === 'east' ? "right-[5%] top-1/2 -translate-y-1/2" : "left-[5%] top-1/2 -translate-y-1/2"
                        )}
                    >
                        <div className="w-8 h-8 rotate-45 bg-yellow-500 border-2 border-white shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center">
                            <div className="w-full h-full border-4 border-slate-900" />
                        </div>
                    </motion.div>
                ))}

                {/* Vehicles Layer */}
                <div className="absolute inset-0">
                    <AnimatePresence>
                        {vehicles.map((vehicle) => (
                            <Vehicle
                                key={vehicle.id}
                                vehicle={vehicle}
                                onClick={() => onVehicleClick(vehicle.id)}
                                clickOrder={clickedOrder.get(vehicle.id) ?? null}
                                disabled={status !== 'playing' || clickedOrder.has(vehicle.id)}
                                isChecking={status === 'checking'}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
