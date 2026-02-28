import React from 'react';
import { motion } from '@/components/optimized/Motion';
import { Vehicle as VehicleType } from '../types';
import { cn } from '@/lib/utils';

interface VehicleProps {
    vehicle: VehicleType;
    onClick: () => void;
    clickOrder: number | null;
    disabled: boolean;
    isChecking: boolean;
}

export const Vehicle: React.FC<VehicleProps> = ({ vehicle, onClick, clickOrder, disabled, isChecking }) => {
    const isCorrect = isChecking && clickOrder === vehicle.correctOrder;
    const isWrong = isChecking && clickOrder !== null && clickOrder !== vehicle.correctOrder;

    // Сдвиг для эффекта объема
    const getVehicleDetails = (type: string) => {
        switch (type) {
            case 'ambulance':
                return {
                    body: <rect x="2" y="2" width="76" height="46" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="2" />,
                    windows: <rect x="50" y="8" width="15" height="34" rx="4" fill="#64748b" opacity="0.8" />,
                    extra: (
                        <>
                            <rect x="25" y="15" width="20" height="20" fill="#ef4444" rx="2" />
                            <rect x="30" y="10" width="10" height="30" fill="#ef4444" rx="2" />
                            <rect x="20" y="20" width="30" height="10" fill="#ef4444" rx="2" />
                            <rect x="68" y="5" width="6" height="10" fill="#3b82f6" rx="1" className="animate-pulse" />
                            <rect x="68" y="35" width="6" height="10" fill="#ef4444" rx="1" className="animate-pulse" />
                        </>
                    )
                };
            case 'tram':
                return {
                    body: <rect x="0" y="5" width="80" height="40" rx="4" fill={vehicle.color} />,
                    windows: (
                        <>
                            <rect x="5" y="10" width="10" height="30" rx="2" fill="#94a3b8" />
                            <rect x="20" y="10" width="10" height="30" rx="2" fill="#94a3b8" />
                            <rect x="35" y="10" width="10" height="30" rx="2" fill="#94a3b8" />
                            <rect x="50" y="10" width="10" height="30" rx="2" fill="#94a3b8" />
                            <rect x="65" y="10" width="10" height="30" rx="2" fill="#94a3b8" />
                        </>
                    ),
                    extra: <rect x="75" y="15" width="5" height="20" fill="#475569" />
                };
            default: // Car
                return {
                    body: (
                        <>
                            <rect x="2" y="2" width="76" height="46" rx="12" fill={vehicle.color} />
                            {/* Полоска на капоте для направления */}
                            <path d="M 60 10 L 75 25 L 60 40" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
                        </>
                    ),
                    windows: (
                        <>
                            <path d="M 50 8 Q 70 8 72 25 Q 70 42 50 42 Z" fill="#1e293b" opacity="0.7" />
                            <rect x="15" y="8" width="30" height="34" rx="4" fill="#1e293b" opacity="0.5" />
                        </>
                    ),
                    extra: (
                        <>
                            <rect x="74" y="10" width="4" height="8" rx="2" fill="#fbbf24" className="animate-pulse" />
                            <rect x="74" y="32" width="4" height="8" rx="2" fill="#fbbf24" className="animate-pulse" />
                        </>
                    )
                };
        }
    };

    const details = getVehicleDetails(vehicle.type);

    return (
        <motion.div
            layoutId={`vehicle-container-${vehicle.id}`}
            className="absolute"
            style={{
                left: `${vehicle.position.x}%`,
                top: `${vehicle.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${vehicle.position.rotation}deg)`,
                width: '80px',
                height: '60px',
                zIndex: vehicle.isClicked ? 5 : 10
            }}
        >
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: vehicle.isClicked ? 0.7 : 1,
                    y: vehicle.isClicked ? 0 : -5,
                    filter: vehicle.isClicked ? 'grayscale(0.5)' : 'none'
                }}
                whileHover={!disabled ? { scale: 1.1, y: -10 } : {}}
                whileTap={!disabled ? { scale: 0.9 } : {}}
                onClick={onClick}
                disabled={disabled}
                className={cn(
                    "w-full h-full relative flex items-center justify-center transition-all duration-300",
                    "drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]",
                    isCorrect && "drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]",
                    isWrong && "drop-shadow-[0_0_15px_rgba(248,113,113,0.8)]"
                )}
            >
                <svg viewBox="0 0 80 50" className="w-full h-full">
                    {/* Shadow layer within SVG for better depth */}
                    <rect x="5" y="5" width="70" height="40" rx="10" fill="black" opacity="0.2" />

                    {details.body}
                    {details.windows}
                    {details.extra}

                    {/* Поворотники */}
                    {vehicle.turn !== 'straight' && !vehicle.isClicked && (
                        <motion.circle
                            cx="70"
                            cy={vehicle.turn === 'right' ? "40" : "10"}
                            r="4"
                            fill="#fbbf24"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                        />
                    )}
                </svg>

                {/* Click Order Badge - fixed rotation and position */}
                {clickOrder !== null && (
                    <motion.div
                        initial={{ scale: 0, scaleY: 0 }}
                        animate={{ scale: 1, scaleY: 1 }}
                        className={cn(
                            "absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg",
                            "border-4 border-slate-900 shadow-2xl z-50",
                            isCorrect ? "bg-emerald-500 text-white" : isWrong ? "bg-red-500 text-white" : "bg-white text-slate-900"
                        )}
                        style={{ transform: `rotate(${-vehicle.position.rotation}deg)` }}
                    >
                        {clickOrder}
                    </motion.div>
                )}

                {/* Label - fixed rotation */}
                {clickOrder === null && (
                    <div
                        className="absolute inset-x-0 -bottom-8 text-center text-[12px] font-black text-white bg-slate-900/50 px-2 py-0.5 rounded-full backdrop-blur-sm"
                        style={{ transform: `rotate(${-vehicle.position.rotation}deg)` }}
                    >
                        {vehicle.label}
                    </div>
                )}
            </motion.button>
        </motion.div>
    );
};
