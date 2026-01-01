import { useEffect, useRef } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
}

interface ParticleEmitterProps {
    isActive: boolean;
    color?: string;
}

export const ParticleEmitter: React.FC<ParticleEmitterProps> = ({
    isActive,
    color = 'rgba(59, 130, 246, 0.8)' // blue-500
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>();
    const lastSpawnRef = useRef<number>(0);

    useEffect(() => {
        console.log('[ParticleEmitter] Mounted, isActive:', isActive);
        return () => console.log('[ParticleEmitter] Unmounted');
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match button
        const updateCanvasSize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight + 100; // Extra space for falling particles
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        const createParticle = (x: number): Particle => {
            return {
                id: Math.random(),
                x,
                y: 0,
                vx: (Math.random() - 0.5) * 2, // Random horizontal velocity
                vy: -Math.random() * 2 - 1, // Initial upward velocity
                life: 1,
                maxLife: 1.2,
            };
        };

        const updateParticles = (deltaTime: number) => {
            particlesRef.current = particlesRef.current.filter(p => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Apply gravity
                p.vy += 0.15;

                // Update life
                p.life -= deltaTime / 1000;

                return p.life > 0;
            });
        };

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach(p => {
                const alpha = p.life / p.maxLife;
                const size = 2 + (1 - alpha) * 1;

                // Glow effect
                ctx.shadowBlur = 8;
                ctx.shadowColor = color;

                // Draw particle
                ctx.fillStyle = color.replace('0.8', String(alpha * 0.8));
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        let lastTime = performance.now();

        const animate = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Spawn new particles when active
            if (isActive && currentTime - lastSpawnRef.current > 100) {
                const x = Math.random() * canvas.width;
                particlesRef.current.push(createParticle(x));
                lastSpawnRef.current = currentTime;
            }

            updateParticles(deltaTime);
            drawParticles();

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, color]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none overflow-visible"
            style={{
                zIndex: 999,
                mixBlendMode: 'screen'
            }}
        />
    );
};
