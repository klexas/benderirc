import { Client } from "irc-framework";
import { SocketService } from "./socket";
import { log } from "mercedlogger";

// Define the interface for IRC server configuration
export interface IrcServerConfig {
  name: string; // Unique name for the server configuration
  host: string;
  port: number;
  nick: string;
  username?: string; // Usually the same as nick
  password?: string;
  realname?: string;
  channels?: string[];
  secure?: boolean; // For SSL/TLS connections
  selfSigned?: boolean; // Allow self-signed certificates for secure connections
  certExpired?: boolean; // Allow expired certificates for secure connections
}

export default class IrcService {
  private clients: Map<string, Client> = new Map();
  private socketService: SocketService;

  constructor(socketService: SocketService) {
    this.socketService = socketService;
    // this.socketService.registerClient(this.client); // Re-evaluate this: socketService might need a new way to handle multiple clients
  }

  private generateClientKey(userId: string, serverName: string): string {
    return `${userId}_${serverName}`;
  }

  public connect(userId: string, serverConfig: IrcServerConfig) {
    const clientKey = this.generateClientKey(userId, serverConfig.name);
    
    if (this.clients.has(clientKey)) {
      const existingClient = this.clients.get(clientKey);
      if (existingClient && existingClient.connected) {
        log.cyan(`Already connected to ${serverConfig.name} for user ${userId}`);
        return;
      }
    }

    const newClient = new Client();
    this.configureSingleClient(newClient, userId, serverConfig.name);
    this.clients.set(clientKey, newClient);

    try {
      log.cyan(`Connecting to ${serverConfig.host} for user ${userId} with nick ${serverConfig.nick}`);
      newClient.connect({
        host: serverConfig.host,
        port: serverConfig.port,
        nick: serverConfig.nick,
        username: serverConfig.username || serverConfig.nick,
        password: serverConfig.password,
        realname: serverConfig.realname,
        channels: serverConfig.channels,
        secure: serverConfig.secure,
        selfSigned: serverConfig.selfSigned,
        certExpired: serverConfig.certExpired,
      });
    } catch (err) {
      log.cyan(`Error connecting to ${serverConfig.name} for user ${userId}:`, err);
      this.clients.delete(clientKey); // Clean up if connection fails immediately
    }
  }

  public getClient(userId: string, serverName: string): Client | undefined {
    const clientKey = this.generateClientKey(userId, serverName);
    return this.clients.get(clientKey);
  }

  public joinChannel(userId: string, serverName: string, channelName: string, key?: string): boolean {
    const clientKey = this.generateClientKey(userId, serverName);
    const client = this.clients.get(clientKey);

    if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
      log.red(`Failed to join channel: Invalid channel name for user ${userId} on server ${serverName} for channel ${channelName}`);
      return false;
    }

    if (client && client.connected) {
      log.red(`User ${userId} attempting to join channel ${channelName} on server ${serverName}`);
      client.join(channelName, key);
      return true;
    } else {
      log.red(`Failed to join channel: Client not found or not connected for user ${userId} on server ${serverName} for channel ${channelName}`);
      return false;
    }
  }

  private configureSingleClient(client: Client, userId: string, serverName: string) {
    client.on("socket connect", () => {
        log.cyan(`Socket connected for ${userId} on ${serverName}`);
    });

    client.on("socket close", (e) => {
      log.cyan(`Socket closed for ${userId} on ${serverName}`, e);
      console.log(e);
      // Optionally, attempt to reconnect or notify the user
      // const clientKey = this.generateClientKey(userId, serverName);
      // this.clients.delete(clientKey); // remove client from map on disconnect
    });

    client.on(
      "message",
      async (event: { nick: any; target: string; message: any }) => {
        log.magenta({
          user: event.nick,
          server: serverName, // Add server context
          userId: userId, // Add user context
          channel: event.target,
          message: event.message,
        });

        // Pass userId and serverName to socketService methods (requires socketService modification)
        if(event.target[0] === "#" || event.target === "*") { // Channel message or server message (like MOTD part)
            // Consider prefixing channel with serverName if channels can have same name across servers
            await this.socketService.sendMessageAsync(event.target, event.message, event.nick);
        } else { // Direct message
            await this.socketService.sendDirectMessageAsync(event.message, event.nick);
        }
      }
    );
    
    client.on("registered", (event) => {
        log.cyan(`Registered to ${serverName} for user ${userId}: ${event.nick}`);
        // Auto-join channels if specified in serverConfig
        const serverConfig = (client as any).options; // A bit of a hack to get config back, better to store it alongside client
        if (serverConfig && serverConfig.channels && serverConfig.channels.length > 0) {
            serverConfig.channels.forEach((channel: string) => {
                log.cyan(`Auto-joining channel ${channel} on ${serverName} for user ${userId}`);
                client.join(channel);
            });
        }
    });

    client.on("error", (event) => {
      log.red(`IRC Error for ${userId} on ${serverName}:`, event);
    });

    // Add more event handlers as needed, e.g., 'join', 'part', 'kick', 'invite', 'notice'
    client.on("join", (event) => {
        log.cyan(`${event.nick} joined ${event.channel} on ${serverName} (User: ${userId})`);
        // Potentially notify socketService
    });

    client.on("part", (event) => {
        log.cyan(`${event.nick} left ${event.channel} on ${serverName} (User: ${userId})`);
        // Potentially notify socketService
    });
    
    client.on("nick", (event) => {
        log.magenta(`${event.old_nick} is now known as ${event.new_nick} on ${serverName} (User: ${userId})`);
        // Potentially update stored nick or notify socketService
    });

    // return client; // No longer needed as this method configures in place
  }
}
