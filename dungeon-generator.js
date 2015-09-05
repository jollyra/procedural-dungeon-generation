var initCanvas = function (containerDiv) {
  "use strict";
  var CANVAS_WIDTH = 980;
  var CANVAS_HEIGHT = 720;

  function initCanvasInternal() {
    var canvas = $("<canvas width='" + CANVAS_WIDTH + "' height='" + CANVAS_HEIGHT + "'></canvas>");
    var ctx = canvas.get(0).getContext("2d");
    canvas.appendTo($(containerDiv));
    return ctx;
  }

  return initCanvasInternal();
};

var graphicsConstructor = function (containerDiv) {
  "use strict";
  var graphics = {
    drawTile: function (x, y, colour) {
      var tile_w = 10;
      var tile_h = 10;
      var TILES = {
        0: "#333300",  // Rock
        1: "#1b85b8",
        2: "#c8cb77",
        3: "#559e83",
        4: "#ae5a41",
        5: "#c3cb71"
      };
      // Draw a border around each tile.
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(x * tile_w, y * tile_h, tile_w, tile_h);
      // Draw the tile over the border tile.
      if (colour === 0) {
        this.ctx.fillStyle = TILES[colour];
      } else if (colour === 1001 || colour === 9999) {  // Debugging
        this.ctx.fillStyle = "#cdc9c9";
      } else {
        this.ctx.fillStyle = TILES[(colour % 5) + 1];
      }
      this.ctx.fillRect(x * tile_w + 1, y * tile_h - 1, tile_w - 1, tile_h - 1);
    }
  };

  var newGraphics = Object.create(graphics);
  newGraphics.ctx = initCanvas(containerDiv);
  return newGraphics;
};

var worldConstructor = function (containerDiv, xsize, ysize) {
  "use strict";
  var stage = initStage(xsize, ysize);

  function x_max() {
    if (stage && stage[0]) {
      return stage[0].length;
    } else {
      throw new Error('Where\'s my GODDAMN array? _stage = ', stage);
    }
  }

  function y_max() {
    if (stage) {
      return stage.length;
    } else {
      throw new Error('Where\'s my GODDAMN array? _stage = ', stage);
    }
  }

  function initStage(x, y) {
    var stage =  new Array(y);
    for(var i = 0; i < y; i++) {
      stage[i] = [];
      for(var j = 0; j < y; j++) {
        stage[i].push(0);
      }
    }
    return stage;
  }

  // Public
  var world = {
      getTile: function (x, y) {
      if (this.stage[y] === undefined || this.stage[y][x] === undefined) {
        return false;
      } else {
        return this.stage[y][x];
      }
    },

    render: function () {
      for(var y = 0; y < this.y_max; y++) {
        for(var x = 0; x < this.x_max; x++) {
          var tile = this.stage[y][x];
          this.graphics.drawTile(x, y, tile);
        }
      }
    }
  };

  var newWorld = Object.create(world);
  newWorld.y_max = y_max();
  newWorld.x_max = x_max();
  newWorld.stage = stage;
  newWorld.graphics = graphicsConstructor(containerDiv);
  return newWorld;
};

var roomBuilderConstructor = function (world, attempts) {
  "use strict";

  var roomBuilder = {
    digRoom: function (world, room) {
      for(var y = room.y; y <= room.y + room.h; y++) {
        for(var x = room.x; x <= room.x + room.w; x++) {
          world.stage[y][x] = room.colour;
        }
      }
    },

    checkRoomCollisions: function (world, room) {
      var roomWithPadding = {};
      roomWithPadding.x = room.x;
      roomWithPadding.y = room.y;
      roomWithPadding.h = room.h;
      roomWithPadding.w = room.w;
      for(var y = roomWithPadding.y; y <= roomWithPadding.y + roomWithPadding.h; y++) {
        for(var x = roomWithPadding.x; x <= roomWithPadding.x + roomWithPadding.w; x++) {
          if(x >= world.x_max || y >= world.y_max) {
            throw new Error('Oi! That\'s out of bounds!', x, y);
          }
          if (world.stage[y][x] !== 0) {
            return true;
          }
        }
      }
      return false;
    },

    randomRoom: function (world) {
      var MAX_WIDTH = 15; // if odd will use the previous even number
      var MAX_HEIGHT = 15;
      var MIN_WIDTH = 3;
      var MIN_HEIGHT = 3;
      var h = evenize(_.random(MIN_HEIGHT, MAX_HEIGHT));
      var w = evenize(_.random(MIN_WIDTH, MAX_WIDTH));
      var x = oddRng(1, world.x_max - w - 1);
      var y = oddRng(1, world.y_max - h - 1);
      var room = { h: h, w: w, x: x, y: y };
      if (x + w >= world.x_max || y + h >= world.y_max) {
        throw new Error('Oi! That room is too big.', room);
      }
      return room;
    },

    placeRoom: function () {
      var room = this.randomRoom(this.world);
      if (this.checkRoomCollisions(this.world, room) === false) {
        room.colour = colourGenerator.next();
        this.digRoom(this.world, room);
        this.rooms.push(room);
        return true;
      }
      return false;
    },

    update: function () {
      while (this.attempts > 0) {
        this.attempts = this.attempts - 1;
        var wasSuccessful = this.placeRoom();
        if (wasSuccessful === true) {
          return false;  // Not done yet
        }
      }
      return true;  // Now we're done
    },

    animate: function () {
      var that = this;
      var done;
      function timeout() {
        setTimeout(function () {
          done = that.update();
          that.world.render();
          if (!done) {
            timeout();
          }
        }, 0);
      }
      timeout();
    },

    quickRender: function () {
      var that = this;
      var done;
      while (!done) {
        done = that.update();
      }
      that.world.render();
    }
  };

  var newRoomBuilder = Object.create(roomBuilder);
  newRoomBuilder.world = world;
  newRoomBuilder.attempts = attempts;
  newRoomBuilder.rooms = [];
  return newRoomBuilder;
};


