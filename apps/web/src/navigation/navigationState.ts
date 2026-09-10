// ── Page & Modal Registries ───────────────────────────────────────────────

export const PAGES = {
    LANDING: 'landing',
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
    PROBLEMS: 'problems',
    HOSTED_ROOM: 'hosted_room',
} as const;

export type PageId = (typeof PAGES)[keyof typeof PAGES];

export const MODALS = {
    CONFIRM_LEAVE: 'confirm_leave',
    MATCH_RESULTS: 'match_results',
} as const;

export type ModalId = (typeof MODALS)[keyof typeof MODALS];

// ── Path <-> Page Bidirectional Maps ──────────────────────────────────────

export const PAGE_TO_PATH: Record<PageId, string> = {
    [PAGES.LANDING]: '/',
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
    [PAGES.PROBLEMS]: '/problems',
    [PAGES.HOSTED_ROOM]: '/hosted/:roomCode',
};

/** Resolve a URL pathname to a PageId. Handles dynamic segments like /arena/:matchId. */
export function pathToPage(pathname: string): { page: PageId; params: NavParams } {
    const params: NavParams = {};

    // Static matches first
    const staticMap: Record<string, PageId> = {
        '/': PAGES.LANDING,
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
        '/problems': PAGES.PROBLEMS,
    };

    const [pathOnly, searchOnly] = pathname.split('?');
    const searchParams = new URLSearchParams(
        searchOnly || (typeof window !== 'undefined' ? window.location.search : '')
    );
    if (searchParams.get('type')) params.practiceType = searchParams.get('type')!;
    if (searchParams.get('practiceType')) params.practiceType = searchParams.get('practiceType')!;
    if (searchParams.get('problemId')) params.problemId = searchParams.get('problemId')!;
    if (searchParams.get('mode')) params.mode = searchParams.get('mode')!;

    if (staticMap[pathOnly]) {
        return { page: staticMap[pathOnly], params };
    }

    // /arena/practice with optional query params
    if (pathOnly === '/arena/practice' || pathOnly.startsWith('/arena/practice')) {
        return { page: PAGES.ARENA_PRACTICE, params };
    }

    // /hosted/:roomCode
    const hostedMatch = pathOnly.match(/^\/hosted\/(.+)$/);
    if (hostedMatch) {
        return { page: PAGES.HOSTED_ROOM, params: { roomCode: hostedMatch[1].toUpperCase() } };
    }

    // /arena/:matchId — any /arena/* that isn't solo or practice
    const arenaMatch = pathOnly.match(/^\/arena\/(.+)$/);
    if (arenaMatch) {
        return { page: PAGES.ARENA_MATCH, params: { matchId: arenaMatch[1] } };
    }

    // /profile/:userId
    const profileMatch = pathOnly.match(/^\/profile\/(.+)$/);
    if (profileMatch) {
        return { page: PAGES.PROFILE, params: { userId: profileMatch[1] } };
    }

    // Fallback
    return { page: PAGES.LANDING, params: {} };
}

/** Resolve a PageId + NavParams to a URL pathname. */
export function pageToPath(page: PageId, params?: NavParams): string {
    if (page === PAGES.ARENA_MATCH && params?.matchId) {
        return `/arena/${params.matchId}`;
    }
    if (page === PAGES.HOSTED_ROOM && params?.roomCode) {
        return `/hosted/${params.roomCode}`;
    }
    if (page === PAGES.ARENA_PRACTICE && params?.practiceType) {
        return `/arena/practice?type=${params.practiceType}`;
    }
    if (page === PAGES.OPPONENTS && params?.problemId) {
        return `/opponents?problemId=${params.problemId}`;
    }
    if (page === PAGES.PROBLEMS && params?.mode) {
        return `/problems?mode=${params.mode}`;
    }
    if (page === PAGES.PROFILE && params?.userId) {
        return `/profile/${params.userId}`;
    }
    return PAGE_TO_PATH[page];
}

// ── Navigation State ──────────────────────────────────────────────────────

export interface NavParams {
    matchId?: string;
    roomCode?: string;
    practiceType?: string;
    matchState?: any;
    problemId?: string;
    userId?: string;
    mode?: string;
}

export interface NavigationState {
    currentPage: PageId;
    history: PageId[];
    params: NavParams;
    modal: ModalId | null;
    canGoBack: boolean;
}

export const initialNavigationState: NavigationState = {
    currentPage: PAGES.LANDING,
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
