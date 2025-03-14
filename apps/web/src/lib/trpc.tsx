import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
// import type { AppRouter } from "../../../../packages/types/src/index";
import type { AppRouter } from "../../../server/index-trpc.ts";

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_SERVER_URL!,
        headers: () => {
          if (typeof window === "undefined") return {}; // prevent nextjs server error
          const token = localStorage.getItem("token");
          return token ? { Authorization: `Bearer: ${token}` } : {};
        },
      }),
    ],
  });
}
