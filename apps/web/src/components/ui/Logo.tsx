import React from 'react';
import logoDark from '../../assets/codearena-logo-dark.png';
import logoLite from '../../assets/codearena-logo-lite.png';

interface LogoProps {
    className?: string;
    size?: number;
    showText?: boolean;
    isLight?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 40, showText = true, isLight = false }) => {
    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <img 
                src={isLight ? logoLite : logoDark} 
                alt="CodeArena Logo" 
                className="object-contain transition-all duration-500"
                style={{ width: size, height: size }}
            />
            {showText && (
                <div className="flex flex-col" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    <span className={`text-2xl font-black tracking-tighter uppercase leading-none ${isLight ? 'text-black' : 'text-white'}`}>
                        Code<span className="text-accent-secondary">Arena</span>
                    </span>
                </div>
            )}
        </div>
    );
};
