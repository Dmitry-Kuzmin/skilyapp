import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Move3d } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreeDImageViewerProps {
    src: string;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ThreeDImageViewer({ src, alt, isOpen, onClose }: ThreeDImageViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden'; // Lock scroll
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = ''; // Unlock scroll
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const calculateRotation = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        // Calculate mouse position relative to center of the image
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Rotation intensity (degrees) - Reduced for subtlety
        const intensity = 5;

        // Calculate rotation axis
        const rotateX = ((y - centerY) / centerY) * -intensity;
        const rotateY = ((x - centerX) / centerX) * intensity;

        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        calculateRotation(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        calculateRotation(touch.clientX, touch.clientY);
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
        setIsHovered(false);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl animate-in fade-in duration-300"
            onClick={onClose}
            style={{ perspective: '3000px' }}
        >
            {/* Header controls */}
            <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                <div className="hidden md:flex bg-white/5 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-white/50 border border-white/10 items-center gap-2">
                    <Move3d className="w-3 h-3 text-cyan-400" />
                    Interactive 3D • Touch & Hover
                </div>
                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md hover:scale-105 active:scale-95 shadow-xl border border-white/10"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Main 3D Container */}
            <div
                className="relative w-full h-full flex items-center justify-center p-4 md:p-8 lg:p-16 touch-none"
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseLeave}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    ref={containerRef}
                    onClick={(e) => e.stopPropagation()}
                    className="relative transition-transform duration-100 ease-out will-change-transform"
                    style={{
                        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* 1. Ambilight Glow (Deep Blur behind) */}
                    <div
                        className="absolute inset-0 blur-[60px] md:blur-[100px] opacity-60 scale-105 pointer-events-none transition-opacity duration-500"
                        style={{
                            backgroundImage: `url(${src})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />

                    {/* 2. Main Image Card */}
                    <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-black/50 border border-white/10 group max-w-[95vw] max-h-[85vh]">
                        <img
                            src={src}
                            alt={alt}
                            className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl md:rounded-3xl"
                            draggable={false}
                        />

                        {/* 3. Cyber Scan Effect (On Open) */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-3xl">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-[scan_1.5s_ease-in-out_1] opacity-0"
                                style={{ animationFillMode: 'forwards' }} />
                        </div>

                        {/* 4. Glossy Reflection */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none rounded-2xl md:rounded-3xl" />
                    </div>

                    {/* 5. Floating Label (Optional 3D Element) */}
                    <div
                        className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full text-white/80 text-sm transform translate-z-10 shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden md:block"
                        style={{ transform: 'translateZ(50px) translateX(-50%)' }}
                    >
                        Hover to tilt • Esc to close
                    </div>
                </div>
            </div>

            {/* Inline Styles for Scan Animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}} />
        </div>,
        document.body
    );
}
