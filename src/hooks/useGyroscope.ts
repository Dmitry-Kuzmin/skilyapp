import { useState, useEffect } from 'react';

export function useGyroscope() {
    const [gyro, setGyro] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            // gamma is left-to-right tilt in degrees [-90, 90]
            // beta is front-to-back tilt in degrees [-180, 180]
            const x = event.gamma || 0; // tilt left/right
            const y = event.beta || 0;  // tilt front/back
            
            setGyro({ 
                x: Math.max(-30, Math.min(30, x)), 
                y: Math.max(-30, Math.min(30, y - 45)) // Offset by 45 degrees as typical holding angle
            });
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, []);

    return gyro;
}
