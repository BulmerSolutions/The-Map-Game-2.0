const path = require('path');
const fs = require('fs');

class Store {

    constructor() {
        this.path = path.join(__dirname, '../config.json');     // Path to Config.JSON
        this.data = this.parseDataFile(this.path);              // Data stored in JSON file
    }
    
    /**
     * @description Grab any value by its name.
     * @param {String} key The name of the value you want to grab
     * @returns {any} Returns the value requested
     */
    get(key) {
        // reload data before grabbing key...
        // other instances may have saved data that another may not have internally
        // this happens often...
        this.reload();
        // grab key and send it back.
        return this.data[key];
    }
    
    /**
     * @description Set data
     * @param {String} key The name to store for the give value.
     * @param {any} val The value to store.
     */
    set(key, val) {
        // reload data before setting key...
        this.reload();
        // Now set the key.
        this.data[key] = val;
        this.saveFile();
    }

    /**
     * @description Parse the config file
     * @param {String} filePath The path to the file.
     * @param {JSON} defaults Custom set default settings.
     * @returns {JSON} Returns the default settings for the app. 
     */
    parseDataFile(filePath) {
        try {
            return JSON.parse(fs.readFileSync(filePath));
        } catch (error) {

            let defaults = {
                "port": 80,
                "host": "0.0.0.0",
                "mysql": {
                    "host": "",
                    "database": "",
                    "user": "",
                    "password": ""
                }
            }

            fs.writeFileSync(filePath, JSON.stringify(defaults));
            return defaults;
        }
    }

    /**
     * @description Saves new data to file.
     */
    saveFile() {
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }

    /**
     * @description Re-grabs the config file 
     */
    reload() {
        this.data = this.parseDataFile(this.path);
    }
}

module.exports = Store;