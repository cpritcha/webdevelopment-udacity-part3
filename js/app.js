var Board = function() {
  var width = 505,
      height = 606;

  this.numTilesX = 5;
  this.numTilesY = 6;
  this.topPadding = 72;
  this.tileHeight = 83;
  this.tileWidth = 101;

  this.maxX = this.posX(this.numTilesX + 1);
  this.minX = this.posX(-1);
  this.maxY = this.posY(this.numTilesY);
  this.minY = this.posY(0);
}

// Convert from board position to absolute position
Board.prototype.posX = function(tileX) {
  return Math.ceil(tileX * this.tileWidth);
}

Board.prototype.posY = function(tileY) {
  return Math.ceil((tileY - 1) * this.tileHeight + this.topPadding);
}

Board.prototype.leftX = function(unit) {
  return unit.tileX + unit.leftX;
}

Board.prototype.rightX = function(unit) {
  return unit.tileX + unit.rightX;
}

// A player and enemy intersect if their bounding boxes intersect
Board.prototype.checkCollision = function(player, enemy) {
  return player.tileY === enemy.tileY &&
         this.leftX(player)  < this.rightX(enemy) &&
         this.rightX(player) > this.leftX(enemy);
}

Board.prototype.checkCollisions = function(player, allEnemies) {
  for (var i=0; i < allEnemies.length; i++) {
    if (this.checkCollision(player, allEnemies[i])) {
      return true;
    }
  }
  return false;
}

Board.prototype.inside = function(pos) {
  var tileX = pos[0],
      tileY = pos[1];
  return (tileX < this.numTilesX) &&
         (tileX >= 0) &&
         (tileY < this.numTilesY) &&
         (tileY >= 0);
}

Board.prototype.render = function() {
  var rowImages = [
          'images/water-block.png',   // Top row is water
          'images/stone-block.png',   // Row 1 of 3 of stone
          'images/stone-block.png',   // Row 2 of 3 of stone
          'images/stone-block.png',   // Row 3 of 3 of stone
          'images/grass-block.png',   // Row 1 of 2 of grass
          'images/grass-block.png'    // Row 2 of 2 of grass
      ];

  /* Loop through the number of rows and columns we've defined above
   * and, using the rowImages array, draw the correct image for that
   * portion of the "grid"
   */
  for (var i = 0; i < this.numTilesY; i++) {
      for (var j = 0; j < this.numTilesX; j++) {
          /* The drawImage function of the canvas' context element
           * requires 3 parameters: the image to draw, the x coordinate
           * to start drawing and the y coordinate to start drawing.
           * We're using our Resources helpers to refer to our images
           * so that we get the benefits of caching these images, since
           * we're using them over and over.
           */
          ctx.drawImage(Resources.get(rowImages[i]), j * 101, i * 83);
      }
  }
}

// Enemies our player must avoid
var Enemy = function(tileX, tileY, speed) {
  // Variables applied to each of our instances go here,
  // we've provided one for you to get started
  this.tileX = tileX;
  this.tileY = tileY;

  // The image/sprite for our enemies, this uses
  // a helper we've provided to easily load images
  this.speed = speed || 1.0;
  this.sprite = 'images/enemy-bug.png';

  this.leftX = 0.05;
  this.rightX = 0.95;
};


// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.candidateTileX = function(dt) {
  // You should multiply any movement by the dt parameter
  // which will ensure the game runs at the same speed for
  // all computers.
  return this.tileX + this.speed*dt;
};

Object.defineProperty(Enemy.prototype, "pos", {
  get: function() {
    return [this.tileX, this.tileY];
  }
})

var Player = function(tileX, tileY) {
  this.tileX = tileX;
  this.tileY = tileY;

  this.sprite = 'images/char-boy.png';
  this.leftX = 0.35;
  this.rightX = 0.65;
};

Player.prototype.die = function() {
  this.sprite = 'images/char-boy-dead.png';
}

Player.prototype.revive = function() {
  this.sprite = 'images/char-boy.png';
}

Player.prototype.candidatePos = function(direction) {
  switch (direction) {
    case Actions.LEFT:
      return [this.tileX - 1, this.tileY];
    case Actions.RIGHT:
      return [this.tileX + 1, this.tileY];
    case Actions.UP:
      return [this.tileX, this.tileY - 1];
    case Actions.DOWN:
      return [this.tileX, this.tileY + 1];
  }
};

Object.defineProperty(Player.prototype, "pos", {
  get: function() {
    return [this.tileX, this.tileY];
  },
  set: function(pos) {
    this.tileX = pos[0];
    this.tileY = pos[1];
  }
})

var States = {
  BEGUN: 0,
  RUN: 1,
  PAUSED: 2,
  WON: 3,
  LOST: 4
}

var Actions = {
  NOOP: 0,
  START: 83,
  PAUSE: 80,
  LEFT: 37,
  RIGHT: 39,
  UP: 38,
  DOWN: 40
}

var Game = function(player, allEnemies, board) {
  this.player = player;
  this.allEnemies = allEnemies;
  this.board = board;
  this.level = 1;
  this.state = States.BEGUN;
  this.action = Actions.NOOP;
}

