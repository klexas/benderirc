import { Schema, model, connect } from 'mongoose';

interface IMessage {
    sender: string;
    message: string;
    created_at: Date;
}

// Interface for Channel
interface IChannel {
    owner: string; // TODO: Owner ID - all this should be in SQL
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    messages: Array<IMessage>;
    active: boolean;
}

// Channel Schema
const channelSchema = new Schema<IChannel>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    owner: { type: String, required: true },
    messages: { type: [new Schema<IMessage>({ sender: String, message: String, created_at: { type: Date, default: Date.now } })], default: [] },
    active: { type: Boolean, default: true }
});

const Channel = model<IChannel>('Channel', channelSchema);

export { Channel, IChannel, IMessage };