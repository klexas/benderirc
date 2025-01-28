import { Client } from "irc-framework";
import UserSettings from "../config";
import { SocketService } from "./socket";
import logger from "mercedlogger";

export default class IrcService {
  private client: Client;
  private socketService: SocketService;

  constructor(socketService: SocketService) {
    this.client = new Client();
    this.socketService = socketService;
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
        logger.log.magenta({
          user: event.nick,
          channel: event.target,
          message: event.message,
        });

        if(event.target[0] === "#" || event.target == "AUTH") // Channel message
          await this.socketService.sendMessageAsync(event.target, event.message, event.nick);
        else // Direct message
          await this.socketService.sendDirectMessageAsync(event.message, event.nick);
      }
    );

    this.client.on("error", (event) => {
      console.log(event);
    });

    return this.client;
  }
}
