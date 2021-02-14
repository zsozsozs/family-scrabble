// jshint esversion:6
const socket = io();
let gameOn = false;
let yourTurn = false;
let swapMode = false;
let currentPlayerName;

$(window).on('load', function(e) {

  // LOGIN view
  if ($('#playerLogin').length > 0) {
    // reset variables if user is not
    if (sessionStorage.getItem('scrabbleID')) { // user is or was playing
      socket.emit('check if active player',
      sessionStorage.getItem('scrabbleID'), function(activePlayer) {
        if (activePlayer) {
          // redirect to board
          var re = new RegExp(/^.*\//);
          baseURL = re.exec(window.location.href);
          window.location.href = baseURL + "/board";
        } else {
          console.log('Login: invalid scrabbleID: your ID is not from an ongoing game');
          // happens e.g. when someone navigates away, meanwhile game ends and user comes back to login page
          // reset sessionStorage
          sessionStorage.removeItem('scrabbleLogin');
          sessionStorage.removeItem('scrabbleID');
        }
      });
    } else { // no scrabbleID in sessionStorage
      socket.emit('get player list at login');

    }
    if ($('#login .loginPlayers ul#players li').length > 0) {
      $("#login .loginPlayers").removeClass("d-none");
    }
  }
  // BOARD VIEW
  if ($('#board').length > 0) {


    if (sessionStorage.getItem('scrabbleID')) { //if exists - we set it when dealing, so if you just call 'board' this is false
      console.log('sessionStorage item exists');
      socket.emit('check if active player and log back in', sessionStorage.getItem('scrabbleID'), function(data) {
        if (data) {
          sessionStorage.setItem('scrabbleID', data.newSocketID);
          // set name
          $('#playerName').text(data.name);
          // set turn
          if (data.yourTurn == true) {
            yourTurn = true;
            $("#swapLetters").removeClass("d-none");
            $("#finishTurn").removeClass("d-none");
          }
        } else {
          console.log('Board: invalid scrabbleID: your ID is not from an ongoing game');
          // when someone loses connection and reloads on board view
          //at this point the game is over
          redirectToHome(); //scrabbleID needs to be removed from sessionStorage - done by redirectToHome
        }
      });
    } else { // no scrabbleID in sessionStorage
      if (sessionStorage.getItem('scrabbleLogin')) { //set temporarily at "start game" so we know who to show the board to and who to shoo away
          currentPlayerName = $("#playerName").text().trim();
          socket.emit('deal', currentPlayerName);
        sessionStorage.removeItem('scrabbleLogin');
      } else {
        console.log('no scrabbleID: you have not been playing');
        // game full / ongoing
        redirectToHome(); //scrabbleLogin needs to be removed from sessionStorage - done by redirectToHome
      }
    }


  }

});

function checkIfFirstNameValid() {
  var el = $('#firstName');
  if (el.val().trim() === "") {
  el.addClass("is-invalid");
  return false;
  } else {
    el.removeClass("is-invalid");
    return true;
  }
}


$( "#firstName" ).keyup(function() {
  checkIfFirstNameValid();
});


$("#loginForm").submit(function(event) {
  if (gameOn) {
    // Form submitted for real
  } else {
    event.preventDefault();
    if (checkIfFirstNameValid()) {
      // Form submitted, but only login is happening
      $(".loginContainer form").addClass("d-none");
      $(".loginContainer #waitPanel").removeClass("d-none");
      $(".loginContainer .lds-roller").removeClass("d-none");
      if ($('#noOfPlayers').length > 0) {
        setNoOfPlayers = Number($('#noOfPlayers').val());
        console.log(setNoOfPlayers);
        socket.emit('set maxPlayers', setNoOfPlayers);
      }
      playerName = $('#firstName').val();
      socket.emit('player login', playerName);
    }
  }
});

 // NEW
 socket.on('disconnect', (reason) => {

   const checkClientConnectionStatusWithDelay = setTimeout(function() { //user has 10sec to log back in
     console.log('check connection status on client side');
     if (socket.connected) {
       console.log('socket is connected again');
       // in this case we reload on reconnect event
       clearTimeout(checkClientConnectionStatusWithDelay);
     } else {
       // if (window.confirm('Ooops, it seems like you got disconnected. Reason: ' + reason + ' We will automatically reload the page for you.')) {
       //   location.reload();
       // }
       console.log("--Disconnect - automatic reload");
       location.reload();
     }
   }, 10000);

 });

socket.on('reconnect_failed', function() {
  console.log("--Reconnect failed for user ");
});

socket.on('reconnect', function() {
  // if (window.confirm('Automatic reconnect success. We will automatically reload the page for you.')) {
  //   location.reload();
  // }
  console.log("--Reconnect success - automatic reload");
  location.reload();
});

// NEW

socket.on('game on or off', function(value) {
  if (value) {
    gameOn = true;
  } else {
    gameOn = false;
  }
});

socket.on('player login', function(username) {
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(username + " bejelentkezett."));
});

