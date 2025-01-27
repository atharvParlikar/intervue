import { Server, Socket } from "socket.io";
import redisClient from "./redis";
import { verifyToken } from "@clerk/backend";
import { Room } from "./schemas";

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

export const getRoomId = async (email: string): Promise<string | null> => {
  const inverseRooms = await redisClient.hGetAll("roomInverse");
  const inverseRoomUnparsed = inverseRooms[email];
  if (!inverseRoomUnparsed) return null;
  const inverseRoom = JSON.parse(inverseRoomUnparsed);
  if (!inverseRoom) {
    console.error(
      `[connectionReady] No inverse room found for email: ${email}`,
    );
    return null;
  }

  const roomId = inverseRoom.roomId;
  return roomId;
};

export const getRoom = async (roomId: string): Promise<Room | null> => {
  const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

  if (!roomImpure.host) {
    console.error(`[connectionReady] No room found for roomId: ${roomId}`);
    return null;
  }

  const room: Room = {
    host: JSON.parse(roomImpure.host),
    roomId,
  };

  let participant;

  try {
    participant = JSON.parse(roomImpure.participant);
    return { ...room, participant };
  } catch (_) {}

  return room;
};

export const socketEvents = (io: Server, socket: Socket) => {
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
      };

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

  socket.on("editor-val", async (valObject: string) => {
    console.log(`[editor-val] Received editor value from ${socket.id}`);
    const { val, token, cursor } = JSON.parse(valObject);
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const email = jwt.email as string;
    const roomId = await getRoomId(email);
    if (!roomId) return;
    const room = await getRoom(roomId);
    if (!room) return;
    const otherPeer =
      room.host.socketId === socket.id
        ? room.participant?.socketId
        : room.host?.socketId;
    console.log(cursor);
    if (otherPeer) {
      console.log(`[editor-val] Emitting editor value to ${otherPeer}`);
      io.to(otherPeer).emit(
        "editor-val",
        JSON.stringify({
          val,
          cursorPosition: cursor,
        }),
      );
    } else {
      console.error("[editor-val] Other peer not found in room");
    }
  });

  socket.on("kill", async (token: string) => {
    console.log(`[kill] Received kill request from ${socket.id}`);
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const email = jwt.email as string;
    console.log(`[kill] Email: ${email}`);
    const roomId = await getRoomId(email);
    const room = await getRoom(roomId!);
    if (!room) {
      console.error("[kill] Room not found");
      return;
    }
    const hostId = room.host.socketId!;
    const participantId = room.participant?.socketId!;

    console.log(`[kill] Emitting kill to ${hostId} and ${participantId}`);

    io.to(hostId).emit("kill");
    io.to(participantId).emit("kill");

    redisClient.hDel(`roomInverse`, room.host.email);
    if (room.participant) {
      redisClient.hDel(`roomInverse`, room.participant.email);
    }
    redisClient.DEL(`room:${roomId}`);
  });

  socket.on("disconnect", async () => {
    try {
      await handleDisconnect(socket.id);
    } catch (error) {
      console.error("[disconnect] Error:", error);
    }
  });
};
