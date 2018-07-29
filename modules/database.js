'use strict';

const mysql = require('mysql');
const bcrypt = require('bcrypt');
const Store = require('./store');


class Database {

    /**
     * 
     * @param {Store} store Store for config settings
     */
    constructor(store) {
        this.data = store.get('mysql');
        this.isConnected = false;
        this.db;

        this.connect();
    }

    // Connect to database
    connect() {
        let self = this;
        this.db = mysql.createConnection(this.data);

        this.db.connect(function (err) {
            if (err) {
                self.isConnected = false;
                console.log("MySQL ERROR: " + err.code);
                setTimeout(self.connect, 2000);
            } else {
                if (self.data.database === "") {
                    console.log("Please enter a database in the config.json file!");
                } else {
                    console.log();
                    console.log("MySQL Connection Established");
                    self.isConnected = true;
                    self.verifyTables();
                }
            }

            self.db.on('error', function (err) {
                console.log('MySQL Error: ', err.message);
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    self.isConnected = false;
                    self.connect();
                } else {
                    throw err;
                }
            });
        });
    }

    verifyTables() {
        // POST: all tables are created and verified
        console.log();
        console.log("Checking tables...");
        console.log();
        // Create the users table
        this.db.query("CREATE TABLE IF NOT EXISTS `users` (`user_id` INT(4) NOT NULL AUTO_INCREMENT, `username` VARCHAR(21) NULL, `email` VARCHAR(255) NOT NULL, `password` VARCHAR(255) NULL, `joined` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, `google_id` VARCHAR(45) NULL, `token` VARCHAR(255) NOT NULL, PRIMARY KEY(`user_id`), UNIQUE INDEX `user_id_UNIQUE`(`user_id` ASC));", (err, result) => {
            if (err) {
                console.log("CREATE TABLE 'Users' ............ Failed");
                console.log(err.message);
                console.log();
            } else {
                console.log("TABLE 'Users' ................... Good");
                console.log();
            }
        });
    }

    /** 
     * @description Use this function to validate if the user is logged in/is the current user
     * @param {JSON} profile
     */
    async checkUser(profile) {
        // profile must include: id, user( name || email ) and token.
        return new Promise(callback => {
            profile = profile.user;
            this.db.query("SELECT * FROM users WHERE id=" + profile.id, function (err, rows, fields) {
                if (err) callback(err);
                let user = rows[0];

                if ((profile.username === user.username || profile.username === user.email) && profile.token === user.token) {
                    return callback(true);
                } else {
                    return callback(false);
                }
            });
        });
    }

    /** 
     * @description Login User
     * @param {String} username
     * @param {String} password
     * @param {Function} callback
     */
    login(username, password, callback) {
        let user;
        this.db.query("SELECT * FROM users", function (err, result) {
            if (err) throw err;
            console.log("User is connecting...");
            return callback(loginTest(username, password, result, 0));
        });
    }

    /**
     * @description Register User
     * @param {JSON} profile
     * @param {Function} callback
     */
    register(profile, callback) {
        let user;
        let db = this.db;
        this.db.query("SELECT * FROM users", function (err, result) {
            if (err) throw err;
            for (let i = 0; i < result.length; i++) {
                if (result[i].username === profile.username) {
                    return callback({
                        "err": "That username is already in use!"
                    });
                } else if (result[i].email === profile.email) {
                    return callback({
                        "err": "That email is already in use!"
                    });
                }
            }

            // Generate Token
            let passHash = 0;
            let divide = 0;
            let token = "";

            for (let i = 0; i < profile.password.length; i++) {
                passHash += profile.password.charCodeAt(i);
            }

            divide = Math.ceil(passHash / 21);

            while (passHash > divide) {
                let letter = String.fromCharCode(48 + passHash % 74);
                token += letter;
                passHash -= divide;
            }

            token = bcrypt.hashSync(token, passHash % 21);

            // Save user to database

            bcrypt.hash(profile.password, 10, function (err, hash) {
                db.query("INSERT INTO users (username, email, password, token) VALUES ('" + profile.username + "', '" + profile.email + "', '" + hash + "', '" + token + "' )", (err, rows, field) => {
                    let id = rows.insertId;

                    profile.token = token;
                    profile.id = id;

                    return callback({
                        "result": profile,
                        "err": ""
                    });
                });
            });
        });
    }

}


/** 
 * @description Login User Recursively
 * @param {String} username
 * @param {String} password
 * @param {Array} users
 * @param {Number} seek
 */
const loginTest = (username, password, users, seek) => {
    if (seek < users.length) {
        if (users[seek].username === username || users[seek].email === username) {
            if (bcrypt.compareSync(password, users[seek].password)) {
                // log data
                let date = new Date();
                console.log(users[seek].name_first + " " + users[seek].name_last + " (" + username + ") logged in at " + date);
                // send data back
                return { err: "", result: users[seek] };
            } else {
                return { err: "Invalid Password!" };
            }
        } else {
            return loginTest(username, password, users, seek + 1);
        }
    } else {
        return { err: 'There is no user named ' + username + '!' };
    }
};

module.exports = Database;