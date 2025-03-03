import { Server, Socket } from "socket.io";
import redisClient from "./redis";
import { verifyToken } from "@clerk/backend";
import { Room } from "./schemas";

async function handleDisconnect(socketId: string) {
  console.log(`🔥 ${socketId} disconnected`);
  const email = await redisClient.hGet("socketInverse", socketId);
  if (!email) return;
  const { roomId, userType } = JSON.parse(
    (await redisClient.hGet("roomInverse", email))!,
  );

  const room = await getRoomFromEmail(email);

  if (!room) return;

  const key = userType === "host" ? "host" : "participant";
  console.log(room);
  const updatedData = { ...JSON.parse(room[key]), socketId: "" };

  await redisClient.hSet(`room:${roomId}`, key, JSON.stringify(updatedData));

  await redisClient.hDel("socketInverse", socketId);
}

export const verifyJWT = async (
  token: string,
): Promise<{ email: string; firstName: string } | null> => {
  try {
    const jwtKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n");

    if (!jwtKey) {
      throw new Error("JWT public key is missing");
    }

    const verifiedToken = await verifyToken(token, {
      jwtKey,
    });

    const email = verifiedToken.email as string;
    const firstName = verifiedToken.firstName as string;

    return {
      email,
      firstName,
    };
  } catch (error: any) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
};

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
    private: roomImpure.private === "true" ? true : false
  };

  let participant;

  try {
    participant = JSON.parse(roomImpure.participant);
    return { ...room, participant };
  } catch (_) { }

  return room;
};

export const getRoomFromEmail = async (email: string) => {
  const roomString = await redisClient.hGet("roomInverse", email);
  if (!roomString) return null;
  try {
    const { roomId } = JSON.parse(roomString);
    console.log(roomId);
    const room = await redisClient.hGetAll(`room:${roomId}`);
    console.log("room: ", room);
    return room;
  } catch (_) {
    return null;
  }
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

  socket.on("joinRoom", async ({ roomId, token }) => {
    console.log("[temp] roomId: ", roomId);
    console.log("[temp] token: ", token);
    const packet = await verifyJWT(token);
    if (!packet) {
      socket.emit("join-room-response", {
        allowed: false,
        message: "not logged in",
      });
      return;
    }
    const { email, firstName } = packet;
    const room = await getRoom(roomId);
    if (!room) {
      socket.emit("joinRoomResponse", {
        success: false,
        message: "room does not exist",
      });
      return;
    }
    if (room.private) {
      const hostSocketId = room.host.socketId!;
      io.to(hostSocketId).emit("join-consent", {
        email,
        firstName,
        roomId,
        senderSocket: socket.id,
      });
      return;
    }

    // At this point room is not private, proceed with adding user to the database.
    await redisClient.hSet(
      `room:${roomId}`,
      "participant",
      JSON.stringify({
        email,
        firstName,
      }),
    );

    await redisClient.hSet(
      "roomInverse",
      email,
      JSON.stringify({
        roomId,
        userType: "participant",
      }),
    );

    socket.emit("join-consent-response", {
      allowed: true,
      roomId,
    });
  });

  socket.on(
    "join-consent-response",
    async ({ allowed, firstName, email, roomId, senderSocket }) => {
      console.log("got join-consent-response");
      // TODO: do not just return, send "senderSocket" not allowed.
      if (!allowed) return;
      const roomHost = await redisClient.hGet("socketInverse", socket.id);
      if (!roomHost) return;
      const roomString = await redisClient.hGet("roomInverse", roomHost);
      if (!roomString) return;
      const room = JSON.parse(roomString);
      // Make sure the person giving join-consent for room is present in that room is a host.
      if (room.roomId === roomId && room.userType === "host") {
        await redisClient.hSet(
          `room:${roomId}`,
          "participant",
          JSON.stringify({
            email,
            firstName,
          }),
        );
        await redisClient.hSet(
          "roomInverse",
          email,
          JSON.stringify({
            roomId,
            userType: "participant",
          }),
        );
        io.to(senderSocket).emit("join-consent-response", {
          allowed: true,
          roomId,
        });
        return;
      }
      io.to(senderSocket).emit("join-consent-response", {
        allowed: true,
        roomId,
      });
    },
  );

  // simple-peer signaling start

  socket.on("signal", ({ targetSocket, signal }) => {
    console.log(signal);
    io.to(targetSocket).emit("signal", { signal, sender: socket.id });
  });

  socket.on("requestPeerConnection", ({ targetSocket }) => {
    io.to(targetSocket).emit("peerConnectionRequested", { sender: socket.id });
  });

  // simple-peer signaling end

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
