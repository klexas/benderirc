import dotenv from 'dotenv';
dotenv.config();

import { SaveUser, GetUser, UserModel } from '../models/userSchema';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { log } from "mercedlogger";

const SECRET_KEY = process.env.SECRET_KEY ? process.env.SECRET_KEY : "SECRET_KEY";
log.magenta("SECRET KEY FOUND : " + SECRET_KEY);

const register = async (req, callback) => {
    try {
        const { username, email, password } = req;
        const pw = await bcrypt.hash(password, 12);
        const user = new UserModel(username, email, pw);
        const token = createJWT(user);
        log.magenta("REGISTER", 'User Created Successfully' + username);
        await SaveUser(user);

        callback(null, { token });
    } catch (error) {
        log.red("REGISTER", 'Could not register' + error);
        callback({ error: error.message }, null);
    }
}

const login = async (req, callback) => {
    try {
        const { username, password } = req;
        const user = await GetUser(username);
        if (await bcrypt.compare(password, user.password)) {
            const token = createJWT(user);
            callback(null, { token: token, username: user.username });
        } else {
            callback({ error: "Invalid Credentials" });
        }
    } catch (error) {
        callback({ error: error.message }, null);
    }
}

const createJWT = (user) => {
    return jwt.sign(
        { user },
        SECRET_KEY,
        { expiresIn: "24h" }
    );
}

export default {
    Register: register,
    Login: login
}