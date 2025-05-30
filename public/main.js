var token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
}
var authToken = localStorage.getItem('token');
let currentConnectedServerName = null;
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

function sendMessage() {
    var message = $('#message').val();

    if(channels.find(channel => channel.name == selectedChannel) == undefined){
        const receiver = selectedChannel;
        const messageText = $('#message').val();
        addMessage({
            user: currentNick,
            message: messageText
        });

        socket.emit('client:direct', {
            from: currentNick,
            to: receiver,
            message: messageText
        });
    } else {
        addMessage({
            user: currentNick,
            message: message
        });
        socket.emit('client:message', {
            from: currentNick,
            message: message,
            channel: selectedChannel
        });     
    }

    $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight")}, 10);
    $('#message').val('');
    return false;  
}

$(document).ready(function () {
    $("#message").keypress(function (e) {
        if (e.which == 13) sendMessage();
      });
    $('#message_send').click(function () {
        sendMessage();
    });

    if ($('.logged-out#connect').is(':visible')) { 
        populateServerSelect();
    }
    
    $('#connect-to-selected-server-btn').click(function() {
        const selectedServerName = $('#server-select').val();
        if (!selectedServerName) {
            alert('Please select a server.');
            return;
        }

        let serverConfig = null;
        if (typeof userServersCache !== 'undefined' && Array.isArray(userServersCache)) {
            serverConfig = userServersCache.find(s => s.name === selectedServerName);
        }

        if (!serverConfig) {
            alert('Server configuration not found. Please try reloading or manage servers.');
            // Attempt to refresh cache and try again, or prompt user to manage servers.
            // For now, simple alert. Could call populateServerSelect() and then re-check.
            populateServerSelect(); // Try to refresh the cache
            serverConfig = userServersCache.find(s => s.name === selectedServerName); // try finding again
            if(!serverConfig){
                 alert('Still cannot find server configuration. Please use "Manage Servers" to add or check your configurations.');
                 return;
            }
        }
        
        // The new connect endpoint is /api/irc/connect
        axios.post('/api/irc/connect', serverConfig)
            .then(function(response) {
                currentConnectedServerName = selectedServerName; // Store the connected server name
                toggleLoggedIn(); 
                currentNick = response.data.nick;
                $('#prefix_nick').text(currentNick);
                
                const channelsToJoin = response.data.channels || [];
                $('#channels').empty(); 
                channelsToJoin.forEach(function(channelName) {
                    // Ensure channelName is treated as a string and remove potential leading # for ID consistency
                    const cleanChannelName = String(channelName).replace(/^#/, '');
                    $('#channels').append('<button id="channel_'+ cleanChannelName +'" class="bg-purple-600 hover:bg-red-700 text-white font-small py-2 px-4 rounded-lg" onclick="openChannel(\'' + channelName + '\')">' + channelName + '</button>');
                });
                
                // if (channelsToJoin.length > 0) {
                //     openChannel(channelsToJoin[0]); 
                // } else {
                //     openChannel('ChanServ'); 
                // }
            })
            .catch(function(error) {
                console.error('Error connecting to IRC server:', error);
                alert('Failed to connect: ' + (error.response?.data?.message || error.message));
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
        const channel = $('#channel').val();
        const key = $('#channel-key').val();
        const isDm = $('#isDm').is(':checked')

        $('#channel').val('');
        $('#channel-key').val('');

        joinChannel(channel, key, isDm);
        toggleOpenChannel();
    });
});

socket.on("chat:message", function (data) {
    // data: { type, source, target, sender, message }
    var cleanChannel = data.source;
    cleanChannel[0] == "#" ? (cleanChannel = cleanChannel.substring(1)) : (cleanChannel = cleanChannel);

    $("#channel_" + cleanChannel).removeClass("animate-shake");
    if (
        data.source == "AUTH" ||
        cleanChannel == currentNick ||
        cleanChannel == selectedChannel
    )
        addMessage({ user: data.sender, message: data.message });
    else notifyChannel(cleanChannel);
});

socket.on("chat:direct", function (data) {
    // data: { type, source, target, sender, message }
    // Open or focus the DM context for the sender (source)
    openDirectMessage(data.source);
    addDirectMessage(data);
});

function addDirectMessage(data) {
    // data: { type, source, target, sender, message }
    addMessage({
        user: data.sender || data.source,
        message: data.message
    });

    // using the source as the key on the dmUsers array, add the message to the user
    var userIndex = dmUsers.findIndex(u => u && u.user == data.source);

    if (userIndex > -1) {
        dmUsers[userIndex].messages.push(data.message);
    } else {
        dmUsers.push({
            user: data.source,
            messages: [data.message]
        });
    }

    // add the user to the dm list
    $('#dms').empty();
    $.each(dmUsers, function (index, user) {
        $('#dms').append('<li class="flex items-center space-x-4" onclick="openDirectMessage(\'' + user.user + '\')"><i class="fas fa-user"></i><span class="text-sm font-medium">' + user.user + ' [' + user.messages.length + ']</span></li>');
    });
}

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
    // Sort the users by their modes
    data.users.sort((a, b) => (a.modes > b.modes ? 1 : -1));
    $.each(data.users, function (index, user) {
        $('#users').append('<li class="flex items-center space-x-4"onclick="openDirectMessage(\'' 
            + user.user + '\')"><i class="fas fa-user"></i><span class="text-sm font-medium">' 
            + user.nick + ' [' + user.modes + ']</span></li>');
    });
    $('#channel_name').text('ChanServe');
    selectedChannel = 'ChanServe';
    $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight")}, 10);
});

socket.on('channel:joined', function (data) {
    if(!data.users || data.users.length <= 1){
        openDirectMessage(data.channel);
        return;
    }
    data.channel[0] == '#' ? selectedChannel = data.channel.substring(1) : selectedChannel = data.channel;
    $('#users').empty();
    $('#messages').empty();
    data.users.sort((a, b) => (a.modes > b.modes ? 1 : -1));
    $.each(data.users, function (index, user) {
        $('#users').append('<li class="flex items-center space-x-4"onclick="openDirectMessage(\'' 
            + user.nick + '\')"><i class="fas fa-user"></i><span class="text-sm font-medium">' 
            + user.nick + ' [' + user.modes + ']</span></li>');
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

function addMessage(message) {
    $('#messages').append('<div class="flex items-start space-x-4 mt-4"><div><div class="flex items-center space-x-2"><div class="text-sm font-medium">'+ message.user +'</div><div class="text-xs text-gray-400">10:30 AM</div></div><div class="mt-1 text-sm">' + message.message + '</div></div></div>');
    $('#messages').animate({ scrollTop: $('#messages').prop("scrollHeight")}, 10);
}

function toggleLoggedIn() {
    $('.logged-in').removeClass('hidden');
    $('.logged-out').addClass('hidden');
}

function toggleOpenChannel() {
    if ($('.channel-open').hasClass('hidden')) {
        $('.channel-open').removeClass('hidden');
        $('.channel-closed').addClass('hidden');
    } else {
        $('.channel-open').addClass('hidden');
        $('.channel-closed').removeClass('hidden');
    }
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
    if (!currentConnectedServerName) {
        alert('Please connect to a server before joining a channel.');
        return;
    }

    if(isDm){
        openDirectMessage(channel);
        return;
    }

    axios.post('http://127.0.0.1:3000/channel/join', {
        serverName: currentConnectedServerName, // New field
        channel: channel,
        key: key
    }).then((response) => {
        $('#channel_name').text(channel);
        $('#messages').animate({ scrollTop: $('#chat_area').prop("scrollHeight")}, 10);
    }).catch((error) => {
        console.log(error);
    });
};

// --- BEGIN SERVER MANAGEMENT UI LOGIC ---
let currentEditServerName = null;
// Ensure userServersCache is initialized here if not already; it is used by populateServerSelect and connect button
let userServersCache = []; 

// Function to populate server selection dropdown
function populateServerSelect() {
    axios.get('/api/user/servers') 
        .then(function(response) {
            const servers = response.data;
            const selectElement = $('#server-select');
            selectElement.empty(); 

            if (servers && servers.length > 0) {
                $('#no-servers-message').addClass('hidden');
                $('#connect-to-selected-server-btn').prop('disabled', false);
                servers.forEach(function(server) {
                    selectElement.append($('<option>', {
                        value: server.name, 
                        text: server.name 
                    }));
                });
                userServersCache = servers; // Update cache
            } else {
                $('#no-servers-message').removeClass('hidden');
                $('#connect-to-selected-server-btn').prop('disabled', true);
                userServersCache = []; // Clear cache
            }
        })
        .catch(function(error) {
            console.error('Error loading servers for select:', error);
            $('#no-servers-message').text('Error loading servers.').removeClass('hidden');
            userServersCache = []; // Clear cache on error
        });
}

function loadUserServers() {
    axios.get('/api/user/servers')
        .then(function(response) {
            userServersCache = response.data; // Cache the server data
            const serverList = $('#server-list');
            serverList.empty();
            if (userServersCache.length === 0) {
                serverList.append('<li class="text-gray-400">No servers configured yet.</li>');
                return;
            }
            userServersCache.forEach(function(server) {
                const channelsText = server.channels && server.channels.length > 0 ? server.channels.join(', ') : 'None';
                const listItem = `
                    <li class="bg-gray-700 p-3 rounded-md shadow">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="text-lg font-semibold text-white">${server.name}</h3>
                                <p class="text-sm text-gray-300">${server.host}:${server.port} (Nick: ${server.nick})</p>
                                <p class="text-xs text-gray-400">Channels: ${channelsText}</p>
                            </div>
                            <div>
                                <button class="edit-server-btn bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm mr-2" data-servername="${server.name}">Edit</button>
                                <button class="delete-server-btn bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm" data-servername="${server.name}">Delete</button>
                            </div>
                        </div>
                    </li>
                `;
                serverList.append(listItem);
            });

            // Attach event listeners
            $('.edit-server-btn').click(handleEditServer);
            $('.delete-server-btn').click(handleDeleteServer);
        })
        .catch(function(error) {
            console.error('Error loading servers:', error);
            $('#server-list').empty().append('<li class="text-red-400">Error loading servers.</li>');
            alert('Error loading servers: ' + (error.response?.data?.message || error.message));
        });
}

$('#add-server-btn').click(function() {
    currentEditServerName = null;
    $('#server-form')[0].reset(); // Reset form fields
    $('#server-original-name').val(''); // Clear hidden field
    $('#server-form h3').text('Add New Server'); // Optional: change form title
    $('#server-form').removeClass('hidden');
    $('#server-list-container').addClass('hidden'); // Hide server list
    $('#add-server-btn').addClass('hidden'); // Hide add button
});

function handleEditServer() {
    currentEditServerName = $(this).data('servername');
    const serverData = userServersCache.find(s => s.name === currentEditServerName);

    if (serverData) {
        $('#server-original-name').val(serverData.name);
        $('#server-name').val(serverData.name);
        $('#server-host').val(serverData.host);
        $('#server-port').val(serverData.port);
        $('#server-nick').val(serverData.nick);
        $('#server-password').val(serverData.password || '');
        $('#server-realname').val(serverData.realname || '');
        $('#server-channels').val(serverData.channels ? serverData.channels.join(',') : '');
        
        $('#server-form h3').text('Edit Server'); // Optional: change form title
        $('#server-form').removeClass('hidden');
        $('#server-list-container').addClass('hidden'); // Hide server list
        $('#add-server-btn').addClass('hidden'); // Hide add button
    } else {
        alert('Could not find server data to edit.');
    }
}

function handleDeleteServer() {
    const serverNameToDelete = $(this).data('servername');
    if (confirm(`Are you sure you want to delete server "${serverNameToDelete}"?`)) {
        axios.delete(`/api/user/servers/${serverNameToDelete}`)
            .then(function(response) {
                alert('Server deleted successfully.');
                loadUserServers(); // Refresh list
            })
            .catch(function(error) {
                console.error('Error deleting server:', error);
                alert('Error deleting server: ' + (error.response?.data?.message || error.message));
            });
    }
}

$('#server-form').submit(function(event) {
    event.preventDefault();
    const serverName = $('#server-name').val();
    const serverHost = $('#server-host').val();
    const serverPort = parseInt($('#server-port').val(), 10);
    const serverNick = $('#server-nick').val();
    const serverPassword = $('#server-password').val();
    const serverRealname = $('#server-realname').val();
    const channelsRaw = $('#server-channels').val();
    const channels = channelsRaw ? channelsRaw.split(',').map(ch => ch.trim()).filter(ch => ch) : [];

    const serverData = {
        name: serverName,
        host: serverHost,
        port: serverPort,
        nick: serverNick,
        password: serverPassword,
        realname: serverRealname,
        channels: channels
    };

    let request;
    if (currentEditServerName) {
        // Use original name for URL, new data (which might include new name) in body
        const originalName = $('#server-original-name').val() || currentEditServerName; 
        request = axios.put(`/api/user/servers/${originalName}`, serverData);
    } else {
        request = axios.post('/api/user/servers', serverData);
    }

    request.then(function(response) {
        alert(`Server ${currentEditServerName ? 'updated' : 'added'} successfully.`);
        $('#server-form').addClass('hidden');
        $('#server-form')[0].reset();
        currentEditServerName = null;
        $('#server-list-container').removeClass('hidden'); // Show server list
        $('#add-server-btn').removeClass('hidden'); // Show add button
        loadUserServers(); // Refresh list
    })
    .catch(function(error) {
        console.error('Error saving server:', error);
        alert('Error saving server: ' + (error.response?.data?.message || error.message));
    });
});

// Toggle Server Management Modal
$('#manage-servers-btn').click(function() {
    const modal = $('#server-management-modal');
    // Check if the modal is currently hidden (jQuery's :visible selector checks computed display style)
    if (!modal.is(':visible')) {
        modal.removeClass('hidden').css('display', 'flex'); // Explicitly set display to flex
        loadUserServers();
    } else {
        // When hiding, add 'hidden' back (which sets display:none) and remove any inline css display property
        modal.addClass('hidden').css('display', ''); 
        $('#server-form').addClass('hidden'); // Also hide form if open
    }
});

// Close modal button
$('#close-server-modal-btn').click(function() {
    $('#server-management-modal').addClass('hidden').css('display', ''); // Add hidden back and clear explicit display style
    $('#server-form').addClass('hidden');
});

$('#cancel-server-form').click(function() {
    $('#server-form').addClass('hidden');
    $('#server-form')[0].reset();
    currentEditServerName = null;
    $('#server-list-container').removeClass('hidden'); // Show server list
    $('#add-server-btn').removeClass('hidden'); // Show add button
});

// --- END SERVER MANAGEMENT UI LOGIC ---