import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@arena/database';
import { env } from '../config/env';

// Connection pool with max 20 connections
const queryClient = postgres(env.DATABASE_URL, { max: 20 });
export const db = drizzle(queryClient, { schema });
