var selectedChannel = "tadas_test";
var socket = io('http://localhost:3000');
socket.on('chat:message', function (data) {
    console.log(data);
    // selectedChannel = data.channel;
    $('#messages').append('<li>' + data.channel + ' : ' + data.user + ' : ' + data.message + ' </li>');
    $('#chat_area').animate({ scrollTop: $('#chat_area').prop("scrollHeight")}, 1000);
});

var channels = [];

socket.on('channel:list', function (data) {
    console.log(data);
    channels = data;
    $('#channels').empty();
    $.each(data, function (index, channel) {
        $('#channels').append('<button type="button" onclick="openChannel("' + channel + '")" class="btn btn-secondary">' + channel + '</button>');
    });
});
socket.on('channel:joined', function (data) {
    console.log(data);
    selectedChannel = data.channel;
    $('#users').empty();
    $.each(data.users, function (index, user) {
        $('#users').append('<li class="list-group-item user_li">' + user.nick + ' [' + user.modes + ']</li>');
    });
    // add to channels if not exists
    if(!channels.filter(channel => channel.name == data.channel).length > 0){
        channels.push(data.channel);
        $('#channels').append('<button type="button" onclick="openChannel(\'' + data.channel + '\')" class="btn btn-secondary">' + data.channel + '</button>');
    }
    // $('#channels').push('<button type="button" onclick="openChannel("' + data.channel + '")" class="btn btn-secondary">' + data.channel + '</button>');
});

function openChannel(channel) {
    selectedChannel = channel;
    // join channel
    joinChannel(channel);
};

function joinChannel(channel, key) {
    // Make http request to http://localhost:3000/channel/join
    axios.post('http://localhost:3000/channel/join', {
        channel: channel,
        key: key
    }).then((response) => {
        // Clear chat
        $('#messages').empty();
        $('#channel_name').text(channel);
        // populate from global channels.message var where channel.name == channel
        channels.forEach((channel) => {
            if (channel.name == selectedChannel) {
                channel.messages.forEach((message) => {
                    $('#messages').append('<li>' + selectedChannel + ' : ' + message.sender + ' : ' + message.message + ' </li>');
                });
            }
        });
        $('#chat_area').animate({ scrollTop: $('#chat_area').prop("scrollHeight")}, 1000);
    }).catch((error) => {
        console.log(error);
    });
};

$(document).ready(function () {
    $("#message").keypress(function (e) {
        if (e.which == 13) {
            var message = $('#message').val();
            $('#message').val('');
            $('#messages').append('<li>' + selectedChannel + ' : You : ' + message + ' </li>');
            // Socket sent
            socket.emit('client:message', {
                message: message,
                channel: selectedChannel
            });     
            $('#chat_area').animate({ scrollTop: $('#chat_area').prop("scrollHeight")}, 1000);

          return false;    //<---- Add this line
        }
      });
    $('#message_send').click(function () {
        var message = $('#message').val();
        $('#message').val('');
        $('#messages').append('<li>' + selectedChannel + ' : You : ' + message + ' </li>');
        // Socket sent
        socket.emit('client:message', {
            message: message,
            channel: selectedChannel
        });     
        $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight")}, 1000);
    });

    $('#connect').click(()=>{
        $('#channel_name').text('ChaneServe');
        // Make http request to http://localhost:3000/connect
        axios.post('http://localhost:3000/connect').then((response)=>{
            channels = response.data.state;
            console.log(response);

            $('#prefix_nick').text(response.data.nick);
            $('#channels').empty();
            $.each(channels, function (index, channel) {
                $('#channels').append('<button type="button" onclick="openChannel(\'' + channel.name + '\')" class="btn btn-secondary">' + channel.name + '</button>');
            });
        }).catch((error)=>{
            console.log(error);
        });
    });

    $('#set_nick').click(()=>{
        var nick = $('#nick').val();
        var realname = $('#realname').val();
        var password = $('#password').val();
        $('#nick').val('');
        $('#realname').val('');
        $('#password').val('');
        axios.post('http://localhost:3000/nick/set', {
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