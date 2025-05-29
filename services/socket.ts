import { Client } from "irc-framework";
import { Server } from "socket.io";
import { IDirectMessages, IMessage } from "../models/channel";
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

        this.ircClient.say("#" + channel, message.message);

        const messageStore: IMessage = {
          sender: message.from || "unknown", // Use sender from payload
          message: message.message,
          created_at: new Date(),
        };

        await MongooseDal.addMessage(message.channel, messageStore);
      });

      // Direct Message
      socket.on("client:direct", async (message) => {
        const from = message.from || "unknown";
        const to = message.to || "unknown";
        const directMessage: IMessage = {
          sender: from,
          message: message.message,
          created_at: new Date(),
        };
        await MongooseDal.addDirectMessage(to, from, directMessage);
        this.ircClient.say(to, message.message);
      });

    });
    return this.io;
  }
  
  async sendMessageAsync(channel: string, message: string, nick: string) {
    this.io.emit("chat:message", {
      type: "channel",
      source: channel, // channel name
      target: channel, // for channels, source and target are the same
      sender: nick,
      message: message
    });

    const messageStore: IMessage = {
      sender: nick,
      message: message,
      created_at: new Date(),
    };

    await MongooseDal.addMessage(Utils.CleanChannel(channel), messageStore);
  }

  async sendDirectMessageAsync(message: string, fromNick: string, toNick: string) {
    const directMessage: IMessage = {
      sender: fromNick,
      message: message,
      created_at: new Date(),
    };
    await MongooseDal.addDirectMessage(toNick, fromNick, directMessage);

    console.log("sending direct message to " + toNick);
    this.io.emit("chat:direct", {
      type: "direct",
      source: fromNick, // sender
      target: toNick, // recipient
      sender: fromNick,
      message: message
    });
  }
}
