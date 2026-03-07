// ── Socket.IO Event Registry ──────────────────────────────────────────────
// Single reference for every socket event name.
// Components import from here — never use raw strings.

/** Events emitted by the client → server */
export const CLIENT_EVENTS = {
    JOIN_MATCH: 'join_match',
    CODE_UPDATE: 'code_update',
    SUBMIT_CODE: 'submit_code',
    LEAVE_MATCH: 'leave_match',
    CHALLENGE_USER: 'challenge_user',
} as const;

/** Events emitted by the server → client */
export const SERVER_EVENTS = {
    MATCH_STARTED: 'match_start',
    OPPONENT_CODE: 'opponent_code_update',
    MATCH_RESULT: 'match_result',
    OPPONENT_DISCONNECTED: 'opponent_disconnected',
    ONLINE_USERS: 'online_users',
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left',
    CHALLENGE_RECEIVED: 'challenge_received',
} as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
