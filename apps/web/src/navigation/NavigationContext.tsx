import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    NavigationState,
    NavigationAction,
    navigationReducer,
    initialNavigationState,
    PAGES,
    MODALS,
    PageId,
    ModalId,
    NavParams,
    pathToPage,
    pageToPath,
} from './navigationState';

// ── Context Shape ─────────────────────────────────────────────────────────

interface NavigationContextType {
    state: NavigationState;
    dispatch: React.Dispatch<NavigationAction>;

    // Named action creators — the antigravity interface
    goToDashboard: () => void;
    goToLogin: () => void;
    goToBattle: () => void;
    goToPractice: () => void;
    goToHistory: () => void;
    goToTournaments: () => void;
    goToLeaderboard: () => void;
    goToProfile: () => void;
    goToSettings: () => void;
    goToOpponents: () => void;
    goToBattleLobby: () => void;
    goToTournament: () => void;
    goToArenaSolo: () => void;
    goToArenaPractice: (type?: string) => void;
    goToArenaMatch: (matchId: string, matchState?: any) => void;
    goBack: () => void;
    openModal: (modal: ModalId) => void;
    closeModal: () => void;

    // Derived state
    currentPage: PageId;
    params: NavParams;
    canGoBack: boolean;
    modal: ModalId | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const routerNavigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [state, dispatch] = useReducer(navigationReducer, initialNavigationState);

    // Track whether we're currently syncing from URL to prevent loops
    const isSyncingFromUrl = useRef(false);
    const isSyncingToUrl = useRef(false);

    // ── URL → State sync ──────────────────────────────────────────────
    useEffect(() => {
        if (isSyncingToUrl.current) {
            isSyncingToUrl.current = false;
            return;
        }

        const { page, params } = pathToPage(location.pathname);

        // Merge search params into NavParams
        const practiceType = searchParams.get('type') || undefined;
        const matchIdFromQuery = searchParams.get('id') || undefined;
        const mergedParams: NavParams = {
            ...params,
            practiceType: practiceType ?? params.practiceType,
            matchId: matchIdFromQuery ?? params.matchId,
            matchState: location.state ?? undefined,
        };

        if (page !== state.currentPage || JSON.stringify(mergedParams) !== JSON.stringify(state.params)) {
            isSyncingFromUrl.current = true;
            dispatch({ type: 'NAVIGATE', page, params: mergedParams });
        }
    }, [location.pathname, location.state, searchParams]);

    // ── Helper: navigate and sync URL ─────────────────────────────────
    const navigateTo = useCallback((page: PageId, params?: NavParams, options?: { replace?: boolean }) => {
        isSyncingToUrl.current = true;
        const path = pageToPath(page, params);

        if (options?.replace) {
            dispatch({ type: 'REPLACE', page, params });
        } else {
            dispatch({ type: 'NAVIGATE', page, params });
        }

        routerNavigate(path, {
            replace: options?.replace,
            state: params?.matchState,
        });
    }, [routerNavigate]);

    // ── Named Action Creators ─────────────────────────────────────────

    const goToDashboard = useCallback(() => navigateTo(PAGES.DASHBOARD), [navigateTo]);
    const goToLogin = useCallback(() => {
        isSyncingToUrl.current = true;
        dispatch({ type: 'RESET', page: PAGES.LOGIN });
        routerNavigate('/login', { replace: true });
    }, [routerNavigate]);
    const goToBattle = useCallback(() => navigateTo(PAGES.BATTLE), [navigateTo]);
    const goToPractice = useCallback(() => navigateTo(PAGES.PRACTICE), [navigateTo]);
    const goToHistory = useCallback(() => navigateTo(PAGES.HISTORY), [navigateTo]);
    const goToTournaments = useCallback(() => navigateTo(PAGES.TOURNAMENTS), [navigateTo]);
    const goToLeaderboard = useCallback(() => navigateTo(PAGES.LEADERBOARD), [navigateTo]);
    const goToProfile = useCallback(() => navigateTo(PAGES.PROFILE), [navigateTo]);
    const goToSettings = useCallback(() => navigateTo(PAGES.SETTINGS), [navigateTo]);
    const goToOpponents = useCallback(() => navigateTo(PAGES.OPPONENTS), [navigateTo]);
    const goToBattleLobby = useCallback(() => navigateTo(PAGES.BATTLE), [navigateTo]);
    const goToTournament = useCallback(() => navigateTo(PAGES.TOURNAMENTS), [navigateTo]);
    const goToArenaSolo = useCallback(() => navigateTo(PAGES.ARENA_SOLO), [navigateTo]);

    const goToArenaPractice = useCallback((type?: string) => {
        navigateTo(PAGES.ARENA_PRACTICE, { practiceType: type });
    }, [navigateTo]);

    const goToArenaMatch = useCallback((matchId: string, matchState?: any) => {
        navigateTo(PAGES.ARENA_MATCH, { matchId, matchState });
    }, [navigateTo]);

    const goBack = useCallback(() => {
        if (state.history.length > 0) {
            isSyncingToUrl.current = true;
            dispatch({ type: 'GO_BACK' });
            routerNavigate(-1);
        } else {
            goToDashboard();
        }
    }, [state.history.length, routerNavigate, goToDashboard]);

    const openModal = useCallback((modal: ModalId) => {
        dispatch({ type: 'OPEN_MODAL', modal });
    }, []);

    const closeModal = useCallback(() => {
        dispatch({ type: 'CLOSE_MODAL' });
    }, []);

    const value: NavigationContextType = {
        state,
        dispatch,
        goToDashboard,
        goToLogin,
        goToBattle,
        goToPractice,
        goToHistory,
        goToTournaments,
        goToLeaderboard,
        goToProfile,
        goToSettings,
        goToOpponents,
        goToBattleLobby,
        goToTournament,
        goToArenaSolo,
        goToArenaPractice,
        goToArenaMatch,
        goBack,
        openModal,
        closeModal,
        currentPage: state.currentPage,
        params: state.params,
        canGoBack: state.canGoBack,
        modal: state.modal,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

// ── useNav Hook ───────────────────────────────────────────────────────────

export function useNav(): NavigationContextType {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNav() must be used within a <NavigationProvider>. Wrap your app in <NavigationProvider>.');
    }
    return context;
}

export { PAGES, MODALS };
export type { PageId, ModalId, NavParams };
