import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hoverable = true }) => {
    return (
        <div className={cn(
            "glass-effect rounded-2xl p-6 transition-all duration-300",
            hoverable && "hover:border-border-bright hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]",
            className
        )}>
            {children}
        </div>
    );
};
