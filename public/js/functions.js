// jshint esversion:6
const socket = io();
let gameOn = false;
let yourTurn = false;
let swapMode = false;

$(window).on('load', function(e) {
  // LOGIN view
  if ($('#login .loginPlayers ul#players li').length > 0) {
    $("#login .loginPlayers").removeClass("d-none");
  }

  // BOARD view
  if ($('#board').length > 0) {
    var playerName = $("#playerName").text();
    socket.emit('deal', playerName);
  }

});


$("#loginForm").submit(function(event) {
  if (gameOn) {
    console.log("Form submitted for real");
  } else {
    event.preventDefault();
    console.log("Form submitted, but only login is happening");
    $(".loginContainer form").addClass("d-none");
    $(".loginContainer #waitPanel").removeClass("d-none");
    $(".loginContainer .lds-roller").removeClass("d-none");
    socket.emit('player login', $('#firstName').val());
  }
});

socket.on("sessiondata", function(data) {
  console.info("sessiondata event received. Check the console");
  console.info("sessiondata is ", data);
});

socket.on('player login', function(username) {
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(username + " bejelentkezett."));
});

socket.on('update players', function(players) {
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
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(msg));
});

socket.on('player logout', function(player) {
  $("ul#players li:nth-child(" + (player.index + 1) + ")").remove();
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(player.name + " kijelentkezett."));
});

socket.on('start game', function(msg) {
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(msg));
  // $('#playerLogin').trigger('click');
  gameOn = true;
  $("#loginForm").submit();
});

socket.on('update letterstack', function(letters) {
  console.log(letters);
  $.each(letters, function(index, letter) {
    console.log(letter);

    $(".letterStack .cell").each(function(cell){
      console.log("data-pos atribute value: " + $(this).attr("data-pos"));
      console.log("cell has so many children: " + $(this).children().length);
        if ($(this).children().length === 0) {
          console.log("0 children");
          $(this).append('<button type="button" class="tile" data-letter="' + letter.letter + '" data-value="' + letter.value + '">' + letter.letter + '<sub>' + letter.value + '</sub></button>');
          $(this).addClass("taken");
          return false;
        }

    });

  });

});

$(".cell").on("click", "button.tile", function(event) {
  console.log("Swap mode: " + swapMode);
  event.stopPropagation();
    if (yourTurn) {
      if (!swapMode) { //not swapMode
        if (!$(this).hasClass("fixed")) {
          if ($(this).hasClass("focused")) {
            $("button.tile").each(function() {
              $(this).removeClass("focused");
              // enable swap button
              if($("#swapLetters").prop("disabled")){
                  $("#swapLetters").prop( "disabled", false );
              }
            });
          } else {
            $("button.tile").each(function() {
              $(this).removeClass("focused");
            });
            $(this).addClass("focused");
          }
        } else {
          console.log("Tile fixed.");
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
    console.log("SWAP mode OFF");
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
    console.log("SWAP mode ON");
    $("#swapLetters").removeClass("off");
    $("#swapLetters").addClass("on");
    $("#swapLetters img.off").addClass("d-none");
    $("#swapLetters img.on").removeClass("d-none");

  }
});

// workaorund for propagation problem (subelement of clickable item)
$("#swapLetters img").on("click", function() {
    event.stopPropagation();
    $("#swapLetters").trigger("click");
});


$(".cell").click(function() {
  if (yourTurn) {
      if (!swapMode) {
        if (!$(this).hasClass("taken")) {
          console.log("click");
          let focusedTile = $("button.tile.focused");
          if (focusedTile.length === 1) {


            let source = 1; //focused tile comes from letterstack
            if (focusedTile.closest(".scrabbleBoard").length) {
              source = 2; //focused tile comes from board
            }
            console.log("Source: " + source);

            let dest = 4; //new position is on board
            if($(this).closest(".letterStack").length){
              dest = 6; //new position is on letterstack
            }
            console.log("Dest: " + dest);

            let action;
            if (source + dest !== 7) { //from letterstacl to letterstack does not need to be transmitted to others

              if (source + dest === 5){
                action = "add";
              }
              else if (source + dest === 6) {
                action = "move";
              } else if (source + dest === 8){
                action = "remove";
              }

              const placedTile = {
                  letter: focusedTile.attr("data-letter"),
                  value: focusedTile.attr("data-value"),
                  action: action,
                  sourceID: focusedTile.closest(".cell").attr("data-pos"),
                  destID:
                  $(this).closest(".cell").attr("data-pos")
              };

              socket.emit('place tile', placedTile);

            }
            focusedTile.closest(".cell").removeClass("taken");
            focusedTile.appendTo($(this));

            if (dest === 6) { //if dest of placement is letterstack

              console.log("So many letters in letterstack: " + $(".letterStack button.tile").length);
                if ($(".letterStack button.tile").length === 7) {
                  // enable swap button
                  if($("#swapLetters").prop("disabled")){
                      $("#swapLetters").prop( "disabled", false );
                  }
                }

            } else if (dest === 4) { //if dest of placement is board
              // disable swap button
              if(!$("#swapLetters").prop("disabled")){
                  $("#swapLetters").prop( "disabled", true );
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
          console.log("Field taken.");
        }
      }
}
});




socket.on('get added tile', function(placedTile) {
$(".scrabbleBoard .cell-" + (placedTile.destID)).append('<button type="button" class="tile fixed" data-letter="' + placedTile.letter + '" data-value="' + placedTile.value + '">' + placedTile.letter + '<sub>' + placedTile.value + '</sub></button>');
$(".scrabbleBoard .cell-" + (placedTile.destID)).addClass("taken");

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

$("#finishTurn").click(function(){
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
      $(this).remove();
    });

    socket.emit('swapping letters', swappedLetters);

  }
  $(".scrabbleBoard button.tile").each(function() {
    $(this).addClass("fixed");
    $(this).closest(".cell").addClass("taken");
  });
  yourTurn = false;
  $("#swapLetters").addClass("d-none");
  $("#finishTurn").addClass("d-none");
  let remainingLetters = $(".letterStack button.tile").length;
  socket.emit('finish turn', remainingLetters);
});

socket.on('start turn', function(msg) {
  console.log("STARTING turn");
console.log(msg);
yourTurn = true;
$("#swapLetters").removeClass("d-none");
if($("#swapLetters").prop("disabled")){
    $("#swapLetters").prop( "disabled", false );
}
$("#finishTurn").removeClass("d-none");
});
