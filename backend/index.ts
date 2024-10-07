import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { Socket, Server as SocketServer } from "socket.io";
import { verifyToken } from "@clerk/backend";
import { configDotenv } from "dotenv";
import { spawn } from "child_process";
import { createClient } from "redis";

const app = express();
const PORT = 3000;

configDotenv();

const server = new http.Server(app);

app.use(cors());
app.use(express.json());

const io = new SocketServer(server, {
  cors: {
    origin: "http://localhost:5173",
  },
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

const redisClient = createClient();
redisClient.connect();

redisClient.on("error", (err) => {
  console.error("Error connecting to redis:\n", err);
});

const rooms: Rooms = {};
const roomsInverse: { [key: string]: string } = {};
const roomsInverseSocket: { [key: string]: string } = {};

type EmitCallback<T> = (response: T) => void;

const objectMap = (obj: Object, fn: any) =>
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  );


const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
};

const validateInput = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Invalid input", error: error.details[0].message });
    }
    next();
  };
};

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

async function updateRoomParticipant(roomId: string, participant: any) {
  try {
    await redisClient.hSet(`room:${roomId}`, "participant", JSON.stringify(participant));
    await redisClient.hSet("roomInverse", participant.email, JSON.stringify({ roomId, userType: "participant" }));
  } catch (error) {
    console.error("[updateRoomParticipant] Error:", error);
    throw new Error("Failed to update room participant");
  }
}

