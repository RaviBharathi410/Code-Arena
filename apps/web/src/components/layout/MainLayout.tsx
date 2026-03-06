import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
    children: React.ReactNode;
}

// Routes where we hide the sidebar (full-screen views)
const FULL_SCREEN_ROUTES = ["/battle", "/arena", "/tournaments", "/practice", "/opponents", "/dashboard", "/leaderboard", "/profile", "/settings"];

export default function MainLayout({ children }: MainLayoutProps) {
    const location = useLocation();
    const isFullScreen = FULL_SCREEN_ROUTES.some(r => location.pathname.startsWith(r));

    if (isFullScreen) {
        return (
            <div className="h-screen w-full bg-[#020202] relative overflow-hidden">
                {children}
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0A0A12] overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
