import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNav, PAGES } from './NavigationContext';
import { useAuthStore } from '../store/useAuthStore';
import MainLayout from '../components/layout/MainLayout';
import { Login } from '../views/Login';
import { Landing } from '../views/Landing';
import { Dashboard } from '../views/Dashboard';
import { GameSpace } from '../views/GameSpace';
import { BattleArena } from '../views/BattleArena';
import { OpponentSelection } from '../views/OpponentSelection';
import { ProblemsList } from '../views/ProblemsList';
import { HostedRoomSpace } from '../views/HostedRoomSpace';
import type { PageId } from './navigationState';

// ── Page Map ──────────────────────────────────────────────────────────────

const PAGE_MAP: Record<PageId, React.FC<any>> = {
    [PAGES.LANDING]: Landing,
    [PAGES.LOGIN]: Login,
    [PAGES.DASHBOARD]: Dashboard,
    [PAGES.BATTLE]: Dashboard,
    [PAGES.PRACTICE]: Dashboard,
    [PAGES.HISTORY]: Dashboard,
    [PAGES.TOURNAMENTS]: Dashboard,
    [PAGES.LEADERBOARD]: Dashboard,
    [PAGES.PROFILE]: Dashboard,
    [PAGES.SETTINGS]: Dashboard,
    [PAGES.OPPONENTS]: OpponentSelection,
    [PAGES.ARENA_SOLO]: GameSpace,
    [PAGES.ARENA_PRACTICE]: GameSpace,
    [PAGES.ARENA_MATCH]: BattleArena,
    [PAGES.PROBLEMS]: ProblemsList,
    [PAGES.HOSTED_ROOM]: HostedRoomSpace,
};

// Pages that don't require authentication
const PUBLIC_PAGES = new Set<PageId>([PAGES.LANDING, PAGES.LOGIN]);

// Pages that render outside MainLayout
const NO_LAYOUT_PAGES = new Set<PageId>([PAGES.LANDING, PAGES.LOGIN, PAGES.HOSTED_ROOM]);

// ── NavigatorRoot ─────────────────────────────────────────────────────────

const NavigatorRoot: React.FC = () => {
    const { currentPage, params } = useNav();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const fetchProfile = useAuthStore((state) => state.fetchProfile);
    const authLoading = useAuthStore((state) => state.authLoading);

    // Verify session once on initial load
    React.useEffect(() => {
        fetchProfile();
    }, []);

    if (authLoading && !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050507]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
        );
    }

    // Auth guard: redirect to login if not authenticated and page is protected
    if (!PUBLIC_PAGES.has(currentPage) && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If authenticated user is on login page, redirect to dashboard
    if (currentPage === PAGES.LOGIN && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const PageComponent = PAGE_MAP[currentPage] ?? PAGE_MAP[PAGES.DASHBOARD];

    // Render with or without layout
    if (NO_LAYOUT_PAGES.has(currentPage)) {
        return <PageComponent currentUser={user} {...params} />;
    }

    return (
        <MainLayout>
            <PageComponent currentUser={user} {...params} />
        </MainLayout>
    );
};

export default NavigatorRoot;
