import Express from "express";
import Cors from "cors";
import morgan from "morgan";
import UserSettings from "./config";
import MongooseDal from "./services/mongo";
import { IChannel } from "./models/channel";
import { routes } from "./router";
import { createServer } from "http";
import { SocketService } from "./services/socket";
import { connect } from "./router/chanserv";
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
const clientService = new IrcService(socketService);

const client = clientService.getClient();

socketService.configureClient();

app.use(Cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/", routes);
app.post("/connect", isLoggedIn, connect(clientService));

app.use("/static", Express.static("public"));
app.use("/login", Express.static("public/login/login.html"));

app.post("/join/dm/:nick", isLoggedIn, async (req, res) => {
  const nick = req.params.nick;
  var dms = await MongooseDal.getDirectMessagesForUser(UserSettings.nick, nick);
  res.send({ nick: nick, messages: dms });
});

app.post("/channel/join", isLoggedIn, async (req, res) => {
  const socketConnections = socketService.getConnections();
  const channel = client.channel("#" + req.body.channel, req.body.key);

  channel.join("#" + req.body.channel, req.body.key);

  let channelMongo: IChannel = {
    active: true,
    name: req.body.channel,
    description: "Test Channel",
    owner: UserSettings.nick,
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
        messages: channelMessages.messages
      });
    });
    res.send({ users: users, channel: req.body.channel });
  });
});

httpServer.listen(3000, () => {
  console.log("listening on *:3000");
});
