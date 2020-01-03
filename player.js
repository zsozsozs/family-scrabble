// jshint esversion:6

exports.findPlayerFromSocketID = function(socketID, players) {

  const filteredPlayerIndex = players.findIndex(player => player.socketID === socketID);

  if (filteredPlayerIndex > -1) {
    return filteredPlayerIndex;
  } else {
    return false;
  }

};
