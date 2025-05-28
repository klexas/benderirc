import Express from "express";
import Cors from "cors";
import morgan from "morgan";
import UserSettings from "./config";
import MongooseDal from "./services/mongo";
import { IChannel } from "./models/channel";
import { routes } from "./router"; // This will include the ircRouter via router/index.ts
import { createServer } from "http";
import { SocketService } from "./services/socket";
// import { connect } from "./router/chanserv"; // This 'connect' was for the old /connect route
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

// const client = clientService.getClient();
// TODO: The line above gets a single client, which is part of the old architecture.
// The app.post("/channel/join",...) route below uses this 'client' variable.
// This route will be broken by this change and will need refactoring in a future task
// to get the correct client instance (e.g., based on user and server) from clientService.
// For now, an error will occur if /channel/join is called.
// To avoid a hard crash on startup if 'client' is used elsewhere before being defined,
// we can declare it, but it won't be functional for the old /channel/join.
let client;


socketService.configureClient();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Prefix all routes from router/index.ts with /api
app.use("/api", routes); 
// Remove old /connect route, it's now handled by /api/irc/connect via ircRouter
// app.post("/connect", isLoggedIn, connect(clientService)); 

app.use("/static", Express.static("public"));
app.use("/login", Express.static("public/login/login.html"));

app.post("/join/dm/:nick", isLoggedIn, async (req, res) => {
  const nick = req.params.nick;
  var dms = await MongooseDal.getDirectMessagesForUser("tes", nick);
  res.send({ nick: nick, messages: dms?.messages || [] });
});

app.post("/channel/join", isLoggedIn, async (req, res) => {
  // TODO: This route needs refactoring due to changes in IrcService and client handling.
  // The 'client' variable used here is no longer the globally relevant IRC client instance.
  // This route will likely fail or behave unexpectedly until updated.
  if (!client) {
    return res.status(500).json({ message: "IRC client not available for channel join. Needs refactoring."});
  }
  const socketConnections = socketService.getConnections();
  const channel = client.channel("#" + req.body.channel, req.body.key);

  channel.join("#" + req.body.channel, req.body.key);

  let channelMongo: IChannel = {
    active: true,
    name: req.body.channel,
    description: "Test Channel",
    owner: "UserSettings.nick", // TODO: This should ideally be the logged-in user's nick
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
  };

  var channelMessages = await MongooseDal.getMessagesForChannel(req.body.channel);
  await MongooseDal.createChannel(channelMongo);

  channel.updateUsers(() => {
    var users = channel.users;
    socketConnections.forEach((socket) => {
      socket.socket.emit("channel:joined", {
        channel: req.body.channel,
        users: users,
        messages: channelMessages?.messages || [],
      });
    });
    res.send({ users: users, channel: req.body.channel });
  });
});

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
