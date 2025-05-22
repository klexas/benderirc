import express from 'express';
import express from 'express';
// import { channelRouter } from './channel'; // Not currently used
import { nickservRouter } from './nickserv';
import { chanservRouter } from './chanserv';
import { userRouter } from './user';
import { ircRouter } from './irc'; // Import the new IRC router
import { isLoggedIn } from '../middleware/auth';

export const routes = express.Router();

//routes.use("/channel", channelRouter); // Example if re-enabled
routes.use("/cs", isLoggedIn, chanservRouter);
routes.use("/ns", isLoggedIn, nickservRouter);
routes.use('/user', userRouter);
routes.use('/irc', ircRouter); // Mount the new IRC router