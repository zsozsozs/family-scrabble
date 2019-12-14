// jshint esversion:6

exports.findPlayerFromSocketID = function(socketID, players) {
  console.log("PLAYERS in findPlayerFromSocketID");
  console.log(players);
  console.log(socketID);

  const filteredPlayerIndex = players.findIndex(player => player.socketID === socketID);
  // console.log("USER to remove: " + filteredPlayerIndex);
  // console.log(players[filteredPlayerIndex]);

  console.log("INDEX: " + filteredPlayerIndex);

  if (filteredPlayerIndex > -1) {
    return filteredPlayerIndex;
  } else {
    return false;
  }
  
};
