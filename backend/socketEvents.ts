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
  } catch (_) { }

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
