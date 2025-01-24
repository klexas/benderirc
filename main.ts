import Express from "express";
import Cors from "cors";
import morgan from "morgan";
import UserSettings from "./config";
import MongooseDal from "./services/mongo";
import { IChannel } from "./models/channel";
import { routes } from './router';
import { createServer } from "http";
import { SocketService } from "./services/socket";
import { connect } from "./router/chanserv";
import IrcService from "./services/ircService";
// Import middleware
import { isLoggedIn } from './middleware/auth';

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
const clientService = new IrcService(socketService);

const client = clientService.getClient();

socketService.configureClient();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use('/', routes);
app.post("/connect", isLoggedIn, connect(clientService));

app.use("/static", Express.static("public"));

app.use("/login", Express.static("private/login.html"));

app.use("/private", Express.static("private"));

app.post("/channel/join", async (req, res) => {
  const socketConnections = socketService.getConnections();
  const channel = client.channel("#" + req.body.channel, req.body.key);

  channel.join("#" + req.body.channel, req.body.key);

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

  channel.updateUsers(() => {
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

// // DEBUG AREA
// app.get('/debug', async (req, res) => {
//   const channels = await MongooseDal.getChannels();
//   res.send(channels);
// });

// app.get('/debug/channel/:ownerName', async (req, res) => {
//   const channels = await MongooseDal.getChannelsForUser(req.params.ownerName);
//   res.send(channels);
// });

// app.get("/channel/list", (req, res) => {
//   res.send(client.channelList);
// });

// app.post("/message/send", (req, res) => {
//   console.log(req.body);
//   client.say("#" + req.body.channel, req.body.message);
//   client.say(req.body.channel, req.body.message);
//   res.send("Message sent!");
// });

// app.post('/nick/set', (req, res) => { 
//   console.log(req.body);
//   client.changeNick(req.body.nick);
//   res.send({message: "Nick changed", nick: req.body.nick });
// });

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
