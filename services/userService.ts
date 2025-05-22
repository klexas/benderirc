import dotenv from 'dotenv';
dotenv.config();

// import { SaveUser, GetUser, UserModel } from '../models/userSchema'; // Temporarily commented out
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { log } from "mercedlogger";

const SECRET_KEY = process.env.SECRET_KEY ? process.env.SECRET_KEY : "SECRET_KEY";
log.magenta("SECRET KEY FOUND : " + SECRET_KEY);

const register = async (req, callback) => {
    // try {
    //     const { username, email, password } = req;
    //     const pw = await bcrypt.hash(password, 12);
    //     const user = new UserModel(username, email, pw); // UserModel is from the deleted file
    //     const token = createJWT(user);
    //     log.magenta("REGISTER", 'User Created Successfully' + username);
    //     await SaveUser(user); // SaveUser is from the deleted file

    //     callback(null, { token });
    // } catch (error) {
    //     log.red("REGISTER", 'Could not register' + error);
    //     callback({ error: error.message }, null);
    // }
    log.warn("userService.register is currently disabled due to missing models/userSchema.ts");
    callback({ error: "Registration is temporarily disabled." }, null);
}

const login = async (req, callback) => {
    // try {
    //     const { username, password } = req;
    //     const user = await GetUser(username); // GetUser is from the deleted file
    //     if (await bcrypt.compare(password, user.password)) {
    //         const token = createJWT(user);
    //         callback(null, { token: token, username: user.username });
    //     } else {
    //         callback({ error: "Invalid Credentials" });
    //     }
    // } catch (error) {
    //     callback({ error: error.message }, null);
    // }
    log.warn("userService.login is currently disabled due to missing models/userSchema.ts");
    callback({ error: "Login is temporarily disabled." }, null);
}

const createJWT = (user) => { // user type here was UserModel, will need adjustment if used
    return jwt.sign(
        { user }, // This 'user' object structure might need to align with actual User model from models/user.ts
        SECRET_KEY,
        { expiresIn: "24h" }
    );
}

export default {
    Register: register,
    Login: login
}