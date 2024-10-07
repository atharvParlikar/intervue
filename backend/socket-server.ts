import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import redisClient from "./redis";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5137",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

async function handleDisconnect(socketId: string) {
  try {
    const roomKeys = await redisClient.keys("room:*");
    for (const roomKey of roomKeys) {
      const room = await redisClient.hGetAll(roomKey);
      if (JSON.parse(room.host).socketId === socketId) {
        await redisClient.hSet(
          roomKey,
          "host",
          JSON.stringify({ ...JSON.parse(room.host), socketId: "" }),
        );
        break;
      }
      if (
        room.participant &&
        JSON.parse(room.participant).socketId === socketId
      ) {
        await redisClient.hSet(
          roomKey,
          "participant",
          JSON.stringify({ ...JSON.parse(room.participant), socketId: "" }),
        );
        break;
      }
    }
  } catch (error) {
    console.error("[handleDisconnect] Error:", error);
    throw new Error("Failed to handle disconnect");
  }
}

io.on("connection", (socket: Socket) => {
  console.log(`⚡: ${socket.id} user just connected`);

  socket.on("message", (message) => {
    console.log(`[message] Received message from ${socket.id}:`, message);
  });

  socket.on("acceptJoin", async (userObject: string) => {
    try {
      const { roomId, socketId, email, firstName } = JSON.parse(userObject);
      // await updateRoomParticipant(roomId, { email, socketId, firstName });
      io.to(socketId).emit("joinSuccess");
    } catch (error) {
      console.error("[acceptJoin] Error:", error);
      socket.emit("error", "Failed to accept join request");
    }
  });

  // socket.on("editor-val", async (valObject: string) => {
  //   console.log(`[editor-val] Received editor value from ${socket.id}`);
  //   const { val, token } = JSON.parse(valObject);
  //   const jwt = await verifyToken(token, {
  //     secretKey: process.env.CLERK_SECRET_KEY,
  //   });
  //   const email = jwt.email as string;
  //   const room = rooms[roomsInverse[email]];
  //   const otherPeer =
  //     room.host?.socketId === socket.id
  //       ? room.participant?.socketId
  //       : room.host?.socketId;
  //   if (otherPeer) {
  //     console.log(`[editor-val] Emitting editor value to ${otherPeer}`);
  //     io.to(otherPeer).emit("editor-val", val);
  //   } else {
  //     console.error("[editor-val] Other peer not found in room");
  //   }
  // });

  // socket.on("run-code", (codeObject: string) => {
  //   console.log(`[run-code] Received run code request from ${socket.id}`);
  //   const { code, email } = JSON.parse(codeObject);
  //   let output = "";

  //   const pythonProcess = spawn("docker", [
  //     "run",
  //     "python",
  //     "python",
  //     "-c",
  //     code,
  //   ]);

  //   pythonProcess.stdout.on("data", (data) => {
  //     output += data.toString();
  //   });
  //   pythonProcess.on("close", (code) => {
  //     console.log(`[run-code] Python process exited with code ${code}`);
  //     console.log("[run-code] Output:", output);

  //     const room = rooms[roomsInverse[email]];

  //     const host = room.host.socketId;
  //     const participant = room.participant?.socketId;
  //     console.log(
  //       `[run-code] Emitting output to host ${host} and participant ${participant}`
  //     );
  //     io.to(host).emit("output", JSON.stringify({ code, output }));
  //     io.to(participant!).emit("output", JSON.stringify({ code, output }));
  //   });
  // });

  socket.on("disconnect", async () => {
    try {
      await handleDisconnect(socket.id);
    } catch (error) {
      console.error("[disconnect] Error:", error);
    }
  });
});

app.listen(4000, () => {
  console.log("listening on port 4000");
});
