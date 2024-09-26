import Express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Cors from "cors";
import morgan from "morgan";
import winston from "winston";

// TODO: Move MongoDB actions etc to a writing gateway.
//import MongoDb from 'mongodb';
// Note : There is support for the webIRC protocol. This can allow with support bots.
// TODO: Write typings for this.
import { Client } from "irc-framework";
import UserSettings from "./config";

// MonogooseDal
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

const app = Express();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

let socketConnections = [];

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "irc" },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
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

app.get("/connect", (req, res) => {
  if (!client.connected) client.connect(UserSettings);

  var userInfo: IChannel = {
    name: UserSettings.nick,
    description: "Users NS Channel",
    owner: UserSettings.nick,
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
  };

  MongooseDal.createChannel(userInfo);

  client.on("socket close", (e) => {
    console.log(e);
    console.log("socket closed");
  });

  client.on("connected", () => {
    client.join("channel");
  });

  client.on("registered", () => {
    client.join("channel");
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

  res.send(client.connected);
});

app.get("/channel/joinall", (req, res) => {
  var result = [];

  UserSettings.channels.forEach((channel) => {
    var channelObj = client.channel(
      Utils.FormChannel(channel.name),
      channel.key
    );
    channelObj.join();
    channelObj.updateUsers();

    channelObj.updateUsers(function () {
      var users = channelObj.users;
      console.log(users);
      result.push({ channel: channel.name, status: "joined", users: users });

      res.send(result);
    });

    // Or you could even stream the channel messages elsewhere
    // var stream = channel.stream();
    // stream.pipe(process.stdout);
  });
});

// app.get('/channel/join/:channelName', async (req, res) => {
//     // TODO: Do we always need o build out a buffer ?
//     // get chanel from UserSettings
//     // var channelInfo = UserSettings.channels.find(x => x.name == req.params.channelName);

//     var channel = client.channel('#' + req.params.channelName);
//     channel.join();

//     channel.updateUsers(function() {
//         var users = channel.users;
//         socketConnections.forEach(socket => {
//             socket.emit('channel:joined', { channel: req.params.channelName, users: users });
//         });

//         res.send('Joined channel : #' + req.params.channelName);
//     });
// });

app.post("/channel/join", async (req, res) => {
  var channel = client.channel("#" + req.body.channel, req.body.key);
  channel.join();

  var channelMongo: IChannel = {
    name: req.body.channel,
    description: "Test Channel",
    owner: "yorha",
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
  };

  console.log(channelMongo);

  await MongooseDal.createChannel(channelMongo);

  channel.updateUsers(function () {
    var users = channel.users;
    socketConnections.forEach((socket) => {
      socket.emit("channel:joined", {
        channel: req.body.channel,
        users: users,
      });
    });
    res.send("Joined channel : #" + req.body.channel);
  });
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

// Socket Hooks
io.on("connection", (socket) => {
  console.log("a user connected : quasui Session ID: " + socket.id);
  // TODO: add by userID later
  socketConnections.push(socket);
  socket.on("client:message", async (message) => {
    var channel = "tadas_test";
    if (message.channel) channel = message.channel;
    client.say("#" + channel, message.message);
    // client.say(channel, message.message);
    // Shadow message to self.
    client.say("tadas", message.message);

    const messageStore: IMessage = {
      sender: "yorha", // TODO : get session user
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
