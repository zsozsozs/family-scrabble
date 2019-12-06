// jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const shuffle = require(__dirname + "/shuffle.js");
const findPlayer = require(__dirname + "/player.js");


// Create a new Express application
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Create an http server with Node's HTTP module.
// Pass it the Express application
const server = require('http').createServer(app);
// Instantiate Socket.IO hand have it listen on the Express/HTTP server
// BEFORE const io = require('socket.io')(server);
var io = require('socket.io').listen(server);

// CONSTANTS and VARIABLES
const letterStack = [];
let shuffledLetters = [];
const players = [];
const letterStackPerPlayer = 7;
const maxPlayers = 3;

// Listen on port 3000.
server.listen(3000, function(req, res) {
  console.log("Server running on port 3000.");
});

io.on('connection', function(socket){

  console.log("SOCKETS at connection start:");
  console.log(io.sockets.adapter.rooms['family-scrabble']);

  console.log('BREAKING: a user connected');
  console.log("PLAYERS at connect: " + players.length);
  socket.on('disconnect', function(){

    const filteredPlayerIndex = findPlayer.findPlayerFromSocketID(socket.id, players);
    console.log("DISCONNECTING: " + players[filteredPlayerIndex].name);
    const loggedOutUser = {
      index: filteredPlayerIndex,
      name: players[filteredPlayerIndex].name
    };
    console.log("OBJECT loggedOutUser: ");
    console.log(loggedOutUser);
    io.in('family-scrabble').emit('player logout', loggedOutUser);
    players.splice(filteredPlayerIndex, 1);
    io.in('family-scrabble').emit('update players', players);

    console.log("PLAYERS AFTER REMOVING after DISCONNECT");
    console.log(players);

    console.log('BREAKING: user disconnected');
    console.log("PLAYERS at disconnect: " + players.length);
  });

  socket.on('player login', function(playerName){
    console.log('message: ' + playerName);

    if(players.length <= (maxPlayers-1)){
      console.log("MAX players: " + maxPlayers);
      console.log("PLAYERS at start: " + players.length);

      let newPlayer = new Player(playerName, players.length+1, socket.id);
      players.push(newPlayer);

      // join game room
      socket.join("family-scrabble");
      //  notify everyone (except user logging in) of new player in game room
      socket.to('family-scrabble').emit('player login', playerName);
      // update everyone's player list
      io.in('family-scrabble').emit('update players', players);

      console.log("PLAYERS after adding player: " + players.length);
      console.log("ROOM MEMBERS after adding player: " + io.sockets.adapter.rooms['family-scrabble'].length);
      if(players.length === maxPlayers && io.sockets.adapter.rooms['family-scrabble'].length === maxPlayers){
        io.in('family-scrabble').emit('start game', "Játék indítása.");
        console.log("START GAME");
        console.log(players);
      }

    } else {
      console.log("PLAYERS full: " + players.length);
      // notify client (only the one)
      socket.emit('game full', 'Game full.');
    }

    console.log("SOCKETS at connection end:");
    console.log(io.sockets.adapter.rooms['family-scrabble']);

    console.log(players);
    var room = io.sockets.adapter.rooms['family-scrabble'];
    console.log("ROOM members: " + room.length);
  });

});

// app.listen(3000, function(req, res) {
//   console.log("Server running on port 3000.");
// });

const letters = [
  {
  letter: "a",
  value: 1,
  count: 6
},
{
  letter: "á",
  value: 1,
  count: 4
},
{
letter: "b",
value: 2,
count: 3
},
{
letter: "c",
value: 5,
count: 1
},
{
  letter: "cs",
  value: 7,
  count: 1
},
{
  letter: "d",
  value: 2,
  count: 3
},
{
  letter: "e",
  value: 1,
  count: 6
},
{
  letter: "é",
  value: 3,
  count: 3
},
{
  letter: "f",
  value: 4,
  count: 2
},
{
  letter: "g",
  value: 2,
  count: 3
},
{
  letter: "gy",
  value: 4,
  count: 2
},
{
  letter: "h",
  value: 3,
  count: 2
},
{
  letter: "i",
  value: 1,
  count: 3
},
{
  letter: "í",
  value: 5,
  count: 1
},
{
  letter: "j",
  value: 4,
  count: 2
},
{
  letter: "k",
  value: 1,
  count: 6
},
{
  letter: "l",
  value: 1,
  count: 4
},
{
  letter: "ly",
  value: 8,
  count: 1
},
{
  letter: "m",
  value: 1,
  count: 3
},
{
  letter: "n",
  value: 1,
  count: 4
},
{
  letter: "ny",
  value: 5,
  count: 1
},
{
  letter: "o",
  value: 1,
  count: 3
},
{
  letter: "ó",
  value: 2,
  count: 3
},
{
  letter: "ö",
  value: 4,
  count: 2
},
{
  letter: "ő",
  value: 7,
  count: 1
},
{
  letter: "p",
  value: 4,
  count: 2
},
{
  letter: "r",
  value: 1,
  count: 4
},
{
  letter: "s",
  value: 1,
  count: 3
},
{
  letter: "sz",
  value: 3,
  count: 2
},
{
  letter: "t",
  value: 1,
  count: 5
},
{
  letter: "ty",
  value: 10,
  count: 1
},
{
  letter: "u",
  value: 4,
  count: 2
},
{
  letter: "ú",
  value: 7,
  count: 1
},
{
  letter: "ü",
  value: 4,
  count: 2
},
{
  letter: "ű",
  value: 7,
  count: 1
},
{
  letter: "v",
  value: 3,
  count: 2
},
{
  letter: "z",
  value: 4,
  count: 2
},
{
  letter: "zs",
  value: 8,
  count: 1
},
{
  letter: "joker",
  value: 0,
  count: 2
}
];


function Player(name, order, socketID, letterStack, placement) {
  this.name = name;
  this.order = order;
  this.socketID = socketID;
  this.letterStack = [letterStack];
  this.placement = placement;
}

// console.log(players);

app.get("/", function(req, res){
  res.render("login", {players: players});
});


function dealAtStartOfGame(){
  console.log("START DEALING");
  console.log("letters: " + letters.length);
    letters.forEach(function(letter){
      console.log(letter.letter + " - " + letter.count);
      for (var i = 0; i < letter.count; i++) {
        letterStack.push(letter.letter);
        // console.log(letter.letter);
      }
    });
    console.log("letterStack: " + letterStack.length);
    shuffledLetters = shuffle.shuffleLetters(letterStack);
    console.log("shuffledLetters: " + shuffledLetters.length);

console.log("before: " + shuffledLetters.length);

    players.forEach(function(player){
      for (var i = 0; i < letterStackPerPlayer; i++) {
        if(shuffledLetters.length > 0){
          player.letterStack[i] = shuffledLetters.shift();
        }
        // console.log(player.name);
        // console.log(player.letterStack);
        // console.log(shuffledLetters);
      }
      console.log(player.name);
      console.log(player.letterStack);
    });

    // console.log(players);
    console.log("after: " + shuffledLetters.length);
    // console.log(shuffledLetters);
    return letters;
}

app.post("/playerLogin", function(req, res){

  let newPlayer = new Player(req.body.firstName, players.length+1);
  players.push(newPlayer);
  res.redirect("/board");
});

app.get("/board", function(req, res){
  console.log("GET BOARD AND DEAL");
  dealAtStartOfGame();
  if(players.length === 2){
    res.render("board", {players: players});
  }
  console.log();
});
