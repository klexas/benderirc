import { Router } from "express";
import { IChannel } from "../../models/channel";
import UserSettings from "../../config";
import MongooseDal from "../../services/mongo";
import IrcClient from "../../services/irc_client";
import winston from "winston";

export const chanservRouter = Router();
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "irc" },
  transports: [new winston.transports.Console()],
});

const ircClient = new IrcClient(logger);

chanservRouter.post("/connect", async (req, res) => {
  ircClient.connect();

  // TODO: Move this to a service
  var userInfo: IChannel = {
    name: UserSettings.nick,
    description: "Users NS Channel",
    owner: UserSettings.nick,
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
    active: true,
  };
  MongooseDal.createChannel(userInfo);

  ircClient.configureClient();

  var usersChannels = await MongooseDal.getChannelsForUser(UserSettings.nick);
  res.send( {nick: UserSettings.nick, state: usersChannels} );
});
