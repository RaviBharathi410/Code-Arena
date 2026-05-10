import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/src/trpc/root';

/**
 * tRPC React hooks for the frontend.
 * This gives us full end-to-end type safety between the server and the client.
 */
export const trpc = createTRPCReact<AppRouter>();
