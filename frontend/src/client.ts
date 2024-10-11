import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../backend/index-trpc.ts";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_ENDPOINT,
      async headers() {
        try {
          // TODO: handle case where token is not set or is expired
          const token = localStorage.getItem("token");
          return {
            Authorization: token ? `Bearer ${token}` : "",
          };
        } catch (error) {
          console.error("Error getting token:", error);
          return {};
        }
      },
    }),
  ],
});