socket.on('update players', function(players) {
  if (players.length < 1) {
    $(".loginContainer .noOfPlayers").removeClass("d-none");
  } else {
    $(".loginContainer .noOfPlayers").remove();
  }
  if (players.length > 0) {
    $(".loginContainer .loginPlayers").removeClass("d-none");
  }
  // redo player list in case new users have arrived since page load
  $('.loginContainer ul#players').empty();
  players.forEach(function(player) {
    $('.loginContainer ul#players').append($('<li>').text(player.name));
  });
});

socket.on('game full', function(msg) {
  $("form").addClass("d-none");
  $(".loginForm").empty();
  if ($('.loginContainer #waitPanel').hasClass("d-none")) {
    $('.loginContainer #waitPanel').removeClass("d-none");
  }
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(msg));
  $(".loginContainer .lds-roller").addClass("d-none");
  $(".loginContainer .loginPlayers").addClass("d-none");
});

socket.on('player logout', function(player) {
  $("ul#players li:nth-child(" + (player.index + 1) + ")").remove();
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(player.name + " kijelentkezett."));
});

socket.on('start game', function(msg) {
  sessionStorage.setItem('scrabbleLogin', true);
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(msg));
  gameOn = true;
  $("#loginForm").submit();
});

socket.on('save storage', function(socketID) {
  sessionStorage.setItem('scrabbleID', socketID);
  // console.log('playerId: ' + sessionStorage.getItem('playerId'));
});

socket.on('update letterstack', function(letters) {
  $.each(letters, function(index, letter) {

          if (letter instanceof Object) { // do this only if it is a valid letter
            let destinationCell = $('.letterStack .cell:nth-of-type(' + (index+1) + ')');
            destinationCell.empty();
            destinationCell.append('<button type="button" class="tile" data-letter="' + letter.letter + '" data-value="' + letter.value + '">' + letter.letter + '<sub>' + letter.value + '</sub></button>');
            destinationCell.addClass("taken");
    }

  });

});

socket.on('update remaining letters', function(number) {
  $("#remainingLetters").text(number);
});

socket.on('update points', function(result) {
  if (result.hasOwnProperty('points')) {
    if (result.hasOwnProperty('deduction')) { // at the end of the game
      $(".otherPlayers table.results tr:last td:nth-of-type(" + (result.player + 1) + ") ").append(result.deduction + "<br><b>" + result.points + "</b>");
    } else { //no deduction - DEFAULT case
      $(".otherPlayers table.results tr:last td:nth-of-type(" + (result.player + 1) + ") ").append(result.points);
    }
  }
  // handle remaining latters
  let spanEl = $(".otherPlayers table.results tr.players th:nth-child(" + (result.player + 1) + ") span.remaining");
  if (result.hasOwnProperty('lettersLeftInLetterstack')) { // display how many letters left (stack not full)
    let cellEl = $(".otherPlayers table.results tr.players th:nth-child(" + (result.player + 1) + ")");
    if (spanEl.length > 0) {
      spanEl.text("(" + result.lettersLeftInLetterstack + ")");
    } else {
      cellEl.append('<span class="remaining">(' + result.lettersLeftInLetterstack + ')</span>');
    }
  } else { // no lettersLeftInLetterstack transmitted
      spanEl.remove(); // in case the span element is there...
  }
});

$(".cell").on("click", "button.tile", function(event) {
  event.stopPropagation();
  if (yourTurn) {
    if (!swapMode) { //not swapMode
      if (!$(this).hasClass("fixed")) {
        if ($(this).hasClass("focused")) {
          $("button.tile").each(function() {
            $(this).removeClass("focused");
            // enable swap button
            if ($("#swapLetters").prop("disabled")) {
              $("#swapLetters").prop("disabled", false);
            }
          });
        } else {
          $("button.tile").each(function() {
            $(this).removeClass("focused");
          });
          $(this).addClass("focused");
        }
      } else {
        // Tile fixed
      }
    }
    // swapMode
    else {
      if ($(this).closest(".letterStack").length) {
        if ($(this).hasClass("focused")) {
          $(this).removeClass("focused");
        } else {
          $(this).addClass("focused");
        }

      }
    }

  }

});

