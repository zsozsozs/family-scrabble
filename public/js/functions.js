// jshint esversion:6

$("#playerLogin").on('click', function(event) {
  $(".loginContainer form").addClass("d-none");
  $(".loginContainer #waitPanel").removeClass("d-none");
  $(".loginContainer .lds-roller").removeClass("d-none");

  var socket = io();
  $('form').submit(function(e){
    e.preventDefault(); // prevents page reloading
    socket.emit('player login', $('#firstName').val());
    $('#firstName').val('');
    return false;
  });
  socket.on('player login', function(msg){
      $('.loginContainer #waitPanel').empty();
$('.loginContainer #waitPanel').append($('<p>').text(msg + " bejelentkezett."));
  });

  socket.on('update players', function(players){
    // redo player list in case new users have arrived since page load
    $('.loginContainer ul#players').empty();
    players.forEach(function(player){
      $('.loginContainer ul#players').append($('<li>').text(player.name));
    });
  });

  socket.on('game full', function(msg){
    $("form").addClass("d-none");
    $(".loginForm").empty();
    $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(msg));
  });
  socket.on('player logout', function(player){
    $("ul#players li:nth-child(" + (player.index+1) + ")").remove();
      $('.loginContainer #waitPanel').empty();
    $('.loginContainer #waitPanel').append($('<p>').text(player.name + " kijelentkezett."));

  });

  socket.on('start game', function(msg){
  $('.loginContainer #waitPanel').empty();
  $('.loginContainer #waitPanel').append($('<p>').text(msg));
  });

});
