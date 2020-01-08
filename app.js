// jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const shuffle = require(__dirname + "/shuffle.js");
const findPlayer = require(__dirname + "/player.js");
const lessMiddleware = require('less-middleware');


// Create a new Express application
const app = express();
app.set('view engine', 'ejs');
app.use(lessMiddleware((__dirname + '/less'), {
  dest: __dirname + '/public',
  // only for development
  force: true
}));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Create an http server with Node's HTTP module.
// Pass it the Express application
const server = require('http').createServer(app);
// Instantiate Socket.IO hand have it listen on the Express/HTTP server
// BEFORE const io = require('socket.io')(server);
let io = require('socket.io').listen(server);


// CONSTANTS and VARIABLES
let shuffledLetters = [];
let players = [];
let currentTurn = -1;
const letterStackPerPlayer = 7;
const maxPlayers = 3;
let gameOn = false;

server.listen(process.env.PORT || 3000, function () {
  console.log("Server running.");
});

io.on('connection', function(socket) {

  if (gameOn) {
    // notify client (only the one)
    socket.emit('game on or off', true);
    socket.emit('game full', 'A játék épp folyamatban van. Próbálkozz később!');
  }

  socket.on('disconnect', function() {
    if (!gameOn) {
      // check if player is in players array
      const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);
      if (filteredPlayerIndex >= 0) { //do this only if player is in players array
        const loggedOutUser = {
          index: filteredPlayerIndex,
          name: players[filteredPlayerIndex].name
        };
        io.in('family-scrabble').emit('player logout', loggedOutUser);
        players.splice(filteredPlayerIndex, 1);
        io.in('family-scrabble').emit('update players', players);
      }

    } else if (gameOn && currentTurn >= 0) { //if gameOn
      // check if player is in players array
      const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);
      if (filteredPlayerIndex >= 0) {
        let newEndGameAction = new EndGameAction("logout", players[filteredPlayerIndex].name);

        // reset variables
        shuffledLetters = [];
        players = [];
        currentTurn = 0;
        gameOn = false;
        io.emit('game on or off', false); //push end of game state to all connections
        io.in('family-scrabble').emit('game ended', newEndGameAction);
      }

    }
  });

  socket.on('player login', function(playerName) {
    if (players.length <= (maxPlayers - 1)) { //if game not yet full
      let newPlayer = new Player(playerName, players.length + 1, socket.id);
      players.push(newPlayer);
      // join game room
      socket.join("family-scrabble");
      //  notify everyone (except user logging in) of new player in game room
      socket.to('family-scrabble').emit('player login', playerName);
      // update everyone's player list
      io.in('family-scrabble').emit('update players', players);
      if (players.length === maxPlayers && io.sockets.adapter.rooms['family-scrabble'].length === maxPlayers) {
        io.in('family-scrabble').emit('start game', "Játék indítása.");
        gameOn = true;
        io.emit('game on or off', true);
        players = [];

        shuffledLetters = shuffle.shuffleAtStart();

      }
    } else { //if game full
      // notify client (only the one)
      socket.emit('game full', 'A játék betelt. Próbálkozz később!');
    }
  });

  socket.on('deal', function(playerName) {
    let dealing = shuffle.dealAtStartForPlayer(shuffledLetters, letterStackPerPlayer);
    let newPlayer = new Player(playerName, players.length + 1, socket.id, dealing.letterStackToBeDealt);
    shuffledLetters = dealing.shuffledLettersAfterDealing;
    players.push(newPlayer);
    // join game room
    socket.join("family-scrabble");

    //find player based on socket id
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);

    // do this when the last player gets dealt
    if (filteredPlayerIndex === (maxPlayers - 1)) {
      players.forEach(function(player) {
        io.in('family-scrabble').emit("show other players", player.name);
      });

      //first player should start the game when last player is in
      currentTurn = 0;
      io.to(players[0].socketID).emit('start turn');

      io.emit('update remaining letters', shuffledLetters.length);
      io.emit('show whose turn', 1);

    }

    socket.emit('update letterstack', players[filteredPlayerIndex].letterStack);


  });

  socket.on('place tile', function(placedTile) {

    if (placedTile.action === "add") {
      socket.to('family-scrabble').emit('get added tile', placedTile);
    } else if (placedTile.action === "move") {
      socket.to('family-scrabble').emit('get moved tile', placedTile);
    } else if (placedTile.action === "remove") {
      socket.to('family-scrabble').emit('get removed tile', placedTile);
    }
  });

  socket.on('swapping letters', function(swappedLetters) {

    swappedLetters.forEach(function(letter, index) {
      posOfAddedLetter = Math.floor(Math.random() * shuffledLetters.length);
      shuffledLetters.splice(posOfAddedLetter, 0, swappedLetters[index]);
    });
    //empty array
    swappedLetters = [];

  });

  socket.on('finish turn', function(remainingLetters) {
    let dealtLetters = [];
    for (var i = 0; i < letterStackPerPlayer - remainingLetters; i++) {
      if (shuffledLetters.length > 0) {
        dealtLetters.push(shuffledLetters.shift());
      } else {
        break;
      }
    }
    socket.emit('update letterstack', dealtLetters);
    io.emit('fix placed tiles');
    io.emit('update remaining letters', shuffledLetters.length);

    currentTurn++;
    let nextPlayerID = currentTurn % players.length;
    const socketIdOfNextPlayer = players[nextPlayerID].socketID;
    // sending to individual socketid (private message)
    io.to(socketIdOfNextPlayer).emit('start turn', 'Your turn');
    io.emit('show whose turn', (nextPlayerID + 1));

  });

  socket.on('finish game', function(playerName) {
    // reset variables
    shuffledLetters = [];
    players = [];
    currentTurn = 0;
    gameOn = false;
    io.emit('game on or off', false);

    let newEndGameAction = new EndGameAction("endgame", playerName);

    // to everyone but the initiator
    socket.broadcast.emit('game ended', newEndGameAction);

    let newEndGameActionCurrentPlayer = new EndGameAction("endgame", "self");
    // to initiator
    socket.emit('game ended', newEndGameActionCurrentPlayer);

  });

});




function Player(name, order, socketID, letterStack, placement) {
  this.name = name;
  this.order = order;
  this.socketID = socketID;
  this.letterStack = letterStack;
  this.placement = placement;
}

function EndGameAction(action, initiatorName) {
  this.action = action;
  this.initiatorName = initiatorName;
}

app.get("/", function(req, res) {
  res.render("login", {
    players: players
  });
});


app.post("/board", function(req, res) {

  res.render("board", {
    firstName: req.body.firstName
  });

});
