import { Schema, model, connect } from 'mongoose';
import config from '../config';

class UserModel {
  username: string;
  email: string;
  password: string;

    constructor(username: string, email: string, password: string) {
        this.username = username;
        this.email = email;
        this.password = password;
    }
}

const userSchema = new Schema<UserModel>({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }
});

const User = model<UserModel>('User', userSchema);
// This can be fixed. 
async function GetUser(username: string) {
    // await connect(`mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.collections.users}`);
    return await User.findOne({ username: username });
}

async function SaveUser(userDeets: UserModel) {
    console.log(userDeets);
//   await connect(`mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.collections.users}`);

  const user = new User({
    username: userDeets.username,
    email: userDeets.email,
    password: userDeets.password
  });
  await user.save();
}

export { SaveUser, GetUser, UserModel };