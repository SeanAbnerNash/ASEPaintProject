var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  backgroundColor : Phaser.Display.Color.HexStringToColor('#D3D3D3'),
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  } 
};

var game = new Phaser.Game(config);
//Values to hold the button objects. the four main directions and fire button.
var upButton,downButton,rightButton,leftButton,fireButton;
//Define the values holding the button states. Bools for if a button is pressed down or not.
var upState,downState,rightState,leftState;
//The Value from which the directional buttons are centred on. Changing their position only needs to change these
//two variables.
var controlCentreX,controlCentreY;
//Dictionary holding the splat data on screen.
var splatData = {};

//Asset Loading
function preload() {
  this.load.image('player', 'Assets/crosshairPlayer.png');
  this.load.image('otherPlayer', 'Assets/crosshairOther.png');
  this.load.image('target', 'Assets/TargetBoard.png');
  this.load.image('rectButton', 'Assets/buttons/button-horizontal.png');
  this.load.image('circleButton', 'Assets/buttons/button-round.png');
  this.load.image('splat','Assets/paintSplat.png');
}

function create() {
  //Define where the controlls will go and set the button states to unpressed.
  controlCentreX = 575;
  controlCentreY = 450;
  upState=false;downState=false;rightState=false;leftState=false;

  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  //Set up the players, target and Info Text
  this.timerText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  this.winnerText = this.add.text(200, 16, '', { fontSize: '25px', fill: '#FF0000' });
  this.target = this.physics.add.image(-500, -500, 'target').setOrigin(0.0, 0.0).setDisplaySize(250, 100);

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        //Add the Player to the screen.
        addPlayer(self, players[id],id);
      } else {
        //Add the other players.
        addOtherPlayers(self, players[id]);
      }
    });
  });
  //Each player has their own unique random colour. But for clarity the Player will see their own crosshairs as 
  //different from the others. 
  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  //Deletes the sprites when a player Disconnects.
  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  //If a player has moved, updates the screen
  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  //Cursor Creation for input
  this.cursors = this.input.keyboard.createCursorKeys();

  
  //Sets up the text that will display the winner. It changes the colour to match the winner's colour
  //and displays their unique ID.
  this.socket.on('winnerUpdate', function (winner) {
    self.winnerText.setPosition(200,16);
    self.winnerText.setColor('#'+winner.colour);
    self.winnerText.setText('The Winner Was ' + winner.id);
  });

  //The Clock Timer from the server.
  this.socket.on('timerUpdate', function (clockTimer) {
    self.timerText.setText('Timer: ' + clockTimer);
  });

  //The round is over, time to delete all the current paint splats and clear the screen for the next round.
  this.socket.on('clearUP', function (numSplats) {
    for(i in splatData)
    {
      if(splatData[i])
      {
        splatData[i].destroy();
      }
    }
    for (var member in splatData) delete splatData[member];
  });
  
//Draw the paints splats that hit the target board alongside the targetboard.
  this.socket.on('targetLocation', function (targetLocation,paintSplats,numSplats) {
    self.target.setPosition(targetLocation.x, targetLocation.y);
    for(i = 0; i < numSplats; i++)
    {
      if(splatData[i])
      {
        splatData[i].setPosition(targetLocation.x + paintSplats[i].x, targetLocation.y+ paintSplats[i].y);
      }
      else
      {
        splatData[i] = self.physics.add.image(targetLocation.x + paintSplats[i].x, targetLocation.y+ paintSplats[i].y, 'splat').setOrigin(0.5, 0.5).setDisplaySize(20, 20);
        splatData[i].setTint('0x'+paintSplats[i].playerColour);
      }

    }
  });

  //Button inputs. Clicking and holding will have the player keep moving.
  //Leaving the onscreen button or releasing the click will have them slowly stop.
  upButton = this.physics.add.image(controlCentreX+75, controlCentreY-75, 'circleButton').setOrigin(0.0, 0.0).setDisplaySize(75, 75).setInteractive();
  upButton.on('pointerdown', function (event) {
    upState = true;
  });
  upButton.on('pointerup', function (event) {
    upState = false;
  });
  upButton.on('pointerout', function (event) {
    upState = false;
  });

  //This is done for each button in turn. 
  downButton = this.physics.add.image(controlCentreX+75, controlCentreY+75, 'circleButton').setOrigin(0.0, 0.0).setDisplaySize(75, 75).setInteractive();
  downButton.on('pointerdown', function (event) {
    downState = true;
  });
  downButton.on('pointerup', function (event) {
    downState = false;
  });
  downButton.on('pointerout', function (event) {
    downState = false;
  });
  //This is done for each button in turn. 
  rightButton = this.physics.add.image(controlCentreX+150, controlCentreY, 'circleButton').setOrigin(0.0, 0.0).setDisplaySize(75, 75).setInteractive();
  rightButton.on('pointerdown', function (event) {
    rightState = true;
  });
  rightButton.on('pointerup', function (event) {
    rightState = false;
  });
  rightButton.on('pointerout', function (event) {
    rightState = false;
  });
  //This is done for each button in turn. 
  leftButton = this.physics.add.image(controlCentreX,controlCentreY, 'circleButton').setOrigin(0.0, 0.0).setDisplaySize(75, 75).setInteractive();
  leftButton.on('pointerdown', function (event) {
    leftState = true;
  });
  leftButton.on('pointerup', function (event) {
    leftState = false;
  });
  leftButton.on('pointerout', function (event) {
    leftState = false;
  });

  //The fire button is different because the player is supposed to only be able to use it once per click.
  fireButton = this.physics.add.image(controlCentreX-100,controlCentreY, 'rectButton').setOrigin(0.0, 0.0).setDisplaySize(100, 75).setInteractive();
  fireButton.on('pointerdown', function (event) {
    self.socket.emit('playerFiring', { x: self.ship.x, y: self.ship.y, playerId: self.id});
  });
}

//Add a player sprite, colours it and sets it's physics details.
function addPlayer(self, playerInfo,playerID) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'player').setOrigin(0.5, 0.5).setDisplaySize(50, 40);
  self.colour = playerInfo.colour;
  self.ship.setTint('0x'+self.colour);

  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
  self.id = playerID;
  
}

//add the other players sprites and colours them.
function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  otherPlayer.setTint("0x"+ playerInfo.colour);
  otherPlayer.playerColour = playerInfo.colour;
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}



function update() {
  if (this.ship) {

    //Moves the players if they are pressing a button.
    if(upState)
    {
      this.physics.velocityFromAngle(-90, 100, this.ship.body.acceleration);
    }
    else if(downState)
    {
      this.physics.velocityFromAngle(90, 100, this.ship.body.acceleration);
    }
    else if(rightState)
    {
      this.physics.velocityFromAngle(0, 100, this.ship.body.acceleration);
    }
    else if(leftState)
    {
      this.physics.velocityFromAngle(-180, 100, this.ship.body.acceleration);
    }
    else
    {
      //stops the player from accelerating if they are not pressing a button. stopping them after a bit
      this.ship.setAcceleration(0);
    }

    //Keep Player In bounds
    if(this.ship.x > 800)
    {
      this.ship.x = 795;
      this.ship.setAcceleration(0);
    }
    else if(this.ship.x < 0)
    {
      this.ship.x = 5;
      this.ship.setAcceleration(0);
    }
    if(this.ship.y > 600)
    {
      this.ship.y = 595;
      this.ship.setAcceleration(0);
    }
    else if(this.ship.y < 0)
    {
      this.ship.y = 5;
      this.ship.setAcceleration(0);
    }

    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
    }
    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }
}
