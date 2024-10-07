// TRPC and backend stuff.
import express from "express";
import http from "http";
import cors from "cors";
import { TRPCError, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";

// DB and socket stuff.
import { configDotenv } from "dotenv";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { privateProcedure, publicProcedure, router } from "./trpc";
import { Socket, Server } from "socket.io";
import { createContext } from "./context";
import redisClient from "./redis";
import { socketEvents } from "./socketEvents";

configDotenv();

const app = express();
app.use(cors());

const server = new http.Server(app);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

type User = {
  email: string;
  firstName: string;
  socketId: string;
};

type Room = {
  host: User;
  participant: User | null;
};

type Rooms = {
  [key: string]: Room;
};

type Context = {
  req: CreateExpressContextOptions;
};

io.on("connection", (socket: Socket) => {
  console.log(`⚡️: ${socket.id} user just connected`);

  socketEvents(io, socket);
});

type EmitCallback<T> = (response: T) => void;

function emitAndWait<T>(
  socketId: string,
  eventName: string,
  data: any,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = io.sockets.sockets.get(socketId);
    console.log(`[emitAndWait] Attempting to emit to socket ${socketId}`);
    if (!socket) {
      console.error(`[emitAndWait] Socket not found for ID: ${socketId}`);
      reject(new Error("Socket not found"));
      return;
    }

    socket.emit(eventName, data, ((response: T) => {
      console.log(`[emitAndWait] Received response for event ${eventName}`);
      resolve(response);
    }) as EmitCallback<T>);
  });
}

// Define procedures
const appRouter = router({
  createRoom: privateProcedure
    .input(
      z.object({
        roomId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { roomId } = input;
      const { email, firstName } = ctx;

      console.log("Got here");

      await redisClient.hSet(
        `room:${roomId}`,
        "host",
        JSON.stringify({
          email,
          firstName,
        }),
      );
      console.log("[POST /createRoom] Room info saved in database");

      await redisClient.hSet(
        "roomInverse",
        email,
        JSON.stringify({ roomId, userType: "host" }),
      );
      console.log("[POST /createRoom] Room inverse saved in database");
      return {
        message: "Room created successfully",
        roomId,
      };
    }),

  joinRoom: privateProcedure
    .input(
      z.object({
        roomId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { roomId } = input;
      const { email, firstName } = ctx;

      const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

      if (!roomImpure) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Room doesn't exist",
        });
      }

      const room = {
        host: JSON.parse(roomImpure.host),
      };

      const participant = {
        email,
        firstName,
      };

      try {
        console.log(`[joinRoom] Notifying host ${room.host.socketId}`);
        const hostResponse = await emitAndWait<boolean>(
          room.host.socketId!,
          "notify",
          JSON.stringify({ email, firstName }),
        );

        if (!hostResponse) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Host has denied access",
          });
        }

        try {
          await redisClient.hSet(
            `room:${roomId}`,
            "participant",
            JSON.stringify(participant),
          );
          console.log("[joinRoom] Room updated with participant");

          await redisClient.hSet(
            "roomInverse",
            email,
            JSON.stringify({ roomId, userType: "participant" }),
          );
          console.log("[joinRoom] Room inverse saved in database");

          return {
            message: "Joined room successfully",
            roomId,
          };
        } catch (e) {
          console.error("[joinRoom] Error updating room or saving inverse:", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal Server Error",
          });
        }
      } catch (e) {
        console.error("[joinRoom] Error:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error notifying host or saving data",
        });
      }
    }),

  setSocket: privateProcedure
    .input(
      z.object({
        socketId: z.string(),
        roomId_: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { socketId, roomId_ } = input;
      const { email } = ctx;

      const inverseRooms = await redisClient.hGetAll("roomInverse");
      let inverseRoom: any;

      try {
        inverseRoom = JSON.parse(inverseRooms[email]);
      } catch {
        inverseRoom = null;
      }

      const roomId = inverseRoom?.roomId ?? roomId_;

      if (inverseRoom?.userType === "host") {
        console.log(
          `[POST /set-socket] Updating host socket ID to ${socketId} for room ${roomId}`,
        );
        const user = await redisClient.hGet(`room:${roomId}`, "host");

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const userObj = JSON.parse(user);

        await redisClient.hSet(
          `room:${roomId}`,
          "host",
          JSON.stringify({ ...userObj, socketId }),
        );

        return {
          message: "socket id set successfully",
          userType: "host",
        };
      } else if (inverseRoom?.userType === "participant") {
        console.log(
          `[POST /set-socket] Updating participant socket ID to ${socketId} for room ${roomId}`,
        );

        const user = await redisClient.hGet(`room:${roomId}`, "participant");

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const userObj = JSON.parse(user);

        await redisClient.hSet(
          `room:${roomId}`,
          "participant",
          JSON.stringify({ ...userObj, socketId }),
        );

        return {
          message: "socket id set successfully",
          userType: "participant",
        };
      } else {
        console.error(`[POST /set-socket] Invalid userType for email ${email}`);
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
    }),

  verifyHost: privateProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { roomId } = input;
      const { email } = ctx;

      const inverseRooms = await redisClient.hGetAll("roomInverse");
      console.log("inverseRooms: ", inverseRooms);
      console.log("email: ", email);

      // Check if the user exists in the inverseRooms
      const user = inverseRooms[email];

      if (user) {
        // Parse the user object
        const userObj = JSON.parse(user);

        if (userObj.userType === "host" && userObj.roomId === roomId) {
          console.log(`[POST /verify_host] User ${email} verified as host`);
          return {
            renderJoinPage: false,
          };
        } else {
          if (userObj.roomId === roomId) {
            console.log(
              `[POST /verify_host] User ${email} is a participant in the room`,
            );
            return {
              renderJoinPage: false,
            };
          } else {
            console.log(
              `[POST /verify_host] User ${email} is a participant in another room`,
            );
            return {
              renderJoinPage: true,
              message: "Participant exists in some other room",
            };
          }
        }
      } else {
        // User does not exist in inverseRooms, needs to go to joinRoom screen
        console.log(`[POST /verify_host] User ${email} not found in any room`);
        return {
          renderJoinPage: true,
        };
      }
    }),
});

export type AppRouter = typeof appRouter;

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
