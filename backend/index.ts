import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Socket, Server as SocketServer } from "socket.io";
import { verifyToken } from "@clerk/backend";
import { configDotenv } from "dotenv";
import { spawn } from "child_process";
import { connect } from "mongoose";
import { Room, RoomsInverse } from "./schemas";

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

type Connection = { [key: string]: string[] };

const connectDb = () => {
  connect("mongodb://127.0.0.1:27017/intervue").then(() => {
    console.log("📂 Database Connected...");
  });
};

connectDb();

const rooms: Rooms = {};
const roomsInverse: { [key: string]: string } = {};
const roomsInverseSocket: { [key: string]: string } = {};

type EmitCallback<T> = (response: T) => void;

function emitAndWait<T>(socketId: string, eventName: string, data: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = io.sockets.sockets.get(socketId)
    console.log(socket, socket?.id);
    if (!socket) {
      reject(new Error('Socket not found'));
      return;
    }

    socket.emit(eventName, data, ((response: T) => {
      resolve(response);
    }) as EmitCallback<T>);
  });
}

io.on("connection", (socket: Socket) => {
  console.log(`⚡: ${socket.id} user just connected`);

  socket.on("message", (message) => {
    console.log("Got message: ", message, " | from ", socket.id);
  });

  socket.on("acceptJoin", (userObject: string) => {
    const { roomId, socketId, email, firstName } = JSON.parse(userObject);
    console.log("acceptJoin: ", roomId, socketId);
    rooms[roomId].participant = { email, socketId, firstName };
    roomsInverse[email] = roomId;
    roomsInverseSocket[socketId] = roomId;
    io.to(socketId).emit("joinSuccess");
  });

  socket.on("connectionReady", async (connectionObject) => {
    const { token, peerId } = JSON.parse(connectionObject);

    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });

    if (!jwt || !jwt.email) {
      console.log("could not verify jwt");
      return;
    }

    const email = jwt.email as string;

    console.log("got connectionReady from ", socket.id);
    const inverseRoom = (await RoomsInverse.findOne({ email }));
    if (!inverseRoom) return;

    const roomId = inverseRoom.roomId;
    const userType = inverseRoom.userType;

    if (!roomId) {
      console.log("[connectionReady] could not find room");
      return;
    }

    const room = await Room.findOne({ roomId });
    if (!room) return;

    if (userType === "participant") {
      const host = room?.host.socketId;

      if (!host) return;
      if (host.length < 0) {
        console.log("[connectionReady] could not find host roomId");
        return;
      } else {
        console.log("[connectionReady] host found ", host);
        io.to(host).emit("connectionReady", peerId);
        return;
      }
    } else {
      const participant = room?.participant?.socketId;

      if (!participant) return;
      if (participant.length < 0) {
        console.log("[connectionReady] could not find participant roomId");
        return;
      } else {
        console.log("[connectionReady] participant found ", participant);
        io.to(participant).emit("connectionReady", peerId);
        return;
      }

    }
  });

  socket.on("offer", async (offerObject: string) => {
    const { token, offer } = JSON.parse(offerObject);
    console.log("got token: ", token);
    try {
      const jwt = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const email = jwt.email as string;
      const roomId = (await RoomsInverse.findOne({ email }))?.roomId;
      const room = await Room.findOne({ roomId });

      if (room) {
        console.log("Got here");
        const otherPeer =
          room.host?.socketId === socket.id
            ? room.participant?.socketId
            : room.host?.socketId;
        if (otherPeer) {
          io.to(otherPeer).emit("offer", JSON.stringify(offer));
        } else {
          console.log("idk wtf just happened");
        }
      }
    } catch (err) {
      console.error("Could not verify jwt token");
      return;
    }
  });

  socket.on("answer", async (answerObject: string) => {
    const { token, answer } = JSON.parse(answerObject);
    try {
      const jwt = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const email = jwt.email as string;
      const roomId = (await RoomsInverse.findOne({ email }))?.roomId;
      const room = await Room.findOne({ roomId });

      if (room) {
        const otherPeer =
          room.host?.socketId === socket.id
            ? room.participant?.socketId
            : room.host?.socketId;
        if (otherPeer) {
          io.to(otherPeer).emit("answer", JSON.stringify(answer));
        }
      }

    } catch (err) {
      console.error("err: ", err);
    }
  });

  socket.on("editor-val", (valObject: string) => {
    const { val, email } = JSON.parse(valObject);
    const room = rooms[roomsInverse[email]];
    const otherPeer =
      room.host?.socketId === socket.id
        ? room.participant?.socketId
        : room.host?.socketId;
    if (otherPeer) {
      io.to(otherPeer).emit("editor-val", val);
    }
  });

  socket.on("run-code", (codeObject: string) => {
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
      console.log("Python process exited with code", code);
      console.log("Output:", output);

      const room = rooms[roomsInverse[email]];

      const host = room.host.socketId;
      const participant = room.participant?.socketId;
      io.to(host).emit("output", JSON.stringify({ code, output }));
      io.to(participant!).emit("output", JSON.stringify({ code, output }));
    });
  });

  socket.on("debug", () => {
    console.table(rooms);
    console.table(roomsInverse);
  });

  socket.on("disconnect", async () => {
    console.log("🔥: A user disconnected [", socket.id, "]");

    try {
      const found = await Room.findOneAndUpdate(
        { "host.socketId": socket.id },
        { $set: { "host.socketId": "" } },
        { new: true }
      );

      console.log("found := ", found);

      if (found === null) {
        const found = await Room.findOneAndUpdate(
          { "participant": socket.id },
          { $set: { "participant.socketId": "" } },
          { new: true }
        );
        console.log(found);
      }

      console.log("socketId deleted");
    } catch (err) {
      console.error("some fucking error with deleting socket id");
    }
  });
});

