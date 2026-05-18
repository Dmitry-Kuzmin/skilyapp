import React from 'react';
import { cn } from '@/lib/utils';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';

interface AISphereProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

/**
 * AISphere — thin wrapper around SkilyAICharacter.
 * Kept for back-compat (Dashboard.tsx uses this directly).
 */
export const AISphere: React.FC<AISphereProps> = ({ size = 'md', className }) => {
    return <SkilyAICharacter size={size} mood="idle" animate className={cn(className)} />;
};
