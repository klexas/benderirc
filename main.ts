import Express from "express";
import Cors from "cors";
import morgan from "morgan";
// import { Client } from "irc-framework";
import UserSettings from "./config";
import MongooseDal from "./services/mongo";
import { IChannel } from "./models/channel";
import { routes } from './router';
import { createServer } from "http";
import { SocketService } from "./services/socket";
import { connect } from "./router/chanserv";
import IrcService from "./services/ircService";
import winston from "winston";

MongooseDal.connect().then(
  () => {
    console.log("Connected to MongoDB");
  },
  (err) => {
    console.log(err);
  }
);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "irc" },
  transports: [new winston.transports.Console()],
});

const app = Express();

const httpServer = createServer(app);
const socketService = new SocketService(httpServer);
const client = new IrcService(logger, socketService);

socketService.configureClient();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use('/', routes);
app.post("/connect", connect(client));

app.use("/static", Express.static("public"));

app.post("/channel/join", async (req, res) => {
  var channel = client.getClient().channel("#" + req.body.channel, req.body.key);
  channel.join();

  var channelMongo: IChannel = {
    active: true,
    name: req.body.channel,
    description: "Test Channel",
    owner: UserSettings.nick,
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
  };

  await MongooseDal.createChannel(channelMongo);
  const socketCons = socketService.getConnections();
  console.log("Socket connections: " + socketCons.length);
  var users = channel.users;
  socketCons.forEach((socket) => {
    console.log("Emitting to " + socket.socketId);
    socket.socket.emit("channel:joined", {
      channel: req.body.channel,
      users: users,
    });
  });

  res.send({users: users, channel: req.body.channel });
});

// DEBUG AREA
app.get('/debug', async (req, res) => {
  const channels = await MongooseDal.getChannels();
  res.send(channels);
});

app.get('/debug/channel/:ownerName', async (req, res) => {
  const channels = await MongooseDal.getChannelsForUser(req.params.ownerName);
  res.send(channels);
});

app.get("/channel/list", (req, res) => {
  res.send(client.getClient().channelList);
});

app.post("/message/send", (req, res) => {
  console.log(req.body);
  client.getClient().say("#" + req.body.channel, req.body.message);
  client.getClient().say(req.body.channel, req.body.message);
  res.send("Message sent!");
});

app.post('/nick/set', (req, res) => { 
  console.log(req.body);
  client.getClient().changeNick(req.body.nick);

  res.send({message: "Nick changed", nick: req.body.nick });
});

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
