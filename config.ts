const UserSettings = {
    // Listed as BOT but is actually a user
    // each "Setting" is a nice that will sit on the server and proxied through the websocket. 
    nick : 'bot',
    username: 'El encuentro',
    gecos: 'El encuentro',
    password : 'botpass',
    realname : 'El encuentro',
    channels : [{name: 'bot_test', key: ""}],
    host : 'irc.bot.net',
    port : 6667,
    auto_reconnect: false,
    auto_reconnect_wait: 10000,
    auto_reconnect_max_retries: 1
};

export default UserSettings;