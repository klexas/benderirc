import express from 'express';
import { channelRouter } from './channel';
import { nickservRouter } from './nickserv';
import { chanservRouter } from './chanserv';
import { userRouter } from './user';
import { isLoggedIn } from '../middleware/auth';

export const routes = express.Router();

//routes.use("channel", channelRouter);
routes.use("/cs", isLoggedIn, chanservRouter);
routes.use("/ns", isLoggedIn, nickservRouter);
routes.use('/user', userRouter);