// jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const shuffle = require(__dirname + "/shuffle.js");
const findPlayer = require(__dirname + "/player.js");
const lessMiddleware = require('less-middleware');

let session = require("express-session")({
  secret: "my-secret",
  resave: true,
  saveUninitialized: true
});
let sharedSession = require("express-socket.io-session");

// Create a new Express application
const app = express();
app.set('view engine', 'ejs');
app.use(lessMiddleware((__dirname + '/less'), {
  dest: __dirname + '/public',
  // only for development
  force: true,
  // debug: true
}));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
// Use express-session middleware for express
app.use(session);

// Create an http server with Node's HTTP module.
// Pass it the Express application
const server = require('http').createServer(app);
// Instantiate Socket.IO hand have it listen on the Express/HTTP server
// BEFORE const io = require('socket.io')(server);
let io = require('socket.io').listen(server);

// Use shared session middleware for socket.io
// setting autoSave:true
io.use(sharedSession(session, {
  autoSave: true
}));

// CONSTANTS and VARIABLES
let shuffledLetters = [];
let players = [];
let currentTurn = 0;
const letterStackPerPlayer = 7;
const maxPlayers = 1;
let gameOn = false;

// Listen on port 3000.
server.listen(3000, function(req, res) {
  console.log("Server running on port 3000.");
});

