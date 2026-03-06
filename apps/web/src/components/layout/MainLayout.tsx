import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Activity, Sword, Beaker, Trophy,
    BarChart2, Cpu, Play, LogOut, Menu, X
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

interface LayoutContextType {
    isMenuOpen: boolean;
    setIsMenuOpen: (open: boolean) => void;
    isLight: boolean;
    setTheme: (theme: 'dark' | 'light') => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error("useLayout must be used within MainLayout");
    return context;
};

interface MainLayoutProps {
    children: React.ReactNode;
}

const navSections = [
    {
        label: "Operations",
        items: [
            { id: 'command', label: 'Command Hub', icon: Activity, path: '/dashboard' },
            { id: 'battle', label: 'Battle Arena', icon: Sword, path: '/battle' },
            { id: 'history', label: 'Battle Log', icon: Play, path: '/history' },
            { id: 'practice', label: 'Practice Lab', icon: Beaker, path: '/practice' },
            { id: 'tournaments', label: 'Tournaments', icon: Trophy, path: '/tournaments' },
        ]
    },
    {
        label: "Intel",
        items: [
            { id: 'leaderboard', label: 'Leaderboard', icon: BarChart2, path: '/leaderboard' },
            { id: 'settings', label: 'Settings', icon: Cpu, path: '/settings' },
        ]
    }
];

export default function MainLayout({ children }: MainLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuthStore();

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

    const activeTab = location.pathname.split('/')[1] || 'command';

    return (
        <LayoutContext.Provider value={{ isMenuOpen, setIsMenuOpen, isLight, setTheme }}>
            <div className={`h-screen w-full relative overflow-hidden transition-colors duration-500 ${isLight ? 'bg-gray-50' : 'bg-[#020202]'}`}>

                {/* Global Side Menu Drawer */}
                <div className={`fixed top-0 left-0 h-screen w-[280px] z-[60] transition-all duration-500 ease-expo transform 
                        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                        ${isLight ? 'bg-white border-r border-black/10' : 'bg-[#020202]/95 backdrop-blur-2xl border-r border-white/10'}`}
                >
                    <div className="p-8 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-12">
                            <div className="flex items-center gap-3">
                                <Activity className="text-cyan-500" size={24} />
                                <span className="text-xl font-black italic tracking-tighter uppercase">Arena<span className="opacity-40">Protocol</span></span>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-xl lg:hidden">
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                            {navSections.map((section) => (
                                <div key={section.label} className="space-y-3">
                                    <p className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase px-5">
                                        {section.label}
                                    </p>
                                    <div className="space-y-1">
                                        {section.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = location.pathname === item.path || (item.id === 'command' && location.pathname === '/dashboard');
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        navigate(item.path);
                                                        setIsMenuOpen(false); // Hide once selected
                                                    }}
                                                    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold uppercase text-xs tracking-widest border
                                                            ${isActive
                                                            ? (isLight ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-black border-white shadow-lg shadow-white/10')
                                                            : (isLight ? 'text-gray-500 hover:bg-black/5 border-transparent' : 'text-gray-400 hover:bg-white/5 border-transparent')
                                                        }`}
                                                >
                                                    <Icon size={18} className={isActive ? (isLight ? 'text-white' : 'text-black') : 'opacity-60'} />
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>

                        <div className="mt-auto pt-6 border-t border-white/10">
                            <button
                                onClick={() => { logout(); navigate('/login'); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 font-bold uppercase text-xs tracking-widest hover:bg-red-500/10 transition-all"
                            >
                                <LogOut size={18} />
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>

                {/* Global Backdrop */}
                {isMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                        onClick={() => setIsMenuOpen(false)}
                    />
                )}

                {/* Main Content Area */}
                <main className={`h-full w-full transition-all duration-500 ${isMenuOpen ? 'md:pl-[280px]' : ''}`}>
                    {children}
                </main>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { 
                        background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'};
                        border-radius: 10px;
                    }
                    .ease-expo { transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
            </div>
        </LayoutContext.Provider>
    );
}
