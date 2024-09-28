import Express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Cors from "cors";
import morgan from "morgan";
import winston from "winston";
import { Client } from "irc-framework";
import UserSettings from "./config";
import MongooseDal from "./services/mongo";
import { IChannel, IMessage } from "./models/channel";

MongooseDal.connect().then(
  () => {
    console.log("Connected to MongoDB");
  },
  (err) => {
    console.log(err);
  }
);
let socketConnections = [];

const app = Express();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "irc" },
  transports: [
    new winston.transports.Console(),
  ],
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const client = new Client();

app.use("/static", Express.static("public"));

app.post("/connect", async (req, res) => {
  if (!client.connected) client.connect(UserSettings);

  var userInfo: IChannel = {
    name: UserSettings.nick,
    description: "Users NS Channel",
    owner: UserSettings.nick,
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
    active: true
  };

  MongooseDal.createChannel(userInfo);

  client.on("socket close", (e) => {
    console.log(e);
    console.log("socket closed");
  });

  client.on(
    "message",
    async (event: { nick: any; target: string; message: any }) => {
      // TODO: This is for the POC - this should have a DTO and also is XSS vulnerable.
      logger.info({
        user: event.nick,
        channel: event.target,
        message: event.message,
      });
      io.emit("chat:message", {
        user: event.nick,
        channel: event.target,
        message: event.message,
      });

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

  client.on("error", (event) => {
    console.log(event);
  });

  // Get Users State from the mongoDB
  var usersChannels = await MongooseDal.getChannelsForUser(UserSettings.nick);
  res.send( {nick: UserSettings.nick, state: usersChannels} );

});

app.post("/channel/join", async (req, res) => {
  var channel = client.channel("#" + req.body.channel, req.body.key);
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

  console.log(channelMongo);

  await MongooseDal.createChannel(channelMongo);

  channel.updateUsers(function () {
    var users = channel.users;
    socketConnections.forEach((socket) => {
      socket.socket.emit("channel:joined", {
        channel: req.body.channel,
        users: users,
      });
    });
    res.send({users: users, channel: req.body.channel });
  });
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
  res.send(client.channelList);
});

app.post("/message/send", (req, res) => {
  console.log(req.body);
  client.say("#" + req.body.channel, req.body.message);
  client.say(req.body.channel, req.body.message);
  res.send("Message sent!");
});

app.post('/nick/set', (req, res) => { 
  console.log(req.body);
  client.changeNick(req.body.nick);

  res.send({message: "Nick changed", nick: req.body.nick });
});


// Socket Hooks
io.on("connection", (socket) => {
  console.log("a user connected : quasui Session ID: " + socket.id);
  // TODO: add by userID later
  socketConnections.push({socketId: socket.id, socket: socket, user: ""});
  socket.on("client:message", async (message) => {
    var channel = "tadas_test";
    if (message.channel) channel = message.channel;
    client.say("#" + channel, message.message);

    const messageStore: IMessage = {
      sender: UserSettings.nick, // TODO : get session user
      message: message.message,
      created_at: new Date(),
    };

    console.log(messageStore);

    await MongooseDal.addMessage(message.channel, messageStore);
  });
});

const Utils = {
  CleanChannel: (channel: string) => {
    return channel.replace("#", "");
  },
  FormChannel: (channel: string) => {
    return "#" + channel;
  },
};

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
