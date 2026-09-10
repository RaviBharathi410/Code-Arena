import React, { createContext, useContext, useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { useNav, PAGES } from "../../navigation/NavigationContext";
import type { PageId } from "../../navigation/navigationState";
import {
    Activity, Sword, Beaker, Trophy,
    BarChart2, Cpu, Play, LogOut, X
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Logo } from "../ui/Logo";

import { LayoutProvider, useLayout } from "../../contexts/LayoutContext";

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
    return (
        <LayoutProvider>
            <MainLayoutInner>{children}</MainLayoutInner>
        </LayoutProvider>
    );
}

function MainLayoutInner({ children }: MainLayoutProps) {
    const { currentPage, goToDashboard, goToBattle, goToHistory, goToPractice, goToTournaments, goToLeaderboard, goToSettings, goToLogin } = useNav();
    const { logout } = useAuthStore();
    const NAV_ID_TO_PAGE: Record<string, PageId> = {
        command: PAGES.DASHBOARD,
        battle: PAGES.BATTLE,
        history: PAGES.HISTORY,
        practice: PAGES.PRACTICE,
        tournaments: PAGES.TOURNAMENTS,
        leaderboard: PAGES.LEADERBOARD,
        settings: PAGES.SETTINGS,
    };

    const NAV_ACTIONS: Record<string, () => void> = {
        command: goToDashboard,
        battle: goToBattle,
        history: goToHistory,
        practice: goToPractice,
        tournaments: goToTournaments,
        leaderboard: goToLeaderboard,
        settings: goToSettings,
    };

    const { isMenuOpen, setIsMenuOpen, isLight } = useLayout();
    const isCombatMode = currentPage === PAGES.BATTLE || currentPage === PAGES.ARENA_MATCH || currentPage === PAGES.ARENA_SOLO || currentPage === PAGES.ARENA_PRACTICE;

    useEffect(() => {
        if (isCombatMode && isMenuOpen) {
            setIsMenuOpen(false);
        }
    }, [isCombatMode, isMenuOpen, setIsMenuOpen]);

    const showDrawer = !isCombatMode && isMenuOpen;

    return (
        <div className={`min-h-screen w-full relative transition-colors duration-500 ${isLight ? 'bg-gray-50' : 'bg-[#020202]'}`}>
            {/* Global Static Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className={`absolute inset-0 transition-colors duration-500 ${isLight ? 'bg-gray-50' : 'bg-[#020202]'}`} />
                <div className="absolute inset-0" style={{
                    background: isLight
                        ? 'radial-gradient(ellipse 80% 80% at 20% 30%, rgba(124,58,237,0.03) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 70%, rgba(159,123,255,0.02) 0%, transparent 60%)'
                        : 'radial-gradient(ellipse 80% 80% at 20% 30%, rgba(124,58,237,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 70%, rgba(159,123,255,0.08) 0%, transparent 60%)',
                }} />
                {/* Hex pattern overlay */}
                <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{
                    maskImage: 'radial-gradient(circle at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)',
                }}>
                    <svg className="h-full w-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="hexPatternStatic" width="56" height="48.5" patternUnits="userSpaceOnUse">
                                <path
                                    d="M14 0 L42 0 L56 24.25 L42 48.5 L14 48.5 L0 24.25 Z"
                                    fill="none"
                                    stroke={isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'}
                                    strokeWidth="1"
                                />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#hexPatternStatic)" />
                    </svg>
                </div>
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-r transition-all duration-500 ${isLight ? 'from-white/40 via-transparent to-transparent' : 'from-black/60 via-transparent to-transparent'}`} />
            </div>

            {/* Global Side Menu Drawer */}
            <div className={`fixed top-0 left-0 h-screen w-[280px] z-[60] transition-all duration-500 ease-expo transform 
                    ${showDrawer ? 'translate-x-0' : '-translate-x-full'} 
                    ${isLight ? 'bg-white border-r border-black/10' : 'bg-[#07070c]/95 backdrop-blur-2xl border-r border-purple-500/20 shadow-[10px_0_30px_rgba(0,0,0,0.8)]'}`}
            >
                <div className="p-6 h-full flex flex-col relative overflow-hidden">
                    {/* Subtle top-right glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex justify-between items-center mb-8 px-2">
                        <Logo isLight={isLight} />
                        <button 
                            onClick={() => setIsMenuOpen(false)} 
                            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl lg:hidden transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-7">
                        {navSections.map((section) => (
                            <div key={section.label} className="space-y-2">
                                <div className="flex items-center gap-2 px-4 mb-2">
                                    <span className="w-1 h-1 rounded-full bg-purple-500/60" />
                                    <p className="text-[9px] font-bold tracking-wider text-purple-400/80 uppercase">
                                        // {section.label}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = currentPage === NAV_ID_TO_PAGE[item.id];
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    NAV_ACTIONS[item.id]?.();
                                                    setIsMenuOpen(false);
                                                }}
                                                className={`w-full group relative flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all font-semibold uppercase text-xs tracking-wider border overflow-hidden
                                                        ${isActive
                                                        ? (isLight 
                                                            ? 'bg-purple-50 text-purple-900 border-purple-200 shadow-sm font-bold' 
                                                            : 'bg-white/[0.04] text-white border-white/10 font-bold')
                                                        : (isLight 
                                                            ? 'text-gray-600 hover:bg-purple-50 hover:text-purple-900 border-transparent' 
                                                            : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border-transparent hover:border-white/10')
                                                    }`}
                                            >
                                                <Icon size={17} className={`transition-transform duration-200 group-hover:scale-110 ${
                                                    isActive 
                                                        ? (isLight ? 'text-purple-700' : 'text-purple-300') 
                                                        : 'text-gray-500 group-hover:text-purple-300'
                                                }`} />
                                                <span className="flex-1 text-left">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div className="mt-auto pt-4 border-t border-white/10">
                        <button
                            onClick={() => { logout(); goToLogin(); setIsMenuOpen(false); }}
                            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-red-400/90 hover:text-red-300 font-bold uppercase text-xs tracking-wider hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all group"
                        >
                            <LogOut size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
                            <span>Terminate Session</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Global Backdrop */}
            {showDrawer && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className={`h-full w-full transition-all duration-500 ${showDrawer ? 'md:pl-[280px]' : ''}`}>
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
    );
}
