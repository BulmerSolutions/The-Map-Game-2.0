'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');

var players = {};

/* GET page to enter game pin */
router.get('/', function (req, res) {
    res.render('game/join', { title: 'The Map Game' });
});

/* POST page to enter game pin */
router.post('/', function (req, res) {
    res.render('game/join', { title: 'The Map Game' });
});

/* GET game and chack session for game session code */
router.get('/:pin', function (req, res) {
    res.render('game/game', { title: 'The Map Game' });
    //res.send('Game pin is: ' + req.params.pin);

    // Create Socket IO connections here
    /**
     * @namespace io
     * @type {SocketIO}
     * */
    let io = req.app.get('socketio');

    io.on('connection', socket => {

        if (!players[socket.id]) {
            console.log(players[socket.id]);
            console.log('New Socket with ID: ', socket.id);
            socket.ip = socket.handshake.headers['x-forwarded-for'];
            console.log('Player IP: ', socket.ip);

            players[socket.id] = {
                'ip': socket.ip
            };
            
            let filename = "servers/" + req.params.pin + ".png";
            let file = fs.createReadStream(filename, {
                "encoding": "binary"
            });

            file.on('readable', () => {
                console.log('Image loading');
            });

            file.on('data', (chunk) => {
                socket.emit('image-data', chunk);
            });

            file.on('end', () => {
                console.log('Image loaded');
            });

            socket.on('disconnect', () => {
                console.log(`User with id: ${socket.id} disconnected.`);
                delete players[socket.id];
            });

            socket.on('fill', data => {
                socket.broadcast.emit('fill', data);
            });

            socket.on('pen', data => {
                socket.broadcast.emit('pen', data);
            });

            socket.on('undo', data => {
                socket.broadcast.emit('undo', data);
            });

            socket.on('text', data => {
                socket.broadcast.emit('text', data);
            });

            socket.on('map-image', function (buffer) {
                let filename = "servers/" + req.params.pin + ".png";
                let file = fs.createWriteStream(filename);
                file.write(buffer);
                file.end();
            });
        }

    });
});

/* GET game chat and chack session for game session code */
router.get('/:pin/chat', function (req, res) {
    res.send('Game pin is: ' + req.params.pin);

    // Create Socket IO connections here
    let io = req.app.get('socketio');
    let socket_id = [];

    io.on('connection', socket => {
        socket_id.push(socket.id);
        if (socket_id[0] === socket.id) {
            // remove the connection listener for any subsequent 
            // connections with the same ID
            io.removeAllListeners('connection');
        }

        socket.on('msg', msg => {
            console.log('just got: ', msg);
            socket.emit('chat message', 'hi from server');

        });

    });
});

module.exports = router;
