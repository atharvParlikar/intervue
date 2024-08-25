import mongoose, { Document, Schema } from 'mongoose';

// Interfaces
interface IUser {
  email: string;
  firstName: string;
  socketId: string | null;
}

interface IRoom extends Document {
  roomId: string;
  host: IUser;
  participant?: IUser | null;
}

interface IRoomsInverse extends Document {
  email: string;
  roomId: string;
  userType: "host" | "participant";
}

interface IWebRTCConnection extends Document {
  roomId: string;
  socketIds: string[];
}

// Room Schema
const roomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true, unique: true },
  host: {
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    socketId: { type: String, required: false },
  },
  participant: {
    email: { type: String },
    firstName: { type: String },
    socketId: { type: String },
  },
});

roomSchema.index({ roomId: 1 }, { unique: true });

const Room = mongoose.model<IRoom>('Room', roomSchema);

// RoomsInverse Schema
const roomsInverseSchema = new Schema<IRoomsInverse>({
  email: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  userType: { type: String, required: true }
});

const RoomsInverse = mongoose.model<IRoomsInverse>('RoomsInverse', roomsInverseSchema);

// WebRTC Connection Schema
const connectionSchema = new Schema<IWebRTCConnection>({
  roomId: { type: String, required: true },
  socketIds: [{ type: String }],
});

const WebRTCConnection = mongoose.model<IWebRTCConnection>('WebRTCConnection', connectionSchema);

export { Room, RoomsInverse, WebRTCConnection };
