import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../backend/index-trpc.ts';
import { Clerk } from "@clerk/clerk-js"

export const trpc = createTRPCReact<AppRouter>();

const clerk = new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

(async () => {
  await clerk.load();
})();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      async headers() {
        const token = await clerk.session?.getToken({ template: "user" });
        console.log(token);
        return {
          Authorization: token ? `Bearer ${token}` : '',
        }
      }
    }),
  ],
});
