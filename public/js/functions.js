// jshint esversion:6
const socket = io();
let gameOn = false;

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
    console.log(index + " : " + letter);
    $(".letterStack .cell-" + (index + 1) + " button").html(letter.letter + "<sub>" + letter.value + "</sub>");
    $(".letterStack .cell-" + (index + 1) + " button").attr("data-letter", letter.letter);
    $(".letterStack .cell-" + (index + 1) + " button").attr("data-value", letter.value);
  });

});

$("button.tile").click(function(event) {
  event.stopPropagation();
  if (!$(this).hasClass("fixed")) {

    // if ($("button.tile.focused").length === 0) {
    //   $(this).addClass("focused");
    // } else {
    //   $("button.tile").each(function() {
    //     $(this).removeClass("focused");
    //   });
    // }

      $("button.tile").each(function() {
        $(this).removeClass("focused");
      });
      $(this).addClass("focused");


  } else {
    console.log("File fixed.");
  }


});

$(".cell").click(function() {
  if (!$(this).hasClass("taken")) {
    console.log("click");
    let focusedTile = $("button.tile.focused");
    if (focusedTile.length === 1) {
      focusedTile.closest(".cell").removeClass("taken");
      focusedTile.appendTo($(this));
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

});
