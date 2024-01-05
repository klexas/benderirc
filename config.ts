const UserSettings = {
    // Listed as BOT but is actually a user
    // each "Setting" is a nice that will sit on the server and proxied through the websocket. 
    nick : 'bot_test',
    password : 'password',
    realname : 'bot_test',
    channels : ['#bot_test_channel'],
    host : 'irc.freenode.net',
    port : 6667,
    auto_reconnect: false,
    auto_reconnect_wait: 10000,
    auto_reconnect_max_retries: 1
};

export default UserSettings;