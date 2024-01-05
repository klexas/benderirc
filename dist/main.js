"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const winston_1 = __importDefault(require("winston"));
// TODO: Move MongoDB actions etc to a writing gateway.
//import MongoDb from 'mongodb';
// Note : There is support for the webIRC protocol. This can allow with support bots. 
// TODO: Write typings for this.
const irc_framework_1 = require("irc-framework");
const config_1 = __importDefault(require("./config"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: 'irc' },
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),
        new winston_1.default.transports.Console()
    ],
});
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
const client = new irc_framework_1.Client();
app.get('/', (req, res) => {
    if (!client.connected)
        client.connect(config_1.default);
    client.on('socket close', (e) => {
        console.log(e);
        console.log('socket closed');
    });
    client.on('connected', () => {
        client.join('channel');
    });
    client.on('registered', () => {
        client.join('channel');
    });
    client.on('message', (event) => {
        logger.info({ user: event.nick, channel: event.target, message: event.message });
    });
    client.on('error', (event) => {
        console.log(event);
    });
    res.send(client.connected);
});
app.get('/channel/join/:channelName', (req, res) => {
    // TODO: Do we always need o build out a buffer ?
    var channel = client.channel('#' + req.params.channelName);
    channel.join();
    res.send('Joined channel : #' + req.params.channelName);
});
app.get('/channel/list', (req, res) => {
    res.send(client.channelList);
});
app.post('/message', (req, res) => {
    console.log(req.body);
    client.say('#channel', req.body.message);
    res.send('Message sent!');
});
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('message', (message) => {
        console.log(message);
        client.say('#channel', message);
    });
});
httpServer.listen(3000, () => {
    console.log('listening on *:3000');
});
//# sourceMappingURL=main.js.map