import { RequestHandler, Router, Request } from "express";
import { IChannel } from "../../models/channel";
import UserSettings from "../../config";
import MongooseDal from "../../services/mongo";
import IrcService from "../../services/ircService";

export const chanservRouter = Router();

export function connect(ircClient: IrcService) : RequestHandler {
  return async function(req: Request, res: any) {	
    if(ircClient.getClient().connected){
      var usersChannels = await MongooseDal.getChannelsForUser(UserSettings.nick);
      console.log("Users channels: ", usersChannels);
      res.send( {nick: UserSettings.nick, state: usersChannels} );
      return;
    }

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
	}
}