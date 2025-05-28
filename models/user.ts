import { Schema, model, connect } from 'mongoose';

export interface IIrcServer { // Add export here
    name: string;
    host: string;
    port: number;
    nick: string;
    password?: string;
    realname?: string;
    channels?: string[];
}

interface IUser {
    username: string;
    password: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    ircServers?: IIrcServer[];
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    ircServers: [{
        name: { type: String, required: true },
        host: { type: String, required: true },
        port: { type: Number, required: true },
        nick: { type: String, required: true },
        password: { type: String },
        realname: { type: String },
        channels: [{ type: String }]
    }]
  });

const User = model<IUser>('User', userSchema);

export default User;
export { IUser }; // Export interfaces for use in other modules