const { Console } = require('console');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var players = {};
//The Value that holds the number of splats on screen
var paintSplats = {};
//Number of splats in int form
var numSplats =0;
//The Round time in seconds
var maxTimeInSeconds = 10;
//The timer that iterates down until the round ends.
var clockTimer = 10;

//The target panel where players need to splat paint.
var targetPanel = {
  x: 0,
  y: 0,
  h: 100,
  w: 250,
  targetX: 20,
  targetY: 20
};

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  console.log('a user connected: ', socket.id);
  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    colour: Math.floor(Math.random()*16777215).toString(16)
  };
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // when a player disconnects, remove them from our players object
  socket.on('disconnect', function () {
    console.log('user disconnected: ', socket.id);
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
  });

  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('playerFiring', function (firingData) {
    fireX = firingData.x;
    fireY = firingData.y;
    playerID = firingData.playerId;

    if(fireX < (targetPanel.x+targetPanel.w) && fireX > targetPanel.x )
    {
      if(fireY < (targetPanel.y+targetPanel.h) && fireY > targetPanel.y)
      {
        //A limit on the number of splats to avoid potential lag. Also prevent adding splats in between rounds.
        if(numSplats < 150 && clockTimer >= 0)
        {
          //A hit and the values are saved
          console.log(playerID +  " HIT ");
          paintSplats[numSplats]= {
            playerID: playerID,
            playerColour: players[playerID].colour,
            y: fireY - targetPanel.y,
            x: fireX - targetPanel.x
          };
          numSplats++;
        }
      }
    }
  });
});

setInterval(function(){
  //Update Intervals

  //Scoreboard Handling

  if(targetPanel.x < targetPanel.targetX + 5 && targetPanel.x > targetPanel.targetX - 5 )
  {
    if(targetPanel.y < targetPanel.targetY + 5 && targetPanel.y > targetPanel.targetY - 5 )
    {
      //Once it reaches an area around it's target it picks a new random target to move the targetPanel towards
      targetPanel.targetX = Math.floor(Math.random() * 450);
      targetPanel.targetY = Math.floor(Math.random() * 400) ;
    }
  }
  if( targetPanel.x > targetPanel.targetX)
  {
    targetPanel.x--;
  }
  else if (targetPanel.x < targetPanel.targetX )
  {
    targetPanel.x++;
  }

  if( targetPanel.y > targetPanel.targetY)
  {
    targetPanel.y--;
  }
  else if (targetPanel.y < targetPanel.targetY )
  {
    targetPanel.y++;
  }
  io.emit('targetLocation', targetPanel, paintSplats,numSplats); 
  //Emit where the target board is currently along with all the splats currently on it.

}, 75);

setInterval(function(){
  //The Round timer Decrements down
  if (clockTimer >= 0)
  {
    clockTimer--;
  }

  if(clockTimer < 0)
  {
    //When the Round Timer Ends find the winner with the most splats on the Target.
    //Reset the Round timer for the next round
    clockTimer = maxTimeInSeconds;
    var winnerCount = {};
    if(numSplats > 0)
    {
      for (i = 0; i < numSplats; i++)
    {
        if (typeof  winnerCount[paintSplats[i].playerID] == 'undefined' && typeof  players[paintSplats[i].playerID] != 'undefined')
        {
          //Defines the value with a 1 if it was previously undefined.
          winnerCount[paintSplats[i].playerID] = 1;
        }
        else
        {
          //Increases the value. This is the number of times each player has splatted the board this round.
          //The one with the highest amount of splats is the winner/
          winnerCount[paintSplats[i].playerID]++;
        }
    }
    //Find the Highest Value and Key ID
    var highestValueFound = 0;
    var highestKey = 0;
  for (const [key, value] of Object.entries(winnerCount)) {
    //Skips if the playerID is deleted due to disconnection
    if(typeof  players[key] != 'undefined')
    {
      //Sets the first value as the highest found to start things off
      if(highestValueFound == 0)
      {
        highestKey = key;
        highestValueFound = value;
      }
      //Checks to see if it has a higher value. If it does it means that the other keyID appeared more times than the current one
      //Which means the other player has more splats on the board
      if(value > highestValueFound)
      {
        console.log("New Highest; ");
        highestKey = key;
        highestValueFound = value;

      }
    }
    }
  
      console.log("ID: " + highestKey + " Value: " + highestValueFound);
      //Emit the winner
      if(typeof  players[highestKey] != 'undefined')
      {
        io.emit('winnerUpdate', {colour:players[highestKey].colour , id: highestKey}); 
      }
      else
      {
        //No winner due to no shots being fire or Old winner disconnecting before the round ended.
        io.emit('winnerUpdate', {colour: 000000 , id: "NO ONE "}); 
      }
      
      }
    else{
      //No winner due to no shots being fire or Old winner disconnecting before the round ended.
      io.emit('winnerUpdate', {colour: 000000 , id: "NO ONE "}); 
    }
    

    //Clear the Splats in the players
    io.emit('clearUP', numSplats);
    //Clear the Splats, splat num and winner count here.
    for (var member in paintSplats) delete paintSplats[member];
    numSplats = 0;

    for (var member in winnerCount) delete winnerCount[member];

  }

  io.emit('timerUpdate', clockTimer); 
}, 1000);
server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});
