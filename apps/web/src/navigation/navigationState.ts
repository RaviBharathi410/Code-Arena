// ── Page & Modal Registries ───────────────────────────────────────────────

export const PAGES = {
    LOGIN: 'login',
    DASHBOARD: 'dashboard',
    BATTLE: 'battle',
    PRACTICE: 'practice',
    HISTORY: 'history',
    TOURNAMENTS: 'tournaments',
    LEADERBOARD: 'leaderboard',
    PROFILE: 'profile',
    SETTINGS: 'settings',
    OPPONENTS: 'opponents',
    ARENA_SOLO: 'arena_solo',
    ARENA_PRACTICE: 'arena_practice',
    ARENA_MATCH: 'arena_match',
} as const;

export type PageId = (typeof PAGES)[keyof typeof PAGES];

export const MODALS = {
    CONFIRM_LEAVE: 'confirm_leave',
    MATCH_RESULTS: 'match_results',
} as const;

export type ModalId = (typeof MODALS)[keyof typeof MODALS];

// ── Path <-> Page Bidirectional Maps ──────────────────────────────────────

export const PAGE_TO_PATH: Record<PageId, string> = {
    [PAGES.LOGIN]: '/login',
    [PAGES.DASHBOARD]: '/dashboard',
    [PAGES.BATTLE]: '/battle',
    [PAGES.PRACTICE]: '/practice',
    [PAGES.HISTORY]: '/history',
    [PAGES.TOURNAMENTS]: '/tournaments',
    [PAGES.LEADERBOARD]: '/leaderboard',
    [PAGES.PROFILE]: '/profile',
    [PAGES.SETTINGS]: '/settings',
    [PAGES.OPPONENTS]: '/opponents',
    [PAGES.ARENA_SOLO]: '/arena/solo',
    [PAGES.ARENA_PRACTICE]: '/arena/practice',
    [PAGES.ARENA_MATCH]: '/arena/:matchId',
};

/** Resolve a URL pathname to a PageId. Handles dynamic segments like /arena/:matchId. */
export function pathToPage(pathname: string): { page: PageId; params: NavParams } {
    const params: NavParams = {};

    // Static matches first
    const staticMap: Record<string, PageId> = {
        '/login': PAGES.LOGIN,
        '/dashboard': PAGES.DASHBOARD,
        '/battle': PAGES.BATTLE,
        '/practice': PAGES.PRACTICE,
        '/history': PAGES.HISTORY,
        '/tournaments': PAGES.TOURNAMENTS,
        '/leaderboard': PAGES.LEADERBOARD,
        '/profile': PAGES.PROFILE,
        '/settings': PAGES.SETTINGS,
        '/opponents': PAGES.OPPONENTS,
        '/arena/solo': PAGES.ARENA_SOLO,
    };

    if (staticMap[pathname]) {
        return { page: staticMap[pathname], params };
    }

    // /arena/practice with optional query params
    if (pathname === '/arena/practice' || pathname.startsWith('/arena/practice')) {
        return { page: PAGES.ARENA_PRACTICE, params };
    }

    // /arena/:matchId — any /arena/* that isn't solo or practice
    const arenaMatch = pathname.match(/^\/arena\/(.+)$/);
    if (arenaMatch) {
        params.matchId = arenaMatch[1];
        return { page: PAGES.ARENA_MATCH, params };
    }

    // Fallback
    return { page: PAGES.DASHBOARD, params };
}

/** Build a URL path from a PageId + params. */
export function pageToPath(page: PageId, params?: NavParams): string {
    if (page === PAGES.ARENA_MATCH && params?.matchId) {
        return `/arena/${params.matchId}`;
    }
    if (page === PAGES.ARENA_PRACTICE && params?.practiceType) {
        return `/arena/practice?type=${params.practiceType}`;
    }
    return PAGE_TO_PATH[page];
}

// ── Navigation State ──────────────────────────────────────────────────────

export interface NavParams {
    matchId?: string;
    practiceType?: string;
    matchState?: any;
}

export interface NavigationState {
    currentPage: PageId;
    history: PageId[];
    params: NavParams;
    modal: ModalId | null;
    canGoBack: boolean;
}

export const initialNavigationState: NavigationState = {
    currentPage: PAGES.DASHBOARD,
    history: [],
    params: {},
    modal: null,
    canGoBack: false,
};

// ── Actions ───────────────────────────────────────────────────────────────

export type NavigationAction =
    | { type: 'NAVIGATE'; page: PageId; params?: NavParams }
    | { type: 'GO_BACK' }
    | { type: 'REPLACE'; page: PageId; params?: NavParams }
    | { type: 'RESET'; page?: PageId }
    | { type: 'OPEN_MODAL'; modal: ModalId }
    | { type: 'CLOSE_MODAL' };

// ── Reducer ───────────────────────────────────────────────────────────────

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
    switch (action.type) {
        case 'NAVIGATE': {
            // Don't push duplicate entries
            if (state.currentPage === action.page) {
                return { ...state, params: action.params ?? state.params };
            }
            const newHistory = [...state.history, state.currentPage];
            return {
                ...state,
                currentPage: action.page,
                history: newHistory,
                params: action.params ?? {},
                canGoBack: newHistory.length > 0,
            };
        }

        case 'GO_BACK': {
            if (state.history.length === 0) return state;
            const history = [...state.history];
            const previousPage = history.pop()!;
            return {
                ...state,
                currentPage: previousPage,
                history,
                params: {},
                canGoBack: history.length > 0,
            };
        }

        case 'REPLACE': {
            return {
                ...state,
                currentPage: action.page,
                params: action.params ?? {},
            };
        }

        case 'RESET': {
            return {
                ...initialNavigationState,
                currentPage: action.page ?? PAGES.DASHBOARD,
            };
        }

        case 'OPEN_MODAL': {
            return { ...state, modal: action.modal };
        }

        case 'CLOSE_MODAL': {
            return { ...state, modal: null };
        }

        default:
            return state;
    }
}
