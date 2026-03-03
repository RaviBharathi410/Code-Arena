import React, { useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    glow?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const NeonButton: React.FC<NeonButtonProps> = ({
    children,
    className,
    variant = 'primary',
    glow = true,
    size = 'md',
    ...props
}) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
        primary: 'bg-cyan-500 hover:bg-cyan-400 text-black font-semibold',
        secondary: 'border border-white/20 hover:border-cyan-400 text-white',
        danger: 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30',
    };

    return (
        <button
            ref={buttonRef}
            className={cn(
                'rounded-xl transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden',
                'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                sizeClasses[size],
                variantClasses[variant],
                className
            )}
            {...props}
        >
            {glow && variant === 'primary' && (
                <div
                    className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ pointerEvents: 'none' }}
                />
            )}
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </button>
    );
};
