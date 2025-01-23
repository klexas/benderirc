import express from 'express';
import { channelRouter } from './channel';
import { nickservRouter } from './nickserv';
import { chanservRouter } from './chanserv';
import { userRouter } from './user';

export const routes = express.Router();

//routes.use("channel", channelRouter);
routes.use("/cs", chanservRouter);
routes.use("/ns", nickservRouter);
routes.use('/user', userRouter);
routes.use('/private', privateRouter)