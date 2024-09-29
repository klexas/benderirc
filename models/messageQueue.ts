import { Schema, model } from 'mongoose';

interface IMessageQueue {
    message: string;
    channel: string;
    sender: string;
    created_at: Date;
}

const messageQueueSchema = new Schema<IMessageQueue>({
    message: { type: String, required: true },
    channel: { type: String, required: true },
    sender: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const MessageQueue = model<IMessageQueue>('MessageQueue', messageQueueSchema);

// export messageQueue and interface
export { MessageQueue, IMessageQueue };