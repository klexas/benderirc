import { Server } from "socket.io";
import { createServer } from "http";
import { IMessage } from "../models/channel";
import { Client } from "irc-framework";
import UserSettings from "../config";
import winston from "winston";
import MongooseDal from "./mongo";
import Utils from "./utils";

export default class IrcClient {
  private client: Client;
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.client = new Client();
    this.logger = logger;
  }

  public connect() {
    if (!this.client.connected)
      try {
        this.client.connect(UserSettings);
      } catch (err) {
        console.log(err);
      }
  }

  public configureClient() {
    this.client.on("socket close", (e) => {
      console.log(e);
      console.log("socket closed");
    });

    this.client.on(
      "message",
      async (event: { nick: any; target: string; message: any }) => {
        // TODO: This is for the POC - this should have a DTO and also is XSS vulnerable.
        this.logger.info({
          user: event.nick,
          channel: event.target,
          message: event.message,
        });
        // TODO: This can notify a socktService
        // this.io.emit("chat:message", {
        //   user: event.nick,
        //   channel: event.target,
        //   message: event.message,
        // });

        const messageStore: IMessage = {
          sender: event.nick, // TODO : get session user
          message: event.message,
          created_at: new Date(),
        };

        console.log(messageStore);

        await MongooseDal.addMessage(
          Utils.CleanChannel(event.target),
          messageStore
        );
      }
    );

    this.client.on("error", (event) => {
      console.log(event);
    });
  }
}
