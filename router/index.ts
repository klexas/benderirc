import express from 'express';
import { nickservRouter } from './nickserv';
import { userRouter } from './user';
import { ircRouter } from './irc'; 
import { isLoggedIn } from '../middleware/auth';

export const routes = express.Router();

routes.use("/ns", isLoggedIn, nickservRouter);
routes.use('/user', userRouter);
routes.use('/irc', ircRouter); 