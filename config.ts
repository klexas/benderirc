import { mongo } from "mongoose";

const UserSettings = {
    // Listed as BOT but is actually a user
    // each "Setting" is a nice that will sit on the server and proxied through the websocket. 
    nick : 'nick',
    username: 'El encuentro',
    gecos: 'El encuentro',
    password : '',
    realname : 'El encuentro',
    channels : [],
    host : 'irc.server.com',
    port : 6667,
    auto_reconnect: false,
    auto_reconnect_wait: 10000,
    auto_reconnect_max_retries: 1,
    mongo : {
        host: '127.0.0.1',
        port: 27017,
        database: 'benderirc',
        collections: {
            channels: 'channels',
            messageQueue: 'messageQueue',
            users: 'users'
        }
    }
};

export default UserSettings;