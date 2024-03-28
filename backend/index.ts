import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Socket, Server as SocketServer } from "socket.io";

const app = express();
const PORT = 3000;

const server = new http.Server(app);

app.use(cors());

const io = new SocketServer(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms: any = {};
const roomsInverse: any = {};

io.on("connection", (socket: Socket) => {
  console.log(`⚡: ${socket.id} user just connected`);

  socket.on("message", (message) => {
    console.log("Got message: ", message, " | from ", socket.id);
  });

  socket.on("room", (roomNo: string) => {
    roomsInverse[socket.id] = roomNo;

    if (!rooms.hasOwnProperty(roomNo)) {
      rooms[roomNo] = [socket.id];
    } else {
      if (rooms[roomNo].length < 2) {
        rooms[roomNo].push(socket.id);
        rooms[roomNo].forEach((sockId: string) => io.to(sockId).emit("ready"));
      }
    }
  });

  socket.on("offer", (offer: string) => {
    const room = rooms[roomsInverse[socket.id]];
    const otherPeer = room.filter((id: string) => id !== socket.id)[0];
    io.to(otherPeer).emit("offer", offer);
  });

  socket.on("answer", (answer: string) => {
    const room = rooms[roomsInverse[socket.id]];
    const otherPeer = room.filter((id: string) => id !== socket.id)[0];
    io.to(otherPeer).emit("answer", answer);
  });

  socket.on("editor-val", (val: string) => {
    console.log("Editor-val: ", val);
    const room = rooms[roomsInverse[socket.id]];
    const otherPeer = room.filter((id: string) => id !== socket.id)[0];
    io.to(otherPeer).emit("editor-val", val);
  });

  socket.on("debug", () => {
    console.table(rooms);
  });

  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected [", socket.id, "]");
    const room = rooms[roomsInverse[socket.id]];
    room.splice(room.indexOf(socket.id), 1);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
