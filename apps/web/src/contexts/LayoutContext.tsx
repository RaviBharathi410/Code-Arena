import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
    isMenuOpen: boolean;
    setIsMenuOpen: (open: boolean) => void;
    isLight: boolean;
    setTheme: (theme: 'dark' | 'light') => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(() => {
        const saved = localStorage.getItem('arena_menu_open');
        return saved === null ? false : saved === 'true';
    });

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('arena_theme') as 'dark' | 'light') || 'dark';
    });

    const isLight = theme === 'light';

    useEffect(() => {
        localStorage.setItem('arena_menu_open', isMenuOpen.toString());
    }, [isMenuOpen]);

    useEffect(() => {
        localStorage.setItem('arena_theme', theme);
        if (isLight) {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, [theme, isLight]);

    return (
        <LayoutContext.Provider value={{ isMenuOpen, setIsMenuOpen, isLight, setTheme }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error("useLayout must be used within LayoutProvider");
    return context;
};