function findStartingTile(world) {
  'use strict';
  for (var y = 0; y < world.y_max; y++) {
    for (var x = 0; x < world.x_max; x++) {
      var valid = true;
      _.forEach(calculateAdjacentTiles(x, y), function (tile) {
        if (world.getTile(tile.x, tile.y) !== 0) {
          valid = false;
        }
      });
      if (valid === true) {
        return {x: x, y: y};
      }
    }
  }
}

function passageCarver(world, x0, y0) {
  'use strict';
  var stack = [];
  stack.push({x: x0, y: y0});
  var colour = colourGenerator.next();

  function delveDeeper() {
    if (stack.length > 0) {
      var tile = stack.pop();
      if (canDig(world, tile.x, tile.y) === false) {
        return false;
      }
      world.stage[tile.y][tile.x] = colour;
      _.forEach(_.shuffle([pushRight, pushLeft, pushUp, pushDown]), function (direction) {
        direction(tile.x, tile.y);
      });
      return false;
    } else {  // Send a signal to the game loop to stop
      return true;
    }
  }

  function pushRight(x, y) {
    if (canDig(world, x + 1, y)) {
      stack.push({x: x + 1, y: y});
    }
  }

  function pushLeft(x, y) {
    if (canDig(world, x - 1, y)) {
      stack.push({x: x - 1, y: y});
    }
  }

  function pushUp(x, y) {
    if (canDig(world, x, y - 1)) {
      stack.push({x: x, y: y - 1});
    }
  }

  function pushDown(x, y) {
    if (canDig(world, x, y + 1)) {
      stack.push({x: x, y: y + 1});
    }
  }

  function animate() {
    function timeout() {
      var done;
      setTimeout(function () {
        done = delveDeeper();
        world.render();
        if (!done) {
          timeout();
        }
      }, 0);
    }
    timeout();
  }

  function quickRender() {
    var done;
    while (!done) {
      done = delveDeeper();
    }
    world.render();
  }

  //animate();
  quickRender();
}

// Return the starting points of all passages created
function carvePassages(world) {
  var passages = [];
  function fn() {
    var tile = findStartingTile(world);
    if (tile) {
      passageCarver(world, tile.x, tile.y);
      tile.colour = world.stage[tile.y][tile.x];
      passages.push(tile);
      fn(world);
    }
  } fn(world);
  return passages;
}

function canDig(world, x, y) {
  if (world.stage[y] === undefined || world.stage[y][x] === undefined) {
    return false;
  }
  var adjacentStructures = 0;
  var adjacentTiles = calculateAdjacentTiles(x, y);
  _.forEach(adjacentTiles, function (tile) {
    if (world.getTile(tile.x, tile.y) > 0) {  // Can't be adjacent to anything other that rock
      adjacentStructures = adjacentStructures + 1;
    }
  });
  return adjacentStructures <= 2;  // A passage can connect to itself (of course)
}

function calculateAdjacentTiles(x0, y0) {
  'use strict';
  var tiles = [];
  for (var x = x0 - 1; x <= x0 + 1; x++) {
    for (var y = y0 - 1; y <= y0 + 1; y++) {
      tiles.push({x: x, y: y});
    }
  }
  return tiles;
}

