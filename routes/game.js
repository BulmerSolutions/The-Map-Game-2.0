'use strict';
var express = require('express');
var router = express.Router();

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
    let io = req.app.get('socketio');
    let socket_id = [];

    io.on('connection', socket => {
        socket_id.push(socket.id);
        if (socket_id[0] === socket.id) {
            // remove the connection listener for any subsequent 
            // connections with the same ID
            io.removeAllListeners('connection');
        }

        socket.on('draw', data => {
            console.log('Draw data: ', data);
            socket.emit('draw', data);

        });

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