async function handleDisconnect(socketId: string) {
  try {
    const roomKeys = await redisClient.keys('room:*');
    for (const roomKey of roomKeys) {
      const room = await redisClient.hGetAll(roomKey);
      if (JSON.parse(room.host).socketId === socketId) {
        await redisClient.hSet(roomKey, "host", JSON.stringify({ ...JSON.parse(room.host), socketId: '' }));
        break;
      }
      if (room.participant && JSON.parse(room.participant).socketId === socketId) {
        await redisClient.hSet(roomKey, "participant", JSON.stringify({ ...JSON.parse(room.participant), socketId: '' }));
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
      await updateRoomParticipant(roomId, { email, socketId, firstName });
      io.to(socketId).emit("joinSuccess");
    } catch (error) {
      console.error("[acceptJoin] Error:", error);
      socket.emit("error", "Failed to accept join request");
    }
  });

  socket.on("connectionReady", async (connectionObject) => {
    const { token, peerId } = JSON.parse(connectionObject);
    console.log(`[connectionReady] Received connectionReady from ${socket.id}`);

    try {
      const jwt = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!jwt || !jwt.email) {
        console.error("[connectionReady] Could not verify JWT");
        return;
      }

      const email = jwt.email as string;
      const inverseRooms = await redisClient.hGetAll("roomInverse");
      const inverseRoom = JSON.parse(inverseRooms[email]);
      if (!inverseRoom) {
        console.error(
          `[connectionReady] No inverse room found for email: ${email}`,
        );
        return;
      }

      const roomId = inverseRoom.roomId;
      const userType = inverseRoom.userType;

      if (!roomId) {
        console.error("[connectionReady] Could not find room");
        return;
      }

      const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

      if (!roomImpure) {
        console.error(`[connectionReady] No room found for roomId: ${roomId}`);
        return;
      }

      const room: any = {
        host: JSON.parse(roomImpure.host),
      }

      if (roomImpure.participant) {
        room.participant = JSON.parse(roomImpure.participant);
      }

      if (userType === "participant") {
        const host = room?.host.socketId;

        if (!host) {
          console.error("[connectionReady] Host not found in room");
          return;
        }
        if (host.length < 0) {
          console.error("[connectionReady] Could not find host roomId");
          return;
        } else {
          console.log(
            `[connectionReady] Emitting connectionReady to host ${host}`,
          );
          io.to(host).emit("connectionReady", peerId);
          return;
        }
      } else {
        const participant = room?.participant?.socketId;

        if (!participant) {
          console.error("[connectionReady] Participant not found in room");
          return;
        }
        if (participant.length < 0) {
          console.error("[connectionReady] Could not find participant roomId");
          return;
        } else {
          console.log(
            `[connectionReady] Emitting connectionReady to participant ${participant}`,
          );
          io.to(participant).emit("connectionReady", peerId);
          return;
        }
      }
    } catch (error) {
      console.error(
        "[connectionReady] Error processing connectionReady:",
        error,
      );
    }
  });

  socket.on("offer", async (offerObject: string) => {
    console.log(`[offer] Received offer from ${socket.id}`);
    const { token, offer } = JSON.parse(offerObject);

    try {
      const jwt = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const email = jwt.email as string;
      const inverseRoom = JSON.parse((await redisClient.hGetAll("roomInverse"))[email]);
      const roomId = inverseRoom.roomId;

      const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

      const room = {
        host: JSON.parse(roomImpure.host),
        participant: JSON.parse(roomImpure.participant)
      }

      if (room) {
        const otherPeer =
          room.host?.socketId === socket.id
            ? room.participant?.socketId
            : room.host?.socketId;
        if (otherPeer) {
          console.log(`[offer] Emitting offer to ${otherPeer}`);
          io.to(otherPeer).emit("offer", JSON.stringify(offer));
        } else {
          console.error("[offer] Other peer not found in room");
        }
      } else {
        console.error(`[offer] Room not found for email: ${email}`);
      }
    } catch (err) {
      console.error("[offer] Error processing offer:", err);
    }
  });

  socket.on("answer", async (answerObject: string) => {
    console.log(`[answer] Received answer from ${socket.id}`);
    const { token, answer } = JSON.parse(answerObject);
    try {
      const jwt = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const email = jwt.email as string;
      const inverseRoom = JSON.parse((await redisClient.hGetAll("roomInverse"))[email]);
      const roomId = inverseRoom.roomId;

      const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

      const room = {
        host: JSON.parse(roomImpure.host),
        participant: JSON.parse(roomImpure.participant)
      }

      if (room) {
        const otherPeer =
          room.host?.socketId === socket.id
            ? room.participant?.socketId
            : room.host?.socketId;
        if (otherPeer) {
          console.log(`[answer] Emitting answer to ${otherPeer}`);
          io.to(otherPeer).emit("answer", JSON.stringify(answer));
        } else {
          console.error("[answer] Other peer not found in room");
        }
      } else {
        console.error(`[answer] Room not found for email: ${email}`);
      }
    } catch (err) {
      console.error("[answer] Error processing answer:", err);
    }
  });

  socket.on("editor-val", async (valObject: string) => {
    console.log(`[editor-val] Received editor value from ${socket.id}`);
    const { val, token } = JSON.parse(valObject);
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const email = jwt.email as string;
    const room = rooms[roomsInverse[email]];
    const otherPeer =
      room.host?.socketId === socket.id
        ? room.participant?.socketId
        : room.host?.socketId;
    if (otherPeer) {
      console.log(`[editor-val] Emitting editor value to ${otherPeer}`);
      io.to(otherPeer).emit("editor-val", val);
    } else {
      console.error("[editor-val] Other peer not found in room");
    }
  });

  socket.on("run-code", (codeObject: string) => {
    console.log(`[run-code] Received run code request from ${socket.id}`);
    const { code, email } = JSON.parse(codeObject);
    let output = "";

    const pythonProcess = spawn("docker", [
      "run",
      "python",
      "python",
      "-c",
      code,
    ]);

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });
    pythonProcess.on("close", (code) => {
      console.log(`[run-code] Python process exited with code ${code}`);
      console.log("[run-code] Output:", output);

      const room = rooms[roomsInverse[email]];

      const host = room.host.socketId;
      const participant = room.participant?.socketId;
      console.log(
        `[run-code] Emitting output to host ${host} and participant ${participant}`,
      );
      io.to(host).emit("output", JSON.stringify({ code, output }));
      io.to(participant!).emit("output", JSON.stringify({ code, output }));
    });
  });

  socket.on("debug", () => {
    console.log("[debug] Debug information requested");
    console.table(rooms);
    console.table(roomsInverse);
  });

  socket.on("disconnect", async () => {
    try {
      await handleDisconnect(socket.id);
    } catch (error) {
      console.error("[disconnect] Error:", error);
    }
  });
});

