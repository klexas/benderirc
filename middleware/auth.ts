import dotenv from 'dotenv';
dotenv.config();

import jwt from "jsonwebtoken";
import logger from "mercedlogger";

const SECRET_KEY = process.env.SECRET_KEY ? process.env.SECRET_KEY : "SECRET_KEY";

const isLoggedIn = async (req, res, next) => {
  try {
    logger.log.magenta("Checking for token");
    console.log(req.headers);
    logger.log.magenta("Auth Header", req.headers);

    if (!req.headers.authorization){
        res.status(401).json({ error: "No authorization header" });
        return;
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) 
        {
            res.status(401).json({ error: "malformed auth header" });
            return;
        }

    const payload = await jwt.verify(token, SECRET_KEY);
    if (!payload) res.status(401).json({ error: "token verification failed" });
    // request store for the downstream
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "malformed auth header" });
  }
};

const isAdmin = async (req, res, next) => {
  const token = req.query.admin;
  try {
      // TODO: check if user is admin
      logger.log.magenta("ADMIN BEING PASSED THROUGH", token);
      if(token === "admin") {
        next();
      }
      else {
        res.status(401).json({ error: "You are not an admin" });
      }  
  } catch (error) {
    res.status(401).json({ error: "You are not an admin" });
  }
}

const getUser = async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
    if (!token) res.status(401).json({ error: "malformed auth header" });

    const payload = await jwt.verify(token, SECRET_KEY);
    logger.log.magenta("Payload", payload);
    return payload;
};

export { isLoggedIn, getUser, isAdmin}