$("#swapLetters").on("click", function() {
  if (swapMode) {
    swapMode = false;
    $("#swapLetters img.on").addClass("d-none");
    $("#swapLetters img.off").removeClass("d-none");
    // defocus all chosen letters in letterstack if there is more than 1 selected
    if ($(".letterStack button.focused").length > 1) {
      $(".letterStack button.tile").each(function() {
        $(this).removeClass("focused");
      });
    }

  } else {
    swapMode = true;
    $("#swapLetters").removeClass("off");
    $("#swapLetters").addClass("on");
    $("#swapLetters img.off").addClass("d-none");
    $("#swapLetters img.on").removeClass("d-none");

  }
});

// workaorund for propagation problem (sub-element of clickable item)
$("#swapLetters img").on("click", function() {
  event.stopPropagation();
  $("#swapLetters").trigger("click");
});


$(".cell").click(function() {
  if (yourTurn) {
    if (!swapMode) {
      if (!$(this).hasClass("taken")) {
        let focusedTile = $("button.tile.focused");
        if (focusedTile.length === 1) {


          let source = 1; //focused tile comes from letterstack
          if (focusedTile.closest(".scrabbleBoard").length) {
            source = 2; //focused tile comes from board
          }

          let dest = 4; //new position is on board
          if ($(this).closest(".letterStack").length) {
            dest = 6; //new position is on letterstack
          }

          let action;
          if (source + dest !== 7) { //from letterstack to letterstack does not need to be transmitted to others

            if (source + dest === 5) {
              action = "add";
            } else if (source + dest === 6) {
              action = "move";
            } else if (source + dest === 8) {
              action = "remove";
            }

            const placedTile = {
              letter: focusedTile.attr("data-letter"),
              value: focusedTile.attr("data-value"),
              action: action,
              sourceID: focusedTile.closest(".cell").attr("data-pos"),
              destID: $(this).closest(".cell").attr("data-pos")
            };

            socket.emit('place tile', placedTile);

          }
          focusedTile.closest(".cell").removeClass("taken");
          focusedTile.appendTo($(this));

          if (dest === 6) { //if dest of placement is letterstack

            if ($(".letterStack button.tile").length === 7) {
              // enable swap button
              if ($("#swapLetters").prop("disabled")) {
                $("#swapLetters").prop("disabled", false);
              }
            }

          } else if (dest === 4) { //if dest of placement is board
            // disable swap button
            if (!$("#swapLetters").prop("disabled")) {
              $("#swapLetters").prop("disabled", true);
            }
          }


          $(this).addClass("taken");
          $("button.tile").each(function() {
            $(this).removeClass("focused");
          });
        } else {
          $("button.tile").each(function() {
            $(this).removeClass("focused");
          });
        }
      } else {
        // Field taken
      }
    }
  }
});




socket.on('get added tile', function(placedTile) {
  $(".scrabbleBoard .cell-" + (placedTile.destID)).append('<button type="button" class="tile" data-letter="' + placedTile.letter + '" data-value="' + placedTile.value + '">' + placedTile.letter + '<sub>' + placedTile.value + '</sub></button>');
  $(".scrabbleBoard .cell-" + (placedTile.destID)).addClass("taken");

  if (placedTile.fixed == true) { //new
    $(".scrabbleBoard .cell-" + (placedTile.destID) + " button.tile").addClass("fixed");
  }

});

socket.on('get moved tile', function(placedTile) {
  $(".scrabbleBoard .cell-" + (placedTile.sourceID) + " button.tile").appendTo(".scrabbleBoard .cell-" + (placedTile.destID));
  $(".scrabbleBoard .cell-" + (placedTile.sourceID)).removeClass("taken");
  $(".scrabbleBoard .cell-" + (placedTile.destID)).addClass("taken");

});

socket.on('get removed tile', function(placedTile) {
  $(".scrabbleBoard .cell-" + (placedTile.sourceID)).empty();
  $(".scrabbleBoard .cell-" + (placedTile.sourceID)).removeClass("taken");
});

