import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Socket, Server as SocketServer } from "socket.io";
import { verifyToken } from "@clerk/backend";
import { configDotenv } from "dotenv";

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
  socketId: string;
};

type Room = {
  host: User;
  participant: User | null;
};

type Rooms = {
  [key: string]: Room;
};

const rooms: Rooms = {};
const roomsInverse: { [key: string]: string } = {};

const validated: any = {};

io.on("connection", (socket: Socket) => {
  console.log(`⚡: ${socket.id} user just connected`);

  socket.on("message", (message) => {
    console.log("Got message: ", message, " | from ", socket.id);
  });

  // socket.on("room", async (roomObject: string) => {
  //   const { room, jwtString } = JSON.parse(roomObject);

  //   const jwt = await verifyToken(jwtString, {
  //     secretKey: process.env.CLERK_SECRET_KEY,
  //   });

  //   if (jwt) {
  //     socket.emit("notify", jwt.email);
  //     if (!rooms.hasOwnProperty(room)) {
  //       rooms[room] = [socket.id];
  //     } else {
  //       if (rooms[room].length < 2) {
  //         rooms[room].push(socket.id);
  //         rooms[room].forEach((sockId: string) => io.to(sockId).emit("ready"));
  //       }
  //     }
  //   }
  // });

  socket.on("createRoom", async (roomObject) => {
    console.log("Got createRoom message");
    const { roomId, jwtString } = JSON.parse(roomObject);
    try {
      const jwt = await verifyToken(jwtString, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const email = jwt.email as string;

      if (!rooms[roomId]) {
        rooms[roomId] = {
          host: { email, socketId: socket.id },
          participant: null,
        };
        roomsInverse[email] = roomId;
        socket.emit("createSuccess");
      } else {
        if (jwt.email === rooms[roomId].host?.email) {
          socket.emit("createSuccess");
        }
        socket.emit("createFail");
      }
    } catch (e) {
      console.error("Error: ", e);
    }
  });

  socket.on("joinRoom", async (roomObject) => {
    const { roomId, jwtString } = JSON.parse(roomObject);
    try {
      const jwt = await verifyToken(jwtString, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (rooms[roomId].participant !== null) {
        if (rooms[roomId].participant?.email === jwt.email) {
          socket.emit("joinSuccess");
          return;
        }
      } else {
        socket.emit("joinFail");
      }

      const host = rooms[roomId].host;
      // if it exists
      if (host) {
        socket.to(host.socketId).emit(
          "notify",
          JSON.stringify({
            email: jwt.email,
            socketId: socket.id,
          }),
        );
      }
    } catch (err) {
      console.error("Error: ", err);
    }
  });

  socket.on("acceptJoin", (userObject: string) => {
    const { roomId, socketId, email } = JSON.parse(userObject);
    console.log("acceptJoin: ", roomId, socketId);
    rooms[roomId].participant = { email, socketId };
    roomsInverse[email] = roomId;
    io.to(socketId).emit("joinSuccess");
    socket.emit("joinSuccess");
  });

  socket.on("connectionReady", (email) => {
    const roomHost = rooms[roomsInverse[email]].host;
    console.log(roomHost);
    if (roomHost.socketId !== socket.id) {
      io.to(roomHost.socketId).emit("connectionReady");
    }
  });

  socket.on("offer", (offerObject: string) => {
    const { email, offer } = JSON.parse(offerObject);
    console.log(offer);
    console.log("email: ", email);
    const room = rooms[roomsInverse[email]];

    if (room) {
      const otherPeer =
        room.host?.socketId === socket.id
          ? room.participant?.socketId
          : room.host?.socketId;
      if (otherPeer) {
        io.to(otherPeer).emit("offer", JSON.stringify(offer));
      } else {
        // TODO: do some error handling
      }
    }
  });

  socket.on("answer", (answerObject: string) => {
    const { email, answer } = JSON.parse(answerObject);
    console.log("answer: ", answer);
    const room = rooms[roomsInverse[email]];
    const otherPeer =
      room.host?.socketId === socket.id
        ? room.participant?.socketId
        : room.host?.socketId;
    if (otherPeer) {
      io.to(otherPeer).emit("answer", JSON.stringify(answer));
    }
  });

  // socket.on("editor-val", (val: string) => {
  //   const room = rooms[roomsInverse[socket.id]];
  //   const otherPeer = room.filter((id: string) => id !== socket.id)[0];
  //   io.to(otherPeer).emit("editor-val", val);
  // });

  // socket.on("run-code", (code: string) => {
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
  //     console.log("Python process exited with code", code);
  //     console.log("Output:", output);

  //     const room = rooms[roomsInverse[socket.id]];

  //     room.forEach((id: string) =>
  //       io.to(id).emit("output", JSON.stringify({ code, output })),
  //     );
  //   });
  // });

  socket.on("debug", () => {
    console.table(rooms);
    console.table(roomsInverse);
  });

  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected [", socket.id, "]");
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
