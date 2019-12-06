// jshint esversion:6

$("#playerLogin").on('click', function(event) {
  $("form").addClass("hidden");
  $("#waitPanel").removeClass("hidden");

  var socket = io();
  $('form').submit(function(e){
    e.preventDefault(); // prevents page reloading
    socket.emit('player login', $('#firstName').val());
    $('#firstName').val('');
    return false;
  });
  socket.on('player login', function(msg){
$('.players').append($('<p>').text(msg + " logged in."));
  });

  socket.on('update players', function(players){
    // redo player list in case new users have arrived since page load
    $('ul#players').empty();
    players.forEach(function(player){
      $('ul#players').append($('<li>').text(player.name));
    });
  });

  socket.on('game full', function(msg){
    $("form").addClass("hidden");
    $(".loginContainer").empty();
    $('.players').empty();
    $('.players').append($('<p>').text(msg));
  });
  socket.on('player logout', function(player){
    $("ul#players li:nth-child(" + (player.index+1) + ")").remove();
    $('.players').append($('<p>').text(player.name + " logged out."));

  });
});
