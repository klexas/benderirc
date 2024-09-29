import { Client } from "irc-framework";
import UserSettings from "../config";
import winston from "winston";
import { SocketService } from "./socket";

export default class IrcService {
  private client: Client;
  private logger: winston.Logger;
  private socketService: SocketService;

  constructor(logger: winston.Logger, socketService: SocketService) {
    this.client = new Client();
    this.socketService = socketService;
    this.logger = logger;
    this.socketService.registerClient(this.client);
  }

  public connect() {
    if (!this.client.connected)
      try {
        this.client.connect(UserSettings);
      } catch (err) {
        console.log(err);
      }
  }

  public getClient() {
    return this.client;
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
        await this.socketService.sendMessageAsync(event.target, event.message, event.nick);
      }
    );

    this.client.on("error", (event) => {
      console.log(event);
    });

    return this.client;
  }
}
