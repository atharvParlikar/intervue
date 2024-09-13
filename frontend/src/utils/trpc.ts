import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../backend/index-trpc"; // Adjust the path to your tRPC router
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

/**
 * Types for easier type-safe API calls.
 */
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
