// initiate the modules we downloaded
const session = require('express-session'); // module for session parser
const express = require('express'); // module for express router
const http = require('http'); // module for http server
const uuid = require('uuid'); // module for uuid (we will use this to create unique user ids)
const WebSocket = require('ws'); // module for websocket

// Session stores user information, so that.
const sessionParser = session({
    saveUninitialized: false,
    secret: 'superSecretString',
    resave: false
});

// creates the backend for the app and tells it to use certian modules
const app = express(); // init express router and assign it to variable app
app.use(express.static('public')); // tell app to use index.html in the public folder (we will go over this in the frontend section)
app.use(sessionParser); // tells app to use the session parser

// Creates a list of users. A Map is a data type that stores data as key, pair values. If you are interested in learning more about this data type use the link below.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
const userList = new Map();

// creates the server and sets it to use the express router we set up earlier 
const server = http.createServer(app);

// starts the websocket listener. it will recieve connections on the http server address
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });

// This code handles update requests from the client to server.
// It assigns a user to a unique id and begins the websocket connection
server.on('upgrade', function (request, socket, head) {
    console.log('Parsing session from request...');

    // if the request is from a new user (ie new person connects to the website)
    // assign a user to a unique id and add the user to the userlist
    sessionParser(request, {}, () => {
        if (!request.session.userId) {
            // assigns a unique user id for a new user
            const id = uuid.v4();
            
            // log user connected to server and assign the userid to the session created
            console.log(`Updating session for user ${id}`);
            request.session.userId = id;
        }
        
        // log that the parsing is done and the user is valid
        console.log('Session is parsed!');

        // send a message back to the client that tells the client it is now ok to talk to the server
        wss.handleUpgrade(request, socket, head, function (ws) {
            wss.emit('connection', ws, request);
        });
    });
});

// This code handles the websocket connection between the user and server
wss.on('connection', function (ws, request) {
    // get the user ID from the current user session and assign it to a variable
    const userId = request.session.userId;

    // assign the websocket associated with the user to the userid. This is important to tracking and sending messages to the correct user. 
    userList.set(userId, ws);

    // code to run when the websocket receives a message from the user
    ws.on('message', function (message) {
        // log message to console. Not necessary but useful for debugging
        console.log(`Received message ${message} from user ${userId}`);

        // send the message to all users connected to the app.
        // if you would like more information how the forEach function works use this link.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
        userList.forEach(function (client) {
            // send message to the client
            client.send(message);
        });
    });

    // on socket close. delete user from map.
    ws.on('close', function () {
        userList.delete(userId);
    });
});


// Start the server.
server.listen(8080, function () {
    console.log('Listening on http://localhost:8080');
});