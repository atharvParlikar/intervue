import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/index-trpc';

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:8000/trpc',
        headers: () => {
          if (typeof window === 'undefined') return {}; // prevent nextjs server error
          const token = localStorage.getItem("token");
          return token ? { Authorization: `Bearer: ${token}` } : {};
        },
      })
    ],
  });
}
