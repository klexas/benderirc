var token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
}
var authToken = localStorage.getItem('token');
axios.defaults.headers['Authorization'] = 'Bearer ' + authToken; 
axios.headers = {   
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + authToken
};

var selectedChannel = "ChanServe";
var socket = io('http://127.0.0.1:3000');
var currentNick = '';
var channels = [];
var dmUsers = [{user: 'ChanServe', messages: []}];

$(document).ready(function () {
    $("#message").keypress(function (e) {
        if (e.which == 13) {
            var message = $('#message').val();
            $('#message').val('');
            addMessage({
                user: currentNick,
                message: message
            });
            // Socket sent
            socket.emit('client:message', {
                message: message,
                channel: selectedChannel
            });     
          return false;  
        }
      });
    $('#message_send').click(function () {
        var message = $('#message').val();
        $('#message').val('');
        // Socket sent
        socket.emit('client:message', {
            message: message,
            channel: selectedChannel
        });     
        addMessage({
            user: currentNick,
            message: message
        });
    });

    $('#connect').click(()=>{
        toggleLoggedIn();
        $('#channel_name').text(selectedChannel);
        axios.post('http://127.0.0.1:3000/connect').then((response)=>{
            channels = response.data.state;
            currentNick = response.data.nick;
            $('#prefix_nick').text(currentNick);
            $.each(channels, function (index, channel) {
                $('#channels').append('<button id="channel_'+channel.name+'" class="bg-purple-600 hover:bg-red-700 text-white font-smallpy-2 px-4 rounded-lg" onclick="openChannel(\'' + channel.name + '\')" class="text-blue-500 hover:underline text-sm px-4 py-2 border-b-2 border-transparent hover:border-blue-500">#' + channel.name + '</button>');
            });
        }).catch((error)=>{
            console.log(error);
            if (error.response.status == 401) {
                window.location.href = '/login';
            }
        });
    });

    $('#disconnect').click(()=>{
        toggleLoggedIn();
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    $('#set_nick').click(()=>{
        var nick = $('#nick').val();
        var realname = $('#realname').val();
        var password = $('#password').val();
        $('#nick').val('');
        $('#realname').val('');
        $('#password').val('');
        axios.post('http://127.0.0.1:3000/nick/set', {
            nick: nick,
            realname: realname,
            password: password
            }).then((response)=>{
                $('#prefix_nick').text(response.data.nick);
            }).catch((error)=>{
                console.log(error);
        });
    });

    $('#join_channel').click(()=>{
        var channel = $('#channel').val();
        var key = $('#key').val();
        $('#channel').val('');
        $('#key').val('');  
        joinChannel(channel, key);
    });
});

socket.on("chat:message", function (data) {
    var cleanChannel = data.channel;
    data.channel[0] == "#"
        ? (cleanChannel = data.channel.substring(1))
        : (cleanChannel = data.channel);

    $("#channel_" + cleanChannel).removeClass("animate-shake");
    if (
        data.channel == "AUTH" ||
        cleanChannel == currentNick ||
        cleanChannel == selectedChannel
    )
        addMessage(data);
    else notifyChannel(cleanChannel);
});

socket.on("chat:direct", function (data) {
    console.log(data);
    addDirectMessage(data);
});

socket.on('channel:list', function (data) {
    console.log(data);
    channels = data;
    $('#channels').empty();
    $.each(data, function (index, channel) {
        $('#channels').append('<button type="button" onclick="openChannel("' + channel + '")" class="btn btn-secondary">' + channel + '</button>');
    });
});

socket.on('channel:parted', function (data) {
    $('#users').empty();
    $('#messages').empty();
    $.each(data.users, function (index, user) {
        $('#users').append('<li class="flex items-center space-x-4"><i class="fas fa-user"></i><span class="text-sm font-medium">' + user.nick + ' [' + user.modes + ']</span></li>');
    });
    $('#channel_name').text('ChanServe');
    selectedChannel = 'ChanServe';
    $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight")}, 10);
});

socket.on('channel:joined', function (data) {
    data.channel[0] == '#' ? selectedChannel = data.channel.substring(1) : selectedChannel = data.channel;
    $('#users').empty();
    $('#messages').empty();
    $.each(data.users, function (index, user) {
        $('#users').append('<li class="flex items-center space-x-4"><i class="fas fa-user"></i><span class="text-sm font-medium">' + user.nick + ' [' + user.modes + ']</span></li>');
    });
    // add to channels if not exists
    if(!channels.filter(channel => channel.name == data.channel).length > 0){
        channels.push(data.channel);
        $('#channels').append('<button type="button" onclick="openChannel(\'' + data.channel + '\')" class="btn btn-secondary">' + data.channel + '</button>');
    }

    for (let i = 0; i < data.messages.length; i++) {
        addMessage({
            user: data.messages[i].sender,
            message: data.messages[i].message
        });
    }
});

function addDirectMessage(user) {
    addMessage({
        user: user.from,
        message: user.message
    });

    // using the user.from as the key on the dmUsers array, add the message to the user
    var userIndex = dmUsers.findIndex(u => u && u.user == user.from);

    if (userIndex > -1) {
        dmUsers[userIndex].messages.push(user.message);
    } else {
        dmUsers.push({
            user: user.from,
            messages: [user.message]
        });
    }

    // add the user to the dm list
    $('#dms').empty();
    $.each(dmUsers, function (index, user) {
        $('#dms').append('<li class="flex items-center space-x-4" onclick="openDirectMessage(\'' + user.user + '\')"><i class="fas fa-user"></i><span class="text-sm font-medium">' + user.user + ' [' + user.messages.length + ']</span></li>');
    });
}

function addMessage(message) {
    $('#messages').append('<div class="flex items-start space-x-4 mt-4"><div><div class="flex items-center space-x-2"><div class="text-sm font-medium">'+ message.user +'</div><div class="text-xs text-gray-400">10:30 AM</div></div><div class="mt-1 text-sm">' + message.message + '</div></div></div>');
    $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight")}, 10);
}

function toggleLoggedIn() {
    $('.logged-in').removeClass('hidden');
    $('.logged-out').addClass('hidden');
}

function notifyChannel(channel) {
    var notifyChannel = channel;
    channel[0] == '#' ? notifyChannel = channel.substring(1) : notifyChannel = channel;
    $('#channel_'+notifyChannel).addClass('bg-red-700');
    if ($("#channel_" + notifyChannel).find("i").length <= 1) {
      $("#channel_" + notifyChannel).append('<i class="fas fa-exclamation"></i>');
      $("#channel_" + notifyChannel).addClass("animate-shake");

    } else {
      $("#channel_" + notifyChannel).addClass("animate-shake");
    }
}

function openChannel(channel, key, isDm) {
    selectedChannel = channel;
    cleanChannelCss(channel);
    joinChannel(channel, key, isDm);
};

function openDirectMessage(user) {
    selectedChannel = user;
    cleanChannelCss(user);
    // /join/dm/:nick
    axios.post('http://127.0.0.1:3000/join/dm/' + selectedChannel).then((response) => {
        $('#channel_name').text(user);
        $('#messages').empty();
        console.log(response);
        $('#messages').animate({ scrollTop: $('#chat_area').prop("scrollHeight")}, 10);
        for (let i = 0; i < response.data.messages.length; i++) {
            addMessage({
                user: response.data.messages[i].sender,
                message: response.data.messages[i].message
            });
        }
    }).catch((error) => {
        console.log(error);
    });
}

function cleanChannelCss(channel){
    var cleanChannel = channel;
    channel[0] == '#' ? cleanChannel = channel.substring(1) : cleanChannel = channel;
    $('#channel_'+cleanChannel).removeClass('bg-red-700');
    $('#channel_'+cleanChannel).find('i').remove();
    $('#channel_'+cleanChannel).removeClass('animate-shake');
};

function joinChannel(channel, key, isDm) {
    axios.post('http://127.0.0.1:3000/channel/join', {
        channel: channel,
        key: key
    }).then((response) => {
        $('#channel_name').text(channel);
        $('#messages').animate({ scrollTop: $('#chat_area').prop("scrollHeight")}, 10);
    }).catch((error) => {
        console.log(error);
    });
};