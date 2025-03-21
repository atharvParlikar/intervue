// TRPC and backend stuff.
import express from "express";
import http from "http";
import cors from "cors";
import { TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";

// DB and socket stuff.
import { configDotenv } from "dotenv";
import { privateProcedure, publicProcedure, router } from "./trpc";
import { Socket, Server } from "socket.io";
import { createContext } from "./context";
import redisClient from "./redis";
import { getRoom, getRoomId, socketEvents } from "./socketEvents";
import { spawn } from "child_process";
import { judge } from "./judge";

configDotenv();

const PORT = 8000;

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  // No CORS on prod cuz nginx having CORS already will cause double CORS errors.
} else {
  app.use(cors());
}

const server = new http.Server(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket: Socket) => {
  console.log(`⚡️: ${socket.id} user just connected`);

  socketEvents(io, socket);
});

const checkUserExists = async ({
  email,
  roomId,
}: {
  email: string;
  roomId: string;
}) => {
  const inverseRooms = await redisClient.hGetAll("roomInverse");
  const user: { roomId: string; userType: "host" | "participant" } = JSON.parse(
    inverseRooms[email],
  );

  if (!user) return false;
  return user.roomId === roomId;
};

async function executeInDocker(code: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const pythonProcess = spawn("docker", [
      "run",
      "--rm",                 // Remove container after execution
      "--memory=100m",        // Limit memory usage
      "--memory-swap=100m",   // Prevent swapping
      "--cpus=0.5",           // Limit CPU usage
      "--pids-limit=50",      // Limit number of processes
      "--network=none",       // No network access
      "--security-opt=no-new-privileges", // Prevent privilege escalation
      "python:3.9-slim",      // Use slim image
      "python",
      "-c",
      code,
    ]);

    // Set timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      pythonProcess.kill();
      reject(new Error("Execution timed out"));
    }, timeoutMs);

    // Capture stdout
    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    // Capture stderr
    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Handle completion
    pythonProcess.on("close", (code) => {
      clearTimeout(timeoutId);

      console.log(`[run-code] Python process exited with code ${code}`);

      if (killed) return; // Already handled by timeout

      if (code !== 0) {
        console.error(`[run-code] Process failed with code ${code}`);
        console.error('[run-code] stderr:', stderr);
      }

      resolve({ stdout, stderr });
    });

    // Handle execution errors
    pythonProcess.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

