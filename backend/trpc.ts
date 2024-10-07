import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { createContext } from "./context";
import { verifyToken } from "@clerk/backend";

const t = initTRPC
  .context<inferAsyncReturnType<typeof createContext>>()
  .create();

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // Extract the Authorization header
  const authorizationHeader = ctx.req.headers.authorization;

  if (!authorizationHeader) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No Authorization header",
    });
  }

  const token = authorizationHeader.split(" ")[1]; // 'Bearer <token>'
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid token format",
    });
  }

  try {
    const tokenPayload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const email = tokenPayload.email as string;
    const firstName = tokenPayload.name as string;

    return next({ ctx: { ...ctx, email, firstName } });
  } catch (err) {
    console.log("Something fucked");
    throw new TRPCError({ code: "UNAUTHORIZED", message: err as string });
  }
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure.use(authMiddleware);
