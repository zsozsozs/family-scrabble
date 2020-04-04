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
const maxPlayers = 4;
let gameOn = false;
let boardState = {};

server.listen(process.env.PORT || 3000, function() {
  console.log("Server running.");
});

io.on('connection', function(socket) {
  console.log('---User connected');

  socket.on('check if active player', function(oldSocketID, callback) {
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(oldSocketID, players); //lookup based on old socketID
    if (filteredPlayerIndex >= 0) {
      //update socketID of previously logged out player
      players[filteredPlayerIndex].socketID = socket.id;
      socket.join("family-scrabble");
      let data = {
        newSocketID: socket.id,
        name: players[filteredPlayerIndex].name,
        yourTurn: socket.id === players[currentTurn % players.length].socketID ? true : false,
        board: boardState
      };
      // update letterstack
      socket.emit('update letterstack', players[filteredPlayerIndex].letterStack);
      // update remaining letters
      socket.emit('update remaining letters', shuffledLetters.length);
      // update other players table
      players.forEach(function(player, index) {
        socket.emit("show other players", player.name);
      });
      io.emit('show whose turn', (currentTurn % players.length) + 1);
      for (var i = 0; i < (Math.floor(currentTurn / players.length) + 1); i++) {
        socket.emit('update results table with new row', players.length);
        players.forEach(function(player) {
          socket.emit('update points', {
            player: parseInt(player.order),
            points: player.points[i]
          });
        });
      }
      // update board
      const keys = Object.keys(boardState);
      keys.forEach(function(key, index) {
        let placedTile = {
          letter: boardState[key].letter,
          value: boardState[key].value,
          fixed: boardState[key].fixed,
          destID: key
        };
        socket.emit('get added tile', placedTile);
      });
      callback(data);
    } else {
      callback(false);
    }
  });

  if (gameOn) {
    // notify client (only the one)
    socket.emit('game on or off', true);
    socket.emit('game full', 'A játék épp folyamatban van. Próbálkozz később!');
  }

  socket.on('disconnect', function(reason) {
    console.log('---User disconnected because ' + reason);
    // check if player is in players array
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);
    console.log('filteredPlayerIndex', filteredPlayerIndex);
    if (!gameOn) {
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
        console.log('User disconnected because ' + reason + ' while game on');

        const checkConnectionStatusWithDelay = setTimeout(function() { //user has 30sec to log back in
          if (gameOn && filteredPlayerIndex >= 0) { //do this only if player is in players array //check also if game is on(because of delay it might be over already)
            // check if game room contains socket it - if reconnection was susccessful, players[] will have been updated with the new socketID => user can be found
            if (io.sockets.adapter.rooms['family-scrabble'] && io.sockets.adapter.rooms['family-scrabble'].sockets[players[filteredPlayerIndex].socketID]) {
              console.log('Player ' + filteredPlayerIndex + ' is back in after temporary disconnect');
              clearTimeout(checkConnectionStatusWithDelay);
            } else {
              console.log('players', players);
              console.log('Player ' + filteredPlayerIndex + ' has not beeen reachable for 30sec. Game is ending.');
                clearTimeout(checkConnectionStatusWithDelay);
                let newEndGameAction = new EndGameAction("logout", players[filteredPlayerIndex].name);

                // reset variables
                shuffledLetters = [];
                players = [];
                currentTurn = 0;
                gameOn = false;
                boardState = {};
                io.emit('game on or off', false); //push end of game state to all connections
                io.in('family-scrabble').emit('game ended', newEndGameAction);
            }
          } else { //of not 'gameOn && filteredPlayerIndex >= 0'
            console.log('setTimeout: game is not on anymore or player not found');
            clearTimeout(checkConnectionStatusWithDelay);
          }
        }, 30000);

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
        players = []; //will reconstruct players array on dealing

        shuffledLetters = shuffle.shuffleAtStart();

      }
    } else { //if game full
      // notify client (only the one)
      socket.emit('game full', 'A játék betelt. Próbálkozz később!');
    }
  });

  socket.on('deal', function(playerName) {
    let dealing = shuffle.dealAtStartForPlayer(shuffledLetters, letterStackPerPlayer);
    let newPlayer = new Player(playerName, players.length, socket.id, dealing.letterStackToBeDealt);
    shuffledLetters = dealing.shuffledLettersAfterDealing;
    players.push(newPlayer);
    // join game room
    socket.join("family-scrabble");

    //find player based on socket id
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);

    // do this when the last player gets dealt
    if (filteredPlayerIndex === (maxPlayers - 1)) {
      players.forEach(function(player, index) {
        io.to(player.socketID).emit('save storage', player.socketID);
        io.in('family-scrabble').emit("show other players", player.name);
      });

      //first player should start the game when last player is in
      currentTurn = 0;
      io.to(players[0].socketID).emit('start turn');

      io.emit('update remaining letters', shuffledLetters.length);
      io.emit('show whose turn', 1);
      io.in('family-scrabble').emit('update results table with new row', players.length);

    }

    socket.emit('update letterstack', players[filteredPlayerIndex].letterStack);


  });

  socket.on('place tile', function(placedTile) {
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);

    if (placedTile.action === "add") {
      boardState[placedTile.destID] = {
        letter: placedTile.letter,
        value: placedTile.value
      };
      players[filteredPlayerIndex].letterStack[parseInt(placedTile.sourceID) - 1] = '';
      socket.to('family-scrabble').emit('get added tile', placedTile);
    } else if (placedTile.action === "move") {
      delete boardState[placedTile.sourceID];
      boardState[placedTile.destID] = {
        letter: placedTile.letter,
        value: placedTile.value
      };
      socket.to('family-scrabble').emit('get moved tile', placedTile);
    } else if (placedTile.action === "remove") {
      players[filteredPlayerIndex].letterStack[parseInt(placedTile.destID) - 1] = {
        letter: placedTile.letter,
        value: placedTile.value
      };
      delete boardState[placedTile.sourceID];
      socket.to('family-scrabble').emit('get removed tile', placedTile);
    }

  });

  socket.on('swapping letters', function(swappedLetters) { //insert back swapped letters into shuffled letters
    swappedLetters.forEach(function(letter, index) {
      posOfAddedLetter = Math.floor(Math.random() * shuffledLetters.length);
      shuffledLetters.splice(posOfAddedLetter, 0, swappedLetters[index]);
    });
    //empty array
    swappedLetters = [];

  });

  socket.on('finish turn', function(missingLetterPositions) {
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players); //current player
    //
    for (var i = 0; i < missingLetterPositions.length; i++) {
      if (shuffledLetters.length > 0) {
        let newLetter = shuffledLetters.shift(); //new
        // push new letter to players array letterStack property
        players[filteredPlayerIndex].letterStack[missingLetterPositions[i]] = newLetter;
      } else {
        break;
      }
    }

    socket.emit('update letterstack', players[filteredPlayerIndex].letterStack);
    socket.emit('count points');
    //fix all tiles in boardState - at the moment disregarding which tiles are fixed in the DOM, as this info is not being transmitted at the moment
    const keys = Object.keys(boardState);
    keys.forEach(function(key, index) {
      boardState[key].fixed = true;
    });
    io.emit('fix placed tiles');
    io.emit('update remaining letters', shuffledLetters.length);

    currentTurn++;
    let nextPlayerID = currentTurn % players.length;
    const socketIdOfNextPlayer = players[nextPlayerID].socketID;
    // sending to individual socketid (private message)
    io.to(socketIdOfNextPlayer).emit('start turn', 'Your turn');
    io.in('family-scrabble').emit('show whose turn', (nextPlayerID + 1));

  });

  socket.on('submit points of round', function(pointsSubmitted) {
    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);
    let pointArrayOfPlayer = players[filteredPlayerIndex].points;
    if (pointArrayOfPlayer.length === 0) {
      pointArrayOfPlayer.push(pointsSubmitted);
    } else {
      pointArrayOfPlayer.push(parseInt(pointArrayOfPlayer[pointArrayOfPlayer.length - 1]) + parseInt(pointsSubmitted));
    }
    let result = {
      player: filteredPlayerIndex,
      points: parseInt(pointArrayOfPlayer[pointArrayOfPlayer.length - 1])
    };
    io.in('family-scrabble').emit('update points', result);
    if (currentTurn % players.length === 0) {
      io.in('family-scrabble').emit('update results table with new row', players.length);
    }
  });

  socket.on('finish game', function(playerName) {
    // reset variables
    shuffledLetters = [];
    players = [];
    currentTurn = -1;
    gameOn = false;
    boardState = {};
    io.emit('game on or off', false);

    let newEndGameAction = new EndGameAction("endgame", playerName);

    // to everyone but the initiator
    socket.broadcast.emit('game ended', newEndGameAction);

    let newEndGameActionCurrentPlayer = new EndGameAction("endgame", "self");
    // to initiator
    socket.emit('game ended', newEndGameActionCurrentPlayer);

  });

});




function Player(name, order, socketID, letterStack) {
  this.name = name;
  this.order = order;
  this.socketID = socketID;
  this.letterStack = letterStack;
  this.points = [];
  this.placement = 0;
}

function EndGameAction(action, initiatorName) {
  this.action = action;
  this.initiatorName = initiatorName;
}

app.get("/board", function(req, res) {
  res.render("board", {
    firstName: '' //at this point we don't know who this is
  });
});

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
