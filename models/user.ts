import { Schema, model, connect } from 'mongoose';

interface IUser {
    username: string;
    password: string;
    email: string;
    created_at: Date;
    updated_at: Date;
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  });

const User = model<IUser>('User', userSchema);

export default User;