Game.prototype.handleInput = function(action) {
  this.action = action;
};

// Difficulty
Game.prototype.set_difficulty = function() {
  var self = this;
  this.allEnemies.forEach(function(enemy) {
    // Enemies move each level won
    enemy.speed = 2 * Math.sqrt(self.level);
  });
}

// Helpers
Game.prototype.direction = function() {
  if (this.state === States.RUN) {
    if (this.action >= Actions.LEFT && this.action <= Actions.DOWN) {
      return this.action;
    }
  }
  return null;
}

Game.prototype.haswon = function() {
  return this.player.tileY === 0;
}

Game.prototype.reset = function() {
  var self = this;

  this.allEnemies.forEach(function(enemy) {
    enemy.tileX = Math.random() * self.board.numTilesX;
  });
  this.set_difficulty();
  this.player.pos = [2,5];
  this.player.revive();
}

// Updates
Game.prototype._unit_position_update = function(dt) {
  if (this.board.checkCollisions(this.player, this.allEnemies)) {
    this.player.die();
    this.state = States.LOST;
    this.level = 1;
  };
  var direction = this.direction();
  if (direction) {
    var playerPos = this.player.candidatePos(direction);
    if (this.board.inside(playerPos)) {
      this.player.pos = playerPos;
    }
  }
  this.allEnemies.forEach(function(enemy) {
    var tileX = enemy.candidateTileX(dt);
    if (this.board.posX(tileX) > this.board.maxX) {
      enemy.tileX = -1;
    } else {
      enemy.tileX = tileX;
    }
  })
}

Game.prototype._begun_update = function(level) {
  if (this.action === Actions.START) {
    this.state = States.RUN;
  }
}

Game.prototype._run_update = function(dt) {
  if (this.haswon()) {
    this.level += 1;
    this.state = States.WON;
  } else if (this.action === Actions.PAUSE) {
    this.state = States.PAUSED;
  } else {
    this._unit_position_update(dt);
  }
}

Game.prototype._paused_update = function() {
  if (this.action === Actions.START) {
    this.state = States.RUN;
  }
}

Game.prototype._won_update = function() {
  if (this.action === Actions.START) {
    this.reset();
    this.state = States.BEGUN;
  }
}

Game.prototype._lost_update = function() {
  if (this.action === Actions.START) {
    this.reset();
    this.state = States.BEGUN;
  }
}

Game.prototype.update = function(dt) {
  switch (this.state) {
    case States.BEGUN:
      this._begun_update();
      break;
    case States.RUN:
      this._run_update(dt);
      break;
    case States.PAUSED:
      this._paused_update();
      break;
    case States.WON:
      this._won_update();
      break;
    case States.LOST:
      this._lost_update();
      break;
  }
  this.action = Actions.NOOP;
}

Game.prototype._display_message = function(topText, bottomText) {
  var centerX = (this.board.minX + this.board.maxX)/2,
      rangeY = (this.board.maxY - this.board.minY),
      centerY = this.board.minY + 0.3 * rangeY;

  ctx.font = "36pt sans-serif";
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'white';
  ctx.textAlign = "center";

  ctx.fillText(topText, centerX, centerY);
  ctx.strokeText(topText, centerX, centerY);

  centerY = this.board.minY + 1.1 * rangeY;

  ctx.fillText(bottomText, centerX, centerY);
  ctx.strokeText(bottomText, centerX, centerY);
}

Game.prototype._base_render = function() {
  this.board.render();
  ctx.drawImage(Resources.get(this.player.sprite),
                              this.board.posX(this.player.tileX),
                              this.board.posY(this.player.tileY));
  var self = this;
  allEnemies.forEach(function(enemy) {
    ctx.drawImage(Resources.get(enemy.sprite),
                                self.board.posX(enemy.tileX),
                                self.board.posY(enemy.tileY));
  })
}

Game.prototype._begun_render = function() {
  this._display_message("Level " + this.level,
                        "Press 's' to begin");
}

Game.prototype._paused_render = function() {
  this._display_message("Paused",
                        "Press 's' to continue");
}

Game.prototype._won_render = function() {
  this._display_message("You won level " + (this.level - 1) + "!",
                        "Press 's' to continue");
}

Game.prototype._lost_render = function() {
  this._display_message("You lost", "Press 's' to restart")
}

Game.prototype.render = function() {
  this._base_render();
  switch (this.state) {
    case States.BEGUN:
      this._begun_render();
      break;
    case States.RUN:
      break;
    case States.PAUSED:
      this._paused_render();
      break;
    case States.WON:
      this._won_render();
      break;
    case States.LOST:
      this._lost_render();
      break;
  }
}

var board = new Board();
var allEnemies = [1,1,2,3].map(function(tileY) {
  return new Enemy(Math.random() * board.numTilesX, tileY);
});
var player = new Player(2, 5);
var game = new Game(player, allEnemies, board);

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function(e) {
    game.handleInput(e.keyCode);
});
