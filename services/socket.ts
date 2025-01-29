import { Client } from "irc-framework";
import { Server } from "socket.io";
import { IDirectMessage, IMessage } from "../models/channel";
import UserSettings from "../config";
import MongooseDal from "./mongo";
import Utils from "./utils";

export class SocketService {
  private io: Server;
  private ircClient: Client;
  private socketConnections = [];
  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
  }
  getConnections() {
    return this.socketConnections;
  }
  registerClient(client: Client) {
    this.ircClient = client;
  }
  configureClient() {
    this.io.on("connection", (socket) => {
      console.log("a user connected : quasui Session ID: " + socket.id);
      // TODO: add by userID later
      this.socketConnections.push({
        socketId: socket.id,
        socket: socket,
        user: "",
      });
      // Channel Message
      socket.on("client:message", async (message) => {
        var channel = "Global";
        if (message.channel) channel = message.channel;

        // TODO: Need to find a better way to update the ircClient
        // A factory pattern would be better after removing dependancy circular
        this.ircClient.say("#" + channel, message.message);

        const messageStore: IMessage = {
          sender: UserSettings.nick, // TODO : get session user
          message: message.message,
          created_at: new Date(),
        };

        await MongooseDal.addMessage(message.channel, messageStore);
      });

      // Direct Message
      socket.on("client:direct", async (message) => {
        const directMessage: IDirectMessage = {
          sender: message.from,
          owner: message.to,
          message: message.message,
          created_at: new Date(),
        };

        await MongooseDal.addDirectMessage(directMessage);
        this.ircClient.say(message.to, message.message);
      });

    });
    return this.io;
  }
  
  async sendMessageAsync(channel: string, message: string, nick: string) {
    this.io.emit("chat:message", {
        user: nick,
        channel: channel,
        message: message,
      });

      const messageStore: IMessage = {
        sender: nick,
        message: message,
        created_at: new Date(),
      };

      await MongooseDal.addMessage(Utils.CleanChannel(channel),messageStore);
  }

  async sendDirectMessageAsync(message: string, nick: string) {
    const directMessage: IDirectMessage = {
      sender: nick,
      owner: UserSettings.nick,
      message: message,
      created_at: new Date(),
    };

    await MongooseDal.addDirectMessage(directMessage);

    console.log("sending direct message to " + nick);
    this.io.emit("chat:direct", {
      from: nick,
      message: message
    });
  }
}