function connectDungeon(world, rooms) {
  var connectors = findAllConnectors(world);
  // Place all connectors in the dungeon
  _.each(connectors, function (connector) {
    world.stage[connector.y][connector.x] = 1001;
  });
  // Remove connectors until we have an MSP
  connectors = _.shuffle(connectors);
  var connector;
  var connectedRegions = floodFill(world, connectors[connectors.length - 1]);
  while(connectors.length > 0) {
    connector = connectors.pop();
    world.stage[connector.y][connector.x] = 0;
    if (floodFill(world, { x: rooms[0].x, y: rooms[0].y }) < connectedRegions) {
      // This means we need this connector - add it back
      world.stage[connector.y][connector.x] = 1001;
    }
    world.render();
  }
}

function findAllConnectors(world) {
  'use strict';
  var connectors = [];
  for (var y = 0; y < world.y_max; y++) {
    for (var x = 0; x < world.x_max; x++) {
      if (world.getTile(x, y) === 0) {
        var w = world.getTile(x - 1, y) || 0;
        var e = world.getTile(x + 1, y) || 0;
        if (w !== 0 && e !== 0 && w !== e) {
          connectors.push({x: x, y: y});
        }
        var n = world.getTile(x, y - 1) || 0;
        var s = world.getTile(x, y + 1) || 0;
        if (n !== 0 && s !== 0 && n !== s) {
          connectors.push({x: x, y: y});
        }
      }
    }
  }
  return connectors;
}

function floodFill(world, startingTile, options) {
  'use strict';
  var nodesTraversed = [];
  var stack = [startingTile];
  var clone = _.cloneDeep(world.stage);
  while (stack.length > 0) {
    var tile = stack.pop();
    clone[tile.y][tile.x] = 'visited';
    if (options && options.colourIn) {
      world.stage[tile.y][tile.x] = 9999;
    }
    _.forEach([
        {x: tile.x + 1, y: tile.y},
        {x: tile.x - 1, y: tile.y},
        {x: tile.x, y: tile.y + 1},
        {x: tile.x, y: tile.y - 1}
    ], function (t) {
      if (clone[t.y] && clone[t.y][t.x] !== 'visited' && (clone[t.y] && clone[t.y][t.x] > 0 || clone[t.y] && clone[t.y][t.x] === 1001)) {
        if (world.getTile(t.x, t.y) !== 1001) {
          nodesTraversed = _.union(nodesTraversed, [world.getTile(t.x, t.y)]);
        }
        stack.push(t);
      }
    });
  }
  return nodesTraversed.length;
}

function makeGraphSparse(world) {
  var deadEnds = [];
  for (var y = 0; y < world.y_max; y++) {
    for (var x = 0; x < world.x_max; x++) {
      if (world.getTile(x, y) > 0 && isDeadEnd(world, {x: x, y: y})) {
        deadEnds.push({x: x, y: y});
      }
    }
  }

	if (deadEnds.length > 0) {
		_.forEach(deadEnds, function (tile) {
			world.stage[tile.y][tile.x] = 0;
		});
		makeGraphSparse(world);
	}
}

// Return true if a tile is a deadend. Tiles are
// deadends if there are 3 adjacent stone tiles.
function isDeadEnd(world, tile) {
  var adjacentStoneTiles = 0;
  _.forEach([
      {x: tile.x + 1, y: tile.y},
      {x: tile.x - 1, y: tile.y},
      {x: tile.x, y: tile.y + 1},
      {x: tile.x, y: tile.y - 1}
  ], function (t) {
    if (world.getTile(t.x, t.y) === 0 || world.getTile(t.x, t.y) === false) {
      adjacentStoneTiles++;
    }
  });
  return adjacentStoneTiles >= 3;
}

function oddRng(min, max) {
  'use strict';
	var rn = _.random(min, max);
	if (rn % 2 === 0) {
		if (rn === max) {
			rn = rn - 1;
		} else if (rn === min) {
			rn = rn + 1;
		} else {
			var adjustment = _.random(1,2) === 2 ? 1 : -1;
			rn = rn + adjustment;
		}
	}
	return rn;
}

function evenize(x) {
	if (x === 0) { return x; }
	return _.floor(x / 2) * 2;
}

var colourGenerator = {
	count: 0,
  colours: [],
	next: function () {
		this.count++;
    this.colours.push(this.count);
		return this.count;
	}
};

window.dungeonGenerator = {
  defaults: {
    size_x: 40,
    size_y: 40,
    roomTries: 20,
    windyness: 0,
    connectedness: 0,
    deadendedness: 0
  },
  generate: function (containerDiv, options) {
    options = options ? options : this.defaults;
    var world = worldConstructor(containerDiv, options.size_x, options.size_y);
    var roomBuilder = roomBuilderConstructor(world, options.roomTries);
    roomBuilder.quickRender();
    world.passages = carvePassages(world);
    connectDungeon(world, roomBuilder.rooms);
    world.render();
    makeGraphSparse(world);
    world.render();
  }
};