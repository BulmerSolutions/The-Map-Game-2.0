'use strict';
var express = require('express');
var router = express.Router();

/* GET page to enter game pin */
router.get('/', function (req, res) {
    res.render('gameLogin', { title: 'The Map Game' });
});

/* GET game and chack session for game session code */
router.get('/:pin', function (req, res) {
    res.send('Game pin is: ' + req.params.pin);

    // Create Socket IO connections here
    let io = req.app.get('socketio');
});

module.exports = router;
