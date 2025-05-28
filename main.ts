import Express from "express";
import Cors from "cors";
import morgan from "morgan";
import MongooseDal from "./services/mongo";
import { IChannel } from "./models/channel";
import { routes } from "./router"; // This will include the ircRouter via router/index.ts
import { createServer } from "http";
import { SocketService } from "./services/socket";
import IrcService from "./services/ircService";
import { isLoggedIn } from "./middleware/auth";

MongooseDal.connect().then(
  () => {
    console.log("Connected to MongoDB");
  },
  (err) => {
    console.log(err);
  }
);

const app = Express();

const httpServer = createServer(app);
const socketService = new SocketService(httpServer);
// Export clientService so it can be imported by router/irc.ts
export const clientService = new IrcService(socketService);
socketService.configureClient();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Prefix all routes from router/index.ts with /api
app.use("/api", routes); 

app.use("/static", Express.static("public"));
app.use("/login", Express.static("public/login/login.html"));

app.post("/join/dm/:nick", isLoggedIn, async (req, res) => {
  const nick = req.params.nick;
  var dms = await MongooseDal.getDirectMessagesForUser("tes", nick); // TODO: "tes" should be dynamic userId
  res.send({ nick: nick, messages: dms?.messages || [] });
});

app.post("/channel/join", isLoggedIn, async (req: any, res) => { // Using 'any' for req for now, can be typed better
  try {
    // 1. Middleware and User ID
    if (!req.user || !req.user.user || !req.user.user._id) {
      return res.status(401).json({ message: "User not authenticated or user ID missing." });
    }
    const userId = req.user.user._id;
    const userNick = req.user.user.username || "UnknownUser"; // Fallback for owner

    // 2. Request Body Parameters
    const { serverName, channel, key } = req.body;

    if (!serverName || typeof serverName !== 'string' || serverName.trim() === '') {
      return res.status(400).json({ message: "serverName is required and must be a non-empty string." });
    }
    if (!channel || typeof channel !== 'string' || channel.trim() === '') {
      return res.status(400).json({ message: "channel is required and must be a non-empty string." });
    }

    // 3. Call clientService.joinChannel
    // Prepending "#" is handled by the IrcService.joinChannel if it's a convention there,
    // or it should be prepended here if IrcService expects it without the #.
    // Based on previous subtask, IrcService.joinChannel does not add "#", so we add it here.
    // However, the new IrcService.joinChannel in the previous step doesn't show it adding "#".
    // Let's assume for now that the channel name should be passed as is, and if it needs "#", IrcService handles it or it's part of the name.
    // For consistency with typical IRC, we often see "#" prepended by the client initiating the join.
    // The previous implementation `client.channel("#" + req.body.channel...` did prepend it.
    // The IrcService.joinChannel method itself does *not* prepend '#'.
    // So, it's better to prepend it here before calling the service.
    const channelWithHash = channel.startsWith("#") ? channel : "#" + channel;
    
    const joined = await clientService.joinChannel(userId, serverName, channelWithHash, key);

    if (!joined) {
      return res.status(500).json({ message: `Failed to join channel ${channelWithHash} on server ${serverName}. Client may not be connected or channel join failed.` });
    }

    // 4. Database and Response Logic (if joinChannel is successful)
    let channelMongo: IChannel = {
      active: true,
      name: channel, // Store the original channel name without hash for DB consistency if preferred
      description: "User Joined Channel", // Or some other default/dynamic description
      owner: userNick, 
      created_at: new Date(),
      updated_at: new Date(),
      messages: [],
    };

    var channelMessages = await MongooseDal.getMessagesForChannel(channel); // Use original channel name
    await MongooseDal.createChannel(channelMongo); // This might create duplicates if channel already exists. Consider findOrCreate.

    const socketConnections = socketService.getConnections();
    socketConnections.forEach((socket) => {
      socket.socket.emit("channel:joined", {
        channel: channel, // Use original channel name
        users: [], // TODO: Implement a mechanism to fetch/update user list for the channel after joining.
        messages: channelMessages?.messages || [],
      });
    });

    res.status(200).json({ channel: channel, message: "Join initiated. User list will be updated." });

  } catch (error) {
    console.error("Error in /channel/join:", error);
    const message = (error instanceof Error) ? error.message : 'An unexpected error occurred.';
    res.status(500).json({ message: "Failed to join channel due to an internal error.", error: message });
  }
});

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