$("#finishTurn").click(function() {
  if (swapMode) {
    swapMode = false;
    $("#swapLetters img.on").addClass("d-none");
    $("#swapLetters img.off").removeClass("d-none");

    let swappedLetters = [];

    $(".letterStack button.focused").each(function() {

      const swappedLetter = {
        letter: $(this).attr("data-letter"),
        value: parseInt($(this).attr("data-value"))
      };

      swappedLetters.push(swappedLetter);
      $(this).closest('.cell').removeClass('taken');
      $(this).remove();
    });

    socket.emit('swapping letters', swappedLetters); //this inserts the letters back into the shuffled letters array before we get the swapped letters

  }

  //NEW
  let missingLetters = [];
  $(".letterStack .cell:not(.taken)").each(function() {
    missingLetters.push(parseInt($(this).attr('data-pos'))-1); //we transmit -1 because afterwards we work with the numbers as positions in the letterStack array
  });

  yourTurn = false;
  $("#swapLetters").addClass("d-none");
  $("#finishTurn").addClass("d-none");
  // let remainingLetters = $(".letterStack button.tile").length;
  socket.emit('finish turn', missingLetters);
});

function checkNeighboringCellForFixedTiles(rowNum, colNum, direction, foundCounter = 0, pointsCountedSoFar = 0) {
  // optional parameters used when function calls itself when checking for more neighbouring tiles

  // modified row and column numbers for finding the desired nieghbouring cell
  let newRowNum = rowNum;
  let newColNum = colNum;

  if (direction === "left") {
    newColNum = colNum - 1;
  } else if (direction === "up") {
    newRowNum = rowNum - 1;
  } else if (direction === "right") {
    newColNum = colNum + 1;
  } else if (direction === "down") {
    newRowNum = rowNum + 1;
  }

  if (newRowNum > 0 && newColNum > 0) { //if side of board not yet reached
    let neighboringCell = $(".cell-" + newRowNum + "-" + newColNum);

    if (neighboringCell.children("button.tile.fixed").not(".counted").length === 1) { //if fixed tile is found
      neighboringCell.children("button.tile.fixed").addClass("counted");
      foundCounter++;
      pointsCountedSoFar += parseInt(neighboringCell.children("button.tile.fixed").attr("data-value"));
      return checkNeighboringCellForFixedTiles(newRowNum, newColNum, direction, foundCounter, pointsCountedSoFar);
    } else if (neighboringCell.children("button.tile").not(".fixed").length === 1) { //if freshly laid tile is found
      // continue search if there is a newly laid tile in between
      return checkNeighboringCellForFixedTiles(newRowNum, newColNum, direction, foundCounter, pointsCountedSoFar);
    } else { //if NO tile is found
      if (foundCounter > 0) {
        return pointsCountedSoFar;
      } else {
        return -1;
      }
    }
  } else { //if side of board reached
    if (foundCounter > 0) { //if tiles have been found
      return pointsCountedSoFar;
    } else { //if NO tiles have been found at all
      return -1;
    }
  }

}

function removeCountedClassFromFixedTiles() {
  $(".scrabbleBoard button.tile.counted").each(function() {
    $(this).removeClass("counted");
  });
}