// Define procedures
export const appRouter = router({
  createRoom: privateProcedure
    .input(
      z.object({
        roomId: z.string(),
        isPrivate: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { roomId, isPrivate } = input;
      const { email, firstName } = ctx;

      // set host of room
      await redisClient.hSet(
        `room:${roomId}`,
        "host",
        JSON.stringify({
          email,
          firstName,
        }),
      );

      // set private status of room
      await redisClient.hSet(
        `room:${roomId}`,
        "private",
        isPrivate ? "true" : "false",
      );

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

  // NOTE: only the participant joins the room, if createRoom is called before
  //       no need to call joinRoom too.
  joinRoom: privateProcedure
    .input(
      z.object({
        roomId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { roomId } = input;
      const { email, firstName } = ctx;

      const roomString = await redisClient.hGetAll(`room:${roomId}`);

      if (!roomString) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Room doesn't exist",
        });
      }

      if (roomString.participant) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Room is full (2/2)",
        });
      }

      const room = {
        host: JSON.parse(roomString.host),
        private: roomString.private === "true" ? true : false,
      };

      const participant = {
        email,
        firstName,
      };

      if (room.private) {
      }

      if (!room.private) {
        // add participant in room
        await redisClient.hSet(
          `room:${roomId}`,
          "participant",
          JSON.stringify(participant),
        );

        // add user in roomInverse
        await redisClient.hSet(
          "roomInverse",
          email,
          JSON.stringify({ roomId, userType: "participant" }),
        );

        return {
          message: "Joined room successfully",
          roomId,
        };
      }
    }),

  exitRoom: privateProcedure.mutation(async ({ ctx }) => {
    const { email } = ctx;

    const userString = await redisClient.hGet("roomInverse", email);
    if (!userString) return;

    const user = JSON.parse(userString);
    if (!user) return;

    const { roomId, userType } = user;

    await redisClient.hDel(`room:${roomId}`, userType);
    await redisClient.hDel("roomInverse", email);

    console.log(`${email} exited room ${roomId} sucessfully!!!`);
    return;
  }),

  setSocket: privateProcedure
    .input(
      z.object({
        socketId: z.string(),
        roomId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { socketId, roomId } = input;
      const { email } = ctx;

      await redisClient.hSet("socketInverse", socketId, email);

      const inverseRooms = await redisClient.hGetAll("roomInverse");
      let inverseRoom: any;

      try {
        inverseRoom = JSON.parse(inverseRooms[email]);
      } catch {
        inverseRoom = null;
      }

      const userRoomId = inverseRoom?.roomId;

      if (userRoomId !== roomId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "user not in the room",
        });
      }

      if (inverseRoom?.userType === "host") {
        console.log(
          `[POST /set-socket] Updating host socket ID to ${socketId} for room ${roomId}`,
        );
        const user = await redisClient.hGet(`room:${roomId}`, "host");
        const peer = await redisClient.hGet(`room:${roomId}`, "participant");

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const userObj = JSON.parse(user);

        await redisClient.hSet(
          `room:${roomId}`,
          "host",
          JSON.stringify({ ...userObj, socketId }),
        );

        if (peer) {
          io.to(socketId).emit("initiate", true);
        }

        return {
          message: "socket id set successfully",
          userType: "host",
        };
      } else if (inverseRoom?.userType === "participant") {
        console.log(
          `[POST /set-socket] Updating participant socket ID to ${socketId} for room ${roomId}`,
        );

        const user = await redisClient.hGet(`room:${roomId}`, "participant");
        const peer = await redisClient.hGet(`room:${roomId}`, "host");

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (!peer) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        const userObj = JSON.parse(user);
        const peerObj = JSON.parse(peer);

        await redisClient.hSet(
          `room:${roomId}`,
          "participant",
          JSON.stringify({ ...userObj, socketId }),
        );

        // Signal host to initiate video call.
        if (peerObj.socketId) {
          io.to(peerObj.socketId).emit("initiate", true);
          io.to(socketId).emit("initiate", false);
        }

        return {
          message: "socket id set successfully",
          userType: "participant",
        };
      } else {
        console.error(`[POST /set-socket] Invalid userType for email ${email}`);
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
    }),

  renderJoinpage: privateProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { roomId } = input;
      const { email } = ctx;

      const inverseRooms = await redisClient.hGetAll("roomInverse");

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

  verifyHost: privateProcedure
    .input(z.object({ roomId: z.string() }))
    .output(z.object({ isHost: z.boolean() }))
    .query(async ({ input, ctx }) => {
      const { roomId } = input;
      const { email } = ctx;

      const room = await getRoom(roomId);
      if (!room) return { isHost: false };

      const host = room.host;

      if (host.email === email) return { isHost: true };

      return { isHost: false };
    }),

  checkUserExists: privateProcedure
    .input(z.object({ roomId: z.string() }))
    .output(z.object({ isInRoom: z.boolean() }))
    .query(async ({ input, ctx }) => {
      const { roomId } = input;
      const { email } = ctx;

      const userExists = await checkUserExists({ email, roomId });

      return { isInRoom: userExists };
    }),

  checkRoomLive: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .output(z.object({ isLive: z.boolean() }))
    .query(async ({ input }) => {
      const { roomId } = input;

      const room = await getRoom(roomId);

      if (!room) {
        return { isLive: false };
      }

      return { isLive: true };
    }),

  runCode: privateProcedure
    .input(
      z.object({
        code: z.string(),
      }),
    )
    .output(
      z.object({
        stdout: z.string(),
        stderr: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { code } = input;
      const { email } = ctx;

      const roomId = await getRoomId(email);
      if (!roomId) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Your email is not associated with any emaill"
      });
      const room = await getRoom(roomId);
      if (!room) throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room you are trying to run this code in does not exist"
      });

      const TIMEOUT_MS = 5000;

      try {
        const { stdout, stderr } = await executeInDocker(code, TIMEOUT_MS);

        const participantSocketId = room.participant?.socketId;

        if (participantSocketId) {
          io.to(participantSocketId).emit("output", {
            stdout, stderr
          });
        }

        return {
          stdout,
          stderr
        }
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while running the code"
        })
      }
    }),

  judge: privateProcedure
    .input(
      z.object({
        code: z.string(),
        language: z.enum(["python", "javascript"]),
        problemFunction: z.string(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const { code, language, problemFunction } = input;
      const { email } = ctx;

      const roomId = await getRoomId(email);
      if (!roomId) throw new TRPCError({ code: "NOT_FOUND" });

      const room = await getRoom(roomId);
      if (!room) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await judge({ code, language, problemFunction });
      if (typeof result === "string") {
        console.error("[judge] failed to judge: ", result);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "failed to judge",
        });
      }

      const host = room.host.socketId;
      const participant = room.participant?.socketId;

      if (host) {
        io.to(host).emit("judge", JSON.stringify(result));
      }
      if (participant) {
        io.to(participant).emit("judge", JSON.stringify(result));
      }

      return { success: true };
    }),

  ping: publicProcedure
    .query(() => {
      return { message: "Hello there" }
    })
});

export type AppRouter = typeof appRouter;

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
