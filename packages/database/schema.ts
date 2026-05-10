import { pgTable, text, integer, uuid, timestamp, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    username: text('username').unique().notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    rankRating: integer('rank_rating').notNull().default(1200),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),
    totalBattles: integer('total_battles').default(0),
    winRate: integer('win_rate').default(0),
    tier: text('tier').default('IRON'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastActive: timestamp('last_active', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
    return {
        rankRatingIdx: index('users_rank_rating_idx').on(table.rankRating)
    };
});

export const usersRelations = relations(users, ({ many }) => ({
    matchRoomsAsP1: many(matchRooms, { relationName: 'player1' }),
    matchRoomsAsP2: many(matchRooms, { relationName: 'player2' }),
    submissions: many(submissions),
    rankHistory: many(rankHistory),
}));

export const problems = pgTable('problems', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    slug: text('slug').unique().notNull(),
    title: text('title').notNull(),
    difficulty: text('difficulty').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    constraints: text('constraints').notNull(),
    examples: jsonb('examples').notNull(),
    testCases: jsonb('test_cases').notNull(),
    boilerplate: jsonb('boilerplate').notNull(),
    optimalTimeComplexity: text('optimal_time_complexity'),
    optimalSpaceComplexity: text('optimal_space_complexity'),
    tags: text('tags').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const problemsRelations = relations(problems, ({ many }) => ({
    matchRooms: many(matchRooms),
}));

export const matchRooms = pgTable('match_rooms', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    roomCode: text('room_code').unique().notNull(),
    mode: text('mode').notNull(),
    status: text('status').notNull().default('waiting'),
    problemId: uuid('problem_id').notNull().references(() => problems.id),
    player1Id: uuid('player1_id').notNull().references(() => users.id),
    player2Id: uuid('player2_id').references(() => users.id),
    player1Lang: text('player1_lang'),
    player2Lang: text('player2_lang'),
    player1DoneAt: timestamp('player1_done_at', { withTimezone: true }),
    player2DoneAt: timestamp('player2_done_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    winnerId: uuid('winner_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
    return {
        statusIdx: index('match_rooms_status_idx').on(table.status),
        roomCodeIdx: index('match_rooms_code_idx').on(table.roomCode)
    };
});

export const matchRoomsRelations = relations(matchRooms, ({ one, many }) => ({
    player1: one(users, {
        fields: [matchRooms.player1Id],
        references: [users.id],
        relationName: 'player1'
    }),
    player2: one(users, {
        fields: [matchRooms.player2Id],
        references: [users.id],
        relationName: 'player2'
    }),
    winner: one(users, {
        fields: [matchRooms.winnerId],
        references: [users.id],
    }),
    problem: one(problems, {
        fields: [matchRooms.problemId],
        references: [problems.id],
    }),
    submissions: many(submissions),
}));

export const submissions = pgTable('submissions', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    matchId: uuid('match_id').notNull().references(() => matchRooms.id),
    userId: uuid('user_id').notNull().references(() => users.id),
    language: text('language').notNull(),
    code: text('code').notNull(),
    status: text('status').notNull().default('PENDING'),
    timeMs: integer('time_ms'),
    memoryKb: integer('memory_kb'),
    testCasesPass: integer('test_cases_pass'),
    testCasesTotal: integer('test_cases_total'),
    timeComplexity: text('time_complexity'),
    spaceComplexity: text('space_complexity'),
    qualityScore: integer('quality_score'),
    finalScore: integer('final_score'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
    return {
        matchIdIdx: index('submissions_match_id_idx').on(table.matchId),
        userIdIdx: index('submissions_user_id_idx').on(table.userId),
        statusIdx: index('submissions_status_idx').on(table.status)
    };
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
    match: one(matchRooms, {
        fields: [submissions.matchId],
        references: [matchRooms.id],
    }),
    user: one(users, {
        fields: [submissions.userId],
        references: [users.id],
    }),
}));

export const rankHistory = pgTable('rank_history', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull().references(() => users.id),
    matchId: uuid('match_id').references(() => matchRooms.id),
    delta: integer('delta').notNull(),
    newRating: integer('new_rating').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rankHistoryRelations = relations(rankHistory, ({ one }) => ({
    user: one(users, {
        fields: [rankHistory.userId],
        references: [users.id],
    }),
    match: one(matchRooms, {
        fields: [rankHistory.matchId],
        references: [matchRooms.id],
    }),
}));

export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