app.post("/createRoom", async (req: Request, res: Response) => {
  const { roomId, token } = req.body;

  const jwt = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const email = jwt.email as string;
  const firstName = jwt.firstName as string;

  const host = {
    email,
    firstName,
  };

  try {
    const newRoom = new Room({
      roomId,
      host,
      participant: null,
    });
    await newRoom.save();
    console.log("roomInfo saved in database");

    const newRoomInverse = new RoomsInverse({
      email,
      roomId,
      userType: "host"
    });
    await newRoomInverse.save();
    console.log("roomInverse saved in database");

    res.status(201).json({
      message: "Room created successfully",
      room: roomId,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/joinRoom", async (req: Request, res: Response) => {
  const { roomId, token } = req.body;

  const room = await Room.findOne({ roomId });

  if (!room || !room.participant) {
    res.status(409).json({
      message: "room is full"
    });
    return;
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

    // it is pretty likely that he host has socketId set that's why we are not checking if it is
    const hostResponse = await emitAndWait<boolean>(room.host.socketId!, "notify", JSON.stringify({ email, firstName }));

    if (!hostResponse) {
      res.status(409).json({
        message: "host has denied access"
      });
      return;
    }

    try {
      await Room.findOneAndUpdate({ roomId }, { participant }, { new: true, upsert: false });

      const newRoomInverse = new RoomsInverse({
        email,
        roomId,
        userType: "participant"
      });

      await newRoomInverse.save();
      console.log("roomInverse saved in database");

      res.status(201).json({
        message: "Room created successfully",
        room: roomId,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (e) {
    console.error(e);
    res.status(401).json({
      message: "token invalid"
    });
  }
});

app.post("/set-socket", async (req: Request, res: Response) => {
  console.log("[POST] /set-socket called");

  const { token, socketId, roomId_ } = req.body;

  const jwt = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const email = jwt.email as string;

  const inverseRoom = await RoomsInverse.findOne({ email });
  const roomId = inverseRoom !== null ? inverseRoom.roomId : roomId_;

  try {
    if (inverseRoom?.userType === "host") {
      console.log("Got here host");
      await Room.updateOne({ roomId }, { $set: { "host.socketId": socketId } });

      res.status(200).json({
        message: "socket id set successfully",
        userType: "host"
      });
    } else if (inverseRoom?.userType === "participant") {
      console.log("Got here participant");
      await Room.updateOne({ roomId }, { $set: { "participant.socketId": socketId } });

      res.status(200).json({
        message: "socket id set successfully",
        userType: "participant"
      });
    }
  } catch {
    res.status(500).json({
      message: "socket id set failed",
    });
  }
});

app.post("/verify_host", async (req: Request, res: Response) => {
  const { token } = req.body;
  const jwt = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
  const email = jwt.email as string;
  const room = await RoomsInverse.findOne({ email });
  if (room) {
    res.status(200).json({
      isHost: true
    });
  } else {
    res.status(200).json({
      isHost: false
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
