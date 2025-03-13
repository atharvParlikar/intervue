import { Server, Socket } from "socket.io";
import redisClient from "./redis";
import { verifyToken } from "@clerk/backend";
import { Room } from "./schemas";
import { io } from "./index-trpc";

async function handleDisconnect(socketId: string) {
  console.log(`🔥 ${socketId} disconnected`);
  const email = await redisClient.hGet("socketInverse", socketId);
  if (!email) return;

  const roomInfo = await getRoomInfoFromEmail(email);
  if (!roomInfo) return;

  const { roomId, userType } = roomInfo;
  const room = await getRoom(roomId);

  if (!room) return;

  console.log(room);
  const userObj = room[userType];
  const updatedData = { ...userObj, socketId: "" };

  await redisClient.hSet(`room:${roomId}`, userType, JSON.stringify(updatedData));

  await redisClient.hDel("socketInverse", socketId);

  const peerType = userType === "host" ? "participant" : "host";
  const peerSocketId = room[peerType]?.socketId;
  if (peerSocketId)
    io.to(peerSocketId).emit("peer-disconnected");
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

export const getRoomInfoFromEmail = async (email: string): Promise<{ roomId: string, userType: "host" | "participant" } | null> => {
  const roomString = await redisClient.hGet("roomInverse", email);
  if (!roomString) return null;
  try {
    return JSON.parse(roomString);
  } catch (_) {
    return null;
  }
};

export const getRoomId = async (email: string): Promise<string | null> => {
  const roomInfo = await getRoomInfoFromEmail(email);
  return roomInfo ? roomInfo.roomId : null;
};

export const getRoom = async (roomId: string): Promise<Room | null> => {
  const roomImpure = await redisClient.hGetAll(`room:${roomId}`);

  if (!roomImpure.host) {
    console.error(`[getRoom] No room found for roomId: ${roomId}`);
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
  const roomInfo = await getRoomInfoFromEmail(email);
  if (!roomInfo) return null;

  const { roomId } = roomInfo;
  console.log(roomId);
  const room = await redisClient.hGetAll(`room:${roomId}`);
  console.log("room: ", room);
  return room;
};

async function getPeerSocketId(socketId: string) {
  const senderEmail = await redisClient.hGet("socketInverse", socketId);
  if (!senderEmail) {
    console.log("[ERROR] SOCKET ID is either not set or user is not in room");
    return null;
  }

  const roomInfo = await getRoomInfoFromEmail(senderEmail);
  if (!roomInfo) {
    console.log("[ERROR] sender email is not associated with any room");
    return null;
  }

  const peerType = roomInfo.userType === "host" ? "participant" : "host";
  const room = await getRoom(roomInfo.roomId);

  if (!room) {
    console.log(`[ERROR] No room found for roomId ${roomInfo.roomId}`);
    return null;
  }

  const peer = peerType === "host" ? room.host : room.participant;

  if (!peer) {
    console.log(`[ERROR] No ${peerType} found in room ${roomInfo.roomId}`);
    return null;
  }

  return peer.socketId || null;
}

async function updateRoomParticipant(roomId: string, participantData: { email: string, socketId: string, firstName: string }) {
  await redisClient.hSet(
    `room:${roomId}`,
    "participant",
    JSON.stringify(participantData)
  );

  await redisClient.hSet(
    "roomInverse",
    participantData.email,
    JSON.stringify({
      roomId,
      userType: "participant",
    })
  );

  if (participantData.socketId) {
    await redisClient.hSet("socketInverse", participantData.socketId, participantData.email);
  }
}

async function removeRoom(roomId: string) {
  const room = await getRoom(roomId);
  if (!room) return;

  await redisClient.hDel("roomInverse", room.host.email);
  if (room.participant) {
    await redisClient.hDel("roomInverse", room.participant.email);
  }
  await redisClient.del(`room:${roomId}`);
}

export const socketEvents = (io: Server, socket: Socket) => {
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
    await updateRoomParticipant(roomId, {
      email,
      firstName,
      socketId: socket.id
    });

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

      const senderEmail = await redisClient.hGet("socketInverse", socket.id);
      if (!senderEmail) return;

      const roomInfo = await getRoomInfoFromEmail(senderEmail);
      if (!roomInfo) return;

      // Make sure the person giving join-consent for room is present in that room is a host.
      if (roomInfo.roomId === roomId && roomInfo.userType === "host") {
        await updateRoomParticipant(roomId, {
          email,
          firstName,
          socketId: senderSocket
        });

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

  socket.on("signal", async ({ signal }) => {
    const peerSocketId = await getPeerSocketId(socket.id);
    if (!peerSocketId) return;

    console.log(`[signal] |${signal.type}| ${socket.id} |> ${peerSocketId}`);
    io.to(peerSocketId).emit("signal", { signal });
  });

  socket.on("refresh-video", async () => {
    const peerSocketId = await getPeerSocketId(socket.id);
    if (!peerSocketId) return;

    io.to(peerSocketId).emit("refresh-video");
  });

  socket.on("requestPeerConnection", ({ targetSocket }) => {
    io.to(targetSocket).emit("peerConnectionRequested", { sender: socket.id });
  });

  // simple-peer signaling end

  socket.on("remoteCameraOn", async (cameraOn) => {
    const peerSocketId = await getPeerSocketId(socket.id);
    if (!peerSocketId) return;

    io.to(peerSocketId).emit("remoteCameraOn", cameraOn);
  });

  socket.on("remoteMicOn", async (micOn) => {
    const peerSocketId = await getPeerSocketId(socket.id);
    if (!peerSocketId) return;

    io.to(peerSocketId).emit("remoteMicOn", micOn);
  });

  socket.on("kill", async (token: string) => {
    console.log(`[kill] Received kill request from ${socket.id}`);
    const jwt = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const email = jwt.email as string;
    console.log(`[kill] Email: ${email}`);

    const roomId = await getRoomId(email);
    if (!roomId) {
      console.error("[kill] Room not found for email");
      return;
    }

    const room = await getRoom(roomId);
    if (!room) {
      console.error("[kill] Room not found");
      return;
    }

    const hostId = room.host.socketId!;
    const participantId = room.participant?.socketId!;

    console.log(`[kill] Emitting kill to ${hostId} and ${participantId}`);

    io.to(hostId).emit("kill");
    io.to(participantId).emit("kill");

    await removeRoom(roomId);
  });

  socket.on("disconnect", async () => {
    try {
      await handleDisconnect(socket.id);
    } catch (error) {
      console.error("[disconnect] Error:", error);
    }
  });
};
