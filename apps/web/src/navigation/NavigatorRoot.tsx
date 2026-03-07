import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNav, PAGES } from './NavigationContext';
import { useAuthStore } from '../store/useAuthStore';
import MainLayout from '../components/layout/MainLayout';
import { Login } from '../views/Login';
import { Dashboard } from '../views/Dashboard';
import { GameSpace } from '../views/GameSpace';
import { BattleArena } from '../views/BattleArena';
import { OpponentSelection } from '../views/OpponentSelection';
import type { PageId } from './navigationState';

// ── Page Map ──────────────────────────────────────────────────────────────

const PAGE_MAP: Record<PageId, React.FC<any>> = {
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
};

// Pages that don't require authentication
const PUBLIC_PAGES = new Set<PageId>([PAGES.LOGIN]);

// Pages that render outside MainLayout
const NO_LAYOUT_PAGES = new Set<PageId>([PAGES.LOGIN]);

// ── NavigatorRoot ─────────────────────────────────────────────────────────

const NavigatorRoot: React.FC = () => {
    const { currentPage } = useNav();
    const { isAuthenticated } = useAuthStore();

    // Auth guard: redirect to login if not authenticated and page is protected
    if (!PUBLIC_PAGES.has(currentPage) && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If authenticated user is on login page, redirect to dashboard
    if (currentPage === PAGES.LOGIN && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const { user } = useAuthStore();
    const PageComponent = PAGE_MAP[currentPage] ?? PAGE_MAP[PAGES.DASHBOARD];

    // Render with or without layout
    if (NO_LAYOUT_PAGES.has(currentPage)) {
        return <PageComponent />;
    }

    const { params } = useNav();

    return (
        <MainLayout>
            <PageComponent currentUser={user} {...params} />
        </MainLayout>
    );
};

export default NavigatorRoot;
