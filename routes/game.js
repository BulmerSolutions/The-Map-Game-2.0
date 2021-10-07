"use strict";
var express = require("express");
var router = express.Router();
var path = require("path");
var fs = require("fs");
var Store = require("../modules/store");

const mapping = {
  fill: {
    type: 0,
    args: ["x", "y", "r", "g", "b", "a", "tolerance"],
  },
  pen: {
    type: 1,
    args: ["x0", "y0", "x1", "y1", "r", "g", "b", "a"],
  },
  undo: {
    type: 2,
    args: [],
  },
  text: {
    type: 3,
    args: ["x", "y", "text"],
  },
};

/* GET page to enter game pin */
router.get("/", function (req, res) {
  res.render("game/join", { title: "The Map Game" });
});

/* POST page to enter game pin */
router.post("/", function (req, res) {
  res.render("game/join", { title: "The Map Game" });
});

/* GET game and chack session for game session code */
router.get("/:pin", function (req, res) {
  let pin = req.params.pin;

  let game = new Store("../servers/game-" + req.params.pin + ".json", {
    players: {},
    stack: [],
    id: pin,
  });

  res.render("game/game", { title: "The Map Game" });
  //res.send('Game pin is: ' + req.params.pin);

  // Create Socket IO connections here
  /**
   * @namespace io
   * @type {SocketIO.Server}
   * */
  let io = req.app.get("socketio");
  let serv = io.of("/" + pin);

  serv.on("connection", socket => {
    let players = game.get("players");

    if (!players[socket.id]) {
      let filename = "servers/map-" + req.params.pin + ".data";

      console.log("New Socket with ID: ", socket.id);
      socket.ip = socket.handshake.address;
      console.log("Player IP: ", socket.ip);

      players[socket.ip] = {
        id: socket.id,
      };

      game.set("players", players);

      let checkStack = () => {
        let stack = game.get("stack");
        if (stack.length > 2000) {
          game.set("stack", []);
          socket.emit("request-map");
        }
      };

      socket.on("disconnect", () => {
        console.log(`User with id: ${socket.id} disconnected.`);
        delete players[socket.id];
      });

      socket.on("request-map", () => {
        if (fs.existsSync(filename)) {
          let fileRead = fs.readFile(filename, "utf8", (err, data) => {
            socket.emit("receive-map", data, game.get("stack"));
          });
        } else {
          socket.emit(
            "receive-map",
            "/maps/" + "tamriel" + ".png",
            game.get("stack")
          );
        }
      });

      socket.on("fill", data => {
        socket.broadcast.emit("fill", data);
        let { x, y, color, tolerance } = data;
        let stack = game.get("stack");
        stack.push(
          mapping.fill.type,
          x,
          y,
          color[0],
          color[1],
          color[2],
          color[3],
          tolerance,
          999
        );
        game.set("stack", stack);
        checkStack();
      });

      socket.on("pen", data => {
        socket.broadcast.emit("pen", data);
        let { x0, y0, x1, y1, color } = data;
        let stack = game.get("stack");
        stack.push(
          mapping.pen.type,
          x0,
          y0,
          x1,
          y1,
          color[0],
          color[1],
          color[2],
          color[3],
          999
        );
        game.set("stack", stack);
        checkStack();
      });

      socket.on("undo", data => {
        socket.broadcast.emit("undo", data);
        let stack = game.get("stack");
        stack.push(mapping.undo.type, 999);
        game.set("stack", stack);
        checkStack();
      });

      socket.on("text", data => {
        socket.broadcast.emit("text", data);
        let stack = game.get("stack");
        stack.push(mapping.text.type, data.msg, data.x, data.y, 999);
        game.set("stack", stack);
        checkStack();
      });

      socket.on("save-map", () => {
        game.set("stack", []);
        socket.emit("request-map");
      });

      socket.on("clear-map", () => {
        game.set("stack", []);
        socket.broadcast.emit("receive-map", "/maps/" + "tamriel" + ".png", []);
        socket.emit("receive-map", "/maps/" + "tamriel" + ".png", []);
      });

      socket.on("refresh-map", () => {
        if (fs.existsSync(filename)) {
          let fileRead = fs.readFile(filename, "utf8", (err, data) => {
            socket.emit("receive-map", data, game.get("stack"));
          });
        } else {
          socket.emit(
            "receive-map",
            "/maps/" + "tamriel" + ".png",
            game.get("stack")
          );
        }
      });

      socket.on("map-image", dataURL => {
        let fileWrite = fs.createWriteStream(filename);
        fileWrite.write(dataURL, err => {
          if (err) console.log(err);
          else {
            console.log("Map image saved.");
          }
        });
      });
    }
  });
});

/* GET game chat and chack session for game session code */
router.get("/:pin/chat", function (req, res) {
  res.send("Game pin is: " + req.params.pin);

  // Create Socket IO connections here
  let io = req.app.get("socketio");
  let socket_id = [];

  io.on("connection", socket => {
    socket_id.push(socket.id);
    if (socket_id[0] === socket.id) {
      // remove the connection listener for any subsequent
      // connections with the same ID
      io.removeAllListeners("connection");
    }

    socket.on("msg", msg => {
      console.log("just got: ", msg);
      socket.emit("chat message", "hi from server");
    });
  });
});

module.exports = router;