socket.on('count points', function() {
  let starterRowNum; //for determining the direction of the word
  let starterColNum; //for determining the direction of the word
  let horizontalWord = false;
  let verticalWord = false; //when only one letter is laid down, both horizontalWord or verticalWord are false
  let newWordValMultiplier = 1; // store word multiplier value

  let newWordPointsBuffer = 0; //buffer to store the points OF THE NEWLY LAID TILES globally (value gets accumulated with each iteration of the counter loop)
  let pointsToSubmit = 0; //value accumulated from the FIXED TILES (fixed) the newly laid word connected to, will be eventually the holder of ALL the points

  //  do this loop of the newly laid tiles - separate from point calculation, as we will need to work with the result when we examine all the letters one by one later
  // 1. word value multiplier
  // 2. direction of word
  $(".scrabbleBoard button.tile").not(".fixed").each(function(index) {
    //set word multiplier, if it has to be modified
    if ($(this).closest(".cell").is("[data-val-w]")) {
      newWordValMultiplier *= parseInt($(this).closest(".cell").attr("data-val-w"));
    }

    //set direction of word
    if (index === 0) {
      let posAttr = $(this).closest(".cell").attr("data-pos");
      let rowNum = parseInt(posAttr.substring(0, posAttr.indexOf("-")));
      let colNum = parseInt(posAttr.substring(posAttr.indexOf("-") + 1));
      starterRowNum = rowNum;
      starterColNum = colNum;
    } else {
      // check if there are more letters to the word horizontally (a fixed tile in between is no problem)
      if ($(this).closest(".cell").hasClass("r-" + starterRowNum)) {
        horizontalWord = true;
      } else {
        horizontalWord = false;
      }
      // check if there are more letters to the word vertically (a fixed tile in between is no problem)
      if ($(this).closest(".cell").hasClass("c-" + starterColNum)) {
        verticalWord = true;
      } else {
        verticalWord = false;
      }
    }

  });

  // in this second loop the points will be counted up
  $(".scrabbleBoard button.tile").not(".fixed").each(function(index) {

    //attributes of tile and cell
    let posAttr = $(this).closest(".cell").attr("data-pos");
    let rowNum = parseInt(posAttr.substring(0, posAttr.indexOf("-")));
    let colNum = parseInt(posAttr.substring(posAttr.indexOf("-") + 1));
    let letterValue = parseInt($(this).attr("data-value"));
    let letterValMultiplier = 1; //based on cell
    let wordValMultiplier = 1; //based on cell

    //variabled for data about connected tiles and points
    let horizontalNeighbours = false; //does the letter have horizontal neighbours?
    let horizontalNeighbourPoints = 0; //amount of points coming from the letter's horizontal neighbours
    let verticalNeighbours = false; //does the letter have vertical neighbours?
    let verticalNeighbourPoints = 0; //amount of points coming from the letter's horizontal neighbours

    //if cell has special attribute - set letterValMultiplier and wordValMultiplier (this is on the level of the letter, the global word value modifier is set elsewhere)
    if ($(this).closest(".cell").is("[data-val-l]")) {
      letterValMultiplier = parseInt($(this).closest(".cell").attr("data-val-l"));
    }
    if ($(this).closest(".cell").is("[data-val-w]")) {
      wordValMultiplier = parseInt($(this).closest(".cell").attr("data-val-w"));
    }

    // COUNT FIXED LETTERS

    // did the new word connect to any other words HORIZONTALLY?
    let pointsFromLeft = checkNeighboringCellForFixedTiles(rowNum, colNum, "left");
    let pointsFromRight = checkNeighboringCellForFixedTiles(rowNum, colNum, "right");
    // count up points of HORIZONTALLY connected letters
    if (pointsFromLeft >= 0 || pointsFromRight >= 0) { //have to take into account, that the letter we connect to, is 0, otherwise if no tile found, -1 comes back
      horizontalNeighbours = true;
      if (pointsFromLeft >= 0) {
        horizontalNeighbourPoints += pointsFromLeft;
      }
      if (pointsFromRight >= 0) {
        horizontalNeighbourPoints += pointsFromRight;
      }
      // determine which word multiplier to use: GLOBAL or LOCAL
      if (horizontalWord) {
        pointsToSubmit += (horizontalNeighbourPoints * newWordValMultiplier); // GLOBAL word value multiplier
        // if the newly laid word is horizontal too (as are the fixed tiles it connected to), multiply the horizontalNeighbourPoints by the GLOBAL word value multiplier
      } else {
        pointsToSubmit += (horizontalNeighbourPoints * wordValMultiplier); // LOCAL word value wordValMultiplier
        // if the newly laid word is NOT horizontal (like the fixed tiles it connected to), the LOCAL word value multiplier has to be used (the GLOBAL value is not relevant, as the horizontal fixed tiles do not belong to the MAIN word)
      }
    }

    // did the new word connect to any other words VERTICALLY?
    let checkUp = checkNeighboringCellForFixedTiles(rowNum, colNum, "up");
    let checkDown = checkNeighboringCellForFixedTiles(rowNum, colNum, "down");
    // count up points of VERTICALLY connected letters
    if (checkUp >= 0 || checkDown >= 0) { //have to take into account, that the letter we connect to, is 0, otherwise if no tile found, -1 comes back
      verticalNeighbours = true;
      if (checkUp >= 0) {
        verticalNeighbourPoints += checkUp;
      }
      if (checkDown >= 0) {
        verticalNeighbourPoints += checkDown;
      }
      // determine which word multiplier to use: GLOBAL or LOCAL
      if (verticalWord) {
        pointsToSubmit += (verticalNeighbourPoints * newWordValMultiplier); // GLOBAL word value multiplier
        // if the newly laid word is vertical too (as are the fixed tiles it connected to), multiply the verticalNeighbourPoints by the GLOBAL word value multiplier
      } else {
        pointsToSubmit += (verticalNeighbourPoints * wordValMultiplier); // LOCAL word value wordValMultiplier
        // if the newly laid word is NOT vertical (like the fixed tiles it connected to), the LOCAL word value multiplier has to be used (the GLOBAL value is not relevant, as the vertical fixed tiles do not belong to the MAIN word)
      }
    }

    // COUNT NEWLY PUT DOWN LETTERS

    if (!horizontalWord && !verticalWord) { // only one letter
      if ((horizontalNeighbours && verticalNeighbours)) {
        //count 2x
        newWordPointsBuffer += (letterValue * letterValMultiplier * 2);
      } else {
        // count 1x
        newWordPointsBuffer += (letterValue * letterValMultiplier);
      }
    } else { // more letters
      if ((horizontalWord && verticalNeighbours) || (verticalWord && horizontalNeighbours) || (horizontalNeighbours && verticalNeighbours)) {
        // count 2x
        // 1x it goes to the calculation of the fixed tiles the newly laid word connected to
        pointsToSubmit += (letterValue * letterValMultiplier * wordValMultiplier); //the LOCAL word value multiplier has to be used (the GLOBAL value is not relevant, as the vertical fixed tiles do not belong to the MAIN word)
        // 1x it goes to the calculation of the points of the newly laid word
        newWordPointsBuffer += (letterValue * letterValMultiplier);
      } else {
        // count once
        newWordPointsBuffer += (letterValue * letterValMultiplier);
      }
    }

  });
  removeCountedClassFromFixedTiles();
  pointsToSubmit += (newWordPointsBuffer * newWordValMultiplier); // multiply points of the MAIN word with the global multiplier
  socket.emit('submit points of round', pointsToSubmit);

});

socket.on('fix placed tiles', function() {
  $(".scrabbleBoard button.tile").not(".fixed").each(function(index) {
    $(this).addClass("fixed");
    $(this).closest(".cell").addClass("taken");
  });
});

socket.on('start turn', function() {
  yourTurn = true;
  $("#swapLetters").removeClass("d-none");
  if ($("#swapLetters").prop("disabled")) {
    $("#swapLetters").prop("disabled", false);
  }
  $("#finishTurn").removeClass("d-none");
});

socket.on('update results table with new row', function(noOfPlayers, className = "") {
  if (className !== "") {
    $(".otherPlayers table.results").append('<tr class="' + className + '"></tr>');
  } else {
    $(".otherPlayers table.results").append("<tr></tr>");
  }
  for (var i = 0; i < noOfPlayers; i++) {
    $(".otherPlayers table.results tr:last").append("<td></td>");
  }
});

socket.on('show other players', function(playerName) {
  $(".otherPlayers table.results tr.players").append("<th><span>" + playerName + "</span></th>");
});

socket.on('show whose turn', function(nextPlayerIndex) {
  $(".otherPlayers table.results tr.players th span").each(function() {
    $(this).removeClass("current");
  });
  $(".otherPlayers table.results tr.players th:nth-child(" + nextPlayerIndex + ") span").addClass("current");

});

$("#finishGame").on("click", function() {
  $('.confirmFinishGame').removeClass("d-none");
});

$("#noFinishGame").on("click", function() {
  $('.confirmFinishGame').addClass("d-none");
});

$("#yesFinishGame").on("click", function() {
  socket.emit('finish game', currentPlayerName);
});

socket.on('game ended', function(endGameAction) {
  $('#gameEndModal').modal({
    backdrop: 'static'
  });
  $('#gameEndModal').modal('show');
  if (endGameAction.action === "logout") {
    $('#logoutPlayerName').text(endGameAction.initiatorName);
    $(".logoutPlayer").removeClass("d-none");
  } else if (endGameAction.action === "endgame") {
    if (endGameAction.initiatorName === "self") {} else {
      $('#gameEndPlayerName').text(endGameAction.initiatorName);
      $(".gameEndPlayer").removeClass("d-none");
    }
  } else if ("finishedgame") {
    $("table.results").clone().appendTo(".finishGame");
    $(".finishGame").removeClass("d-none");
  }

});

function redirectToHome() {
  sessionStorage.removeItem('scrabbleLogin');
  sessionStorage.removeItem('scrabbleID');
  var re = new RegExp(/^.*\//);
  baseURL = re.exec(window.location.href);
  window.location.href = baseURL;
}

$("#gameEndModal button").on("click", function(event) {
  event.preventDefault();
  redirectToHome();
});

$('#gameEndModal').on('hidden.bs.modal', function(e) {
  event.preventDefault();
  redirectToHome();
});