app.post("/createRoom", async (req: Request, res: Response) => {
  console.log("[POST /createRoom] Create room request received");
  const { roomId, token } = req.body;

  try {
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const email = jwt.email as string;
    const firstName = jwt.firstName as string;

    const host = {
      email,
      firstName,
    };

    await redisClient.hSet(`room:${roomId}`, "host", JSON.stringify(host));
    console.log("[POST /createRoom] Room info saved in database");

    await redisClient.hSet(
      "roomInverse",
      email,
      JSON.stringify({ roomId, userType: "host" }),
    );
    console.log("[POST /createRoom] Room inverse saved in database");

    res.status(201).json({
      message: "Room created successfully",
      room: roomId,
    });
  } catch (e) {
    console.error("[POST /createRoom] Error creating room:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/createRoom", validateInput(createRoomSchema), async (req: Request, res: Response) => {
  const { roomId, token } = req.body;
  try {
    const jwt = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const { email, firstName } = jwt;
    await redisClient.hSet(`room:${roomId}`, "host", JSON.stringify({ email, firstName }));
    await redisClient.hSet("roomInverse", email, JSON.stringify({ roomId, userType: "host" }));
    res.status(201).json({ message: "Room created successfully", room: roomId });
  } catch (error) {
    console.error("[POST /createRoom] Error:", error);
    res.status(500).json({ message: "Failed to create room" });
  }
});

app.post("/joinRoom", validateInput(joinRoomSchema), async (req: Request, res: Response) => {
  const { roomId, token } = req.body;
  try {
    const room = await redisClient.hGetAll(`room:${roomId}`);
    if (!room.host) {
      return res.status(404).json({ message: "Room not found" });
    }
    const jwt = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const { email, firstName } = jwt;
    const hostResponse = await notifyHost(JSON.parse(room.host).socketId, { email, firstName });
    if (!hostResponse) {
      return res.status(409).json({ message: "Host denied access" });
    }
    await updateRoomParticipant(roomId, { email, firstName });
    res.status(200).json({ message: "Joined room successfully", room: roomId });
  } catch (error) {
    console.error("[POST /joinRoom] Error:", error);
    res.status(500).json({ message: "Failed to join room" });
  }
});

app.post("/joinRoom", async (req: Request, res: Response) => {
  console.log("[POST /joinRoom] Join room request received");
  const { roomId, token } = req.body;

  const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

  if (!roomImpure) {
    console.log("[POST /joinRoom] Room doesn't exist");
    res.status(409).json({
      message: "room doesn't exist",
    });
    return;
  }

  const room = {
    host: JSON.parse(roomImpure.host)
  }

  try {
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const email = jwt.email as string;
    const firstName = jwt.firstName as string;

    const participant = {
      email,
      firstName,
    };

    console.log(`[POST /joinRoom] Notifying host ${room.host.socketId}`);
    const hostResponse = await emitAndWait<boolean>(
      room.host.socketId!,
      "notify",
      JSON.stringify({ email, firstName }),
    );

    if (!hostResponse) {
      console.log("[POST /joinRoom] Host denied access");
      res.status(409).json({
        message: "host has denied access",
      });
      return;
    }

    try {
      await redisClient.hSet(
        `room:${roomId}`,
        "participant",
        JSON.stringify(participant),
      );
      console.log("[POST /joinRoom] Room updated with participant");

      await redisClient.hSet(
        "roomInverse",
        email,
        JSON.stringify({ roomId, userType: "participant" }),
      );
      console.log("[POST /joinRoom] Room inverse saved in database");

      res.status(201).json({
        message: "Joined room successfully",
        room: roomId,
      });
    } catch (e) {
      console.error(
        "[POST /joinRoom] Error updating room or saving inverse:",
        e,
      );
      res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (e) {
    console.error("[POST /joinRoom] Error verifying token:", e);
    res.status(401).json({
      message: "token invalid",
    });
  }
});

app.post("/set-socket", async (req: Request, res: Response) => {
  console.log("[POST /set-socket] Set socket request received");

  const { token, socketId, roomId_ } = req.body;

  try {
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const email = jwt.email as string;

    const inverseRooms = await redisClient.hGetAll("roomInverse");
    let inverseRoom: any;

    try {
      inverseRoom = JSON.parse(inverseRooms[email]);
    } catch {
      inverseRoom = null;
    }

    const roomId = inverseRoom !== null ? inverseRoom.roomId : roomId_;

    if (inverseRoom?.userType === "host") {
      console.log(
        `[POST /set-socket] Updating host socket ID to ${socketId} for room ${roomId}`,
      );
      const user = await redisClient.hGet(`room:${roomId}`, "host");

      if (!user) {
        res.status(404).json({
          message: "user not found",
        });
        return;
      }

      const userObj = JSON.parse(user);

      await redisClient.hSet(
        `room:${roomId}`,
        "host",
        JSON.stringify({ ...userObj, socketId }),
      );

      res.status(200).json({
        message: "socket id set successfully",
        userType: "host",
      });
    } else if (inverseRoom?.userType === "participant") {
      console.log(
        `[POST /set-socket] Updating participant socket ID to ${socketId} for room ${roomId}`,
      );

      const user = await redisClient.hGet(`room:${roomId}`, "participant");

      if (!user) {
        res.status(404).json({
          message: "user not found",
        });
        return;
      }

      const userObj = JSON.parse(user);

      await redisClient.hSet(
        `room:${roomId}`,
        "participant",
        JSON.stringify({ ...userObj, socketId }),
      );

      res.status(200).json({
        message: "socket id set successfully",
        userType: "participant",
      });
    } else {
      console.error(`[POST /set-socket] Invalid userType for email ${email}`);
      res.status(400).json({
        message: "Invalid user type",
      });
    }
  } catch (error) {
    console.error("[POST /set-socket] Error setting socket ID:", error);
    res.status(500).json({
      message: "socket id set failed",
    });
  }
});

app.post("/verify_host", async (req: Request, res: Response) => {
  console.log("[POST /verify_host] Verify host request received");
  const { token, roomId } = req.body;

  try {
    // Verify the token to extract user information
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const email = jwt.email as string;

    // Retrieve inverse room mapping from Redis
    const inverseRooms = await redisClient.hGetAll("roomInverse");
    console.log("inverseRooms: ", inverseRooms);
    console.log("email: ", email);

    // Check if the user exists in the inverseRooms
    const user = inverseRooms[email];

    if (user) {
      // Parse the user object
      const userObj = JSON.parse(user);

      // Check if the user is the host
      if (userObj.userType === "host") {
        console.log(`[POST /verify_host] User ${email} verified as host`);
        return res.status(200).json({
          renderJoinPage: false,
        });
      } else {
        // User is not a host, check if the roomId matches
        if (userObj.roomId === roomId) {
          console.log(`[POST /verify_host] User ${email} is a participant in the room`);
          return res.status(200).json({
            renderJoinPage: false,
          });
        } else {
          console.log(`[POST /verify_host] User ${email} is a participant in another room`);
          return res.status(200).json({
            renderJoinPage: true,
            message: "Participant exists in some other room",
          });
        }
      }
    } else {
      // User does not exist in inverseRooms, needs to go to joinRoom screen
      console.log(`[POST /verify_host] User ${email} not found in any room`);
      return res.status(200).json({
        renderJoinPage: true
      });
    }
  } catch (error) {
    console.error("[POST /verify_host] Error verifying host:", error);
    return res.status(500).json({
      message: "Error verifying host status",
    });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(
    `💻 Server running in ${process.env.NODE_ENV || "development"} mode`,
  );
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