io.on('connection', function(socket) {
  socket.emit('sessiondata', socket.handshake.session);
  console.log("SOCKETS at connection start:");
  console.log(io.sockets.adapter.rooms['family-scrabble']);
  console.log('BREAKING: a user connected');
  console.log("PLAYERS at connect: " + players.length);

  socket.on('disconnect', function() {
    // TODO: condition for when window is closed before having logged in (currently exception comes)
    if (!gameOn) {
      console.log("DISCONNECTING");
      console.log("Players at disconnect");
      console.log(players);
      console.log("Session at disconnect");
      console.log(socket.handshake.session);
      console.log("Socket ID at disconnect");
      console.log(socket.id);
      console.log(socket.handshake.session);
      const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);
      if (filteredPlayerIndex) {
        // console.log("DISCONNECTING: " + players[filteredPlayerIndex].name);
        const loggedOutUser = {
          index: filteredPlayerIndex,
          name: players[filteredPlayerIndex].name
        };
        console.log("SESSION at disconnent");
        console.log(socket.handshake.session);
        console.log("OBJECT loggedOutUser: ");
        console.log(loggedOutUser);
        io.in('family-scrabble').emit('player logout', loggedOutUser);
        players.splice(filteredPlayerIndex, 1);
        io.in('family-scrabble').emit('update players', players);
        console.log("PLAYERS AFTER REMOVING after DISCONNECT");
        console.log(players);
        console.log('BREAKING: user disconnected');
        console.log("PLAYERS at disconnect: " + players.length);
      } else {
        console.log("Someone not yet added to the players array disconnected - probably a reload or closing the tab before logging in.");
      }

    }
  });

  socket.on('player login', function(playerName) {
    console.log('message: ' + playerName);
    if (players.length <= (maxPlayers - 1)) {
      console.log("MAX players: " + maxPlayers);
      console.log("PLAYERS at start: " + players.length);
      let newPlayer = new Player(playerName, players.length + 1, socket.id);
      players.push(newPlayer);
      // join game room
      socket.join("family-scrabble");
      //  notify everyone (except user logging in) of new player in game room
      socket.to('family-scrabble').emit('player login', playerName);
      // update everyone's player list
      io.in('family-scrabble').emit('update players', players);
      console.log("PLAYERS after adding player: " + players.length);
      console.log("ROOM MEMBERS after adding player: " + io.sockets.adapter.rooms['family-scrabble'].length);
      if (players.length === maxPlayers && io.sockets.adapter.rooms['family-scrabble'].length === maxPlayers) {
        io.in('family-scrabble').emit('start game', "Játék indítása.");
        console.log("START GAME");
        console.log(players);
        gameOn = true;
        players = [];

        shuffledLetters = shuffle.shuffleAtStart();

      }
    } else {
      console.log("PLAYERS full: " + players.length);
      // notify client (only the one)
      socket.emit('game full', 'A játék betelt.');
    }

    console.log("SOCKETS at connection end:");
    console.log(io.sockets.adapter.rooms['family-scrabble']);

    console.log(players);
    var room = io.sockets.adapter.rooms['family-scrabble'];
    console.log("ROOM members: " + room.length);
  });

  socket.on('deal', function(playerName) {
    console.log("DEAL");
    let dealing = shuffle.dealAtStartForPlayer(shuffledLetters, letterStackPerPlayer);
    let newPlayer = new Player(playerName, players.length + 1, socket.id, dealing.letterStackToBeDealt);
    shuffledLetters = dealing.shuffledLettersAfterDealing;
    console.log("SHUFFLED letters after dealing");
    console.log("SHUFFLED letters after dealing amount: " + shuffledLetters.length);
    console.log(shuffledLetters);
    players.push(newPlayer);
    // join game room
    socket.join("family-scrabble");

    console.log("Players after dealing letters");
    console.log(players);
    console.log("ROOM MEMBERS after dealing: " + io.sockets.adapter.rooms['family-scrabble'].length);

    //find player based on socket id
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);



    console.log("Filtered player index for updating letters: " + filteredPlayerIndex);
    console.log(players[filteredPlayerIndex]);
    console.log(players[filteredPlayerIndex].letterStack);

    // do this when the last player gets dealt
    if (filteredPlayerIndex === (maxPlayers-1)) {
      console.log("PLAYER INDEX in iF: " + filteredPlayerIndex);
      players.forEach(function(player){
              console.log(player.name + " , " + player.letterStack);
        io.emit("show other players", player.name);
        console.log("Show remaining letters 1: " + shuffledLetters.length);
      });

        //first player should start the game when last player is in
        console.log(players[0].name + " will start the game");
        currentTurn = 1;
        io.to(players[0].socketID).emit('start turn', 'FIRST round: your turn');
        console.log(players[0].socketID + " started the game");

        io.emit('update remaining letters', shuffledLetters.length);
        io.emit('show whose turn', 1);

    }

    socket.emit('update letterstack', players[filteredPlayerIndex].letterStack);


  });

  socket.on('place tile', function(placedTile) {
    console.log(placedTile);

    if (placedTile.action === "add") {
      socket.to('family-scrabble').emit('get added tile', placedTile);
    } else if (placedTile.action === "move") {
      socket.to('family-scrabble').emit('get moved tile', placedTile);
    } else if (placedTile.action === "remove") {
      socket.to('family-scrabble').emit('get removed tile', placedTile);
    }
  });

    socket.on('swapping letters', function(swappedLetters) {
      console.log("SWAPPING LETTERS");
      console.log(swappedLetters);
console.log("BEFORE SWAPPING: ");
console.log("Swapped letters: " + swappedLetters.length);
console.log("Shuffled letters: " + shuffledLetters.length);

swappedLetters.forEach(function(letter, index){
console.log("Swapped letters in loop: " + swappedLetters.length);
console.log("Current letter: " + swappedLetters[0].letter);
posOfAddedLetter = Math.floor(Math.random() * shuffledLetters.length);
shuffledLetters.splice(posOfAddedLetter, 0, swappedLetters[index]);
console.log("Remaining swapped in loop: ");
console.log(swappedLetters);
});
//empty array
swappedLetters = [];
console.log("AFTER SWAPPING: ");
console.log("Swapped letters: " + swappedLetters.length);
console.log("Shuffled letters: " + shuffledLetters.length);
console.log(swappedLetters);
    });

  socket.on('finish turn', function(remainingLetters) {
    let dealtLetters = [];
    console.log("FINISHING TURN");
    for (var i = 0; i < letterStackPerPlayer-remainingLetters; i++) {
      if (shuffledLetters.length > 0) {
        console.log(shuffledLetters.length + " letters remaining.");
        dealtLetters.push(shuffledLetters.shift());
      } else {
        console.log("0 letters left.");
        break;
      }
    }
    console.log("Letters to be dealt:");
    console.log(dealtLetters);
    console.log("Remaining letters after redealing: " + shuffledLetters.length);
    socket.emit('update letterstack', dealtLetters);
    console.log("Show remaining letters 2: " + shuffledLetters.length);
    io.emit('update remaining letters', shuffledLetters.length);

    currentTurn++;
    console.log("Shuffled letters remaining: " + shuffledLetters.length);
    console.log(shuffledLetters);
    console.log(socket.id + " passed his/her turn.");
    console.log("Current turn: " + currentTurn);
    console.log("How many players? " + players.length);

    console.log("Next up: player " + (currentTurn + 1) % players.length );
    let nextPlayerID = (currentTurn + 1) % players.length;
    const socketIdOfNextPlayer = players[nextPlayerID].socketID;
    console.log("Next player: " + socketIdOfNextPlayer);
    // sending to individual socketid (private message)
    io.to(socketIdOfNextPlayer).emit('start turn', 'Your turn');
    io.emit('show whose turn', (nextPlayerID+1));

  });

});




function Player(name, order, socketID, letterStack, placement) {
  this.name = name;
  this.order = order;
  this.socketID = socketID;
  this.letterStack = letterStack;
  this.placement = placement;
}

// console.log(players);

app.get("/", function(req, res) {
  res.render("login", {
    players: players
  });
});


app.post("/board", function(req, res) {
  console.log("GET BOARD AND DEAL");
  console.log(req.body.firstName);

  res.render("board", {
    firstName: req.body.firstName
  });

});

app.get("/board", function(req, res) {
  res.render("board", {
    firstName: "Test"
  });

});
