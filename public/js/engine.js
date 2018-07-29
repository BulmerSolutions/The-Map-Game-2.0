class Engine {

    /**
     * 
     * @param {JSON} opts Game data sent over by server
     */
    constructor(opts) {
        this.version = '0.1.0';

        this.player = new Player(opts.player);
        this.whiteboard = new Whiteboard(this, this.player);
        this.map = new GameMap(this, opts.map.points);

        this.draggables = {};

        // create engine variables
        this.side = {
            screen: null,
            toggle: function (tab) {
                if (this.screen !== null) {
                    let prevBtn = document.getElementById(this.screen + '-btn');
                    let prevScreen = document.getElementById(this.screen);

                    prevBtn.style.boxShadow = "none";
                    prevScreen.style.display = "none";
                }

                let nextBtn = document.getElementById(tab + '-btn');
                let nextScreen = document.getElementById(tab);

                nextBtn.style.boxShadow = "inset 0px 0px 2px 2px rgba(0,0,0,.075)";
                nextScreen.style.display = "block";

                this.screen = tab;
            }
        };

        // Run init to setup game
        this.init();
    }

    init() {
        // to get the `this` object functions
        let self = this;

        // Add image to map
        let img = new Image();

        img.addEventListener('load', () => {
            let diff = img.naturalHeight / 432;

            console.log(img.width / diff, img.naturalWidth);
            this.map.canvas.style.backgroundImage = "url(/maps/" + "tamriel" + ".png)";
            this.map.canvas.style.width = Math.floor(img.width / diff) + "px";
        });

        img.src = "/maps/" + "tamriel" + ".png";

        // Create draggables
        this.draggables['map'] = new Draggable('map', 10, window.innerHeight - 442, this, true);

        // toggle side
        this.side.toggle('info');

        //if (this.host && player.isHost === true) {
        //    this.host.loadTools();
        //} else {
            this.map.canvas.addEventListener('click', function (e) {
                e.preventDefault();
                let p;
                for (p = 0; p < self.map.points.sections.length; p++) {
                    let pos = self.getPos(e, self.map.canvas);
                    let place = self.map.points.sections[p];
                    self.map.detectPoly(place['area'], pos.x, pos.y, place['name']);
                }
            });
            this.map.canvas.addEventListener('mousemove', function (e) {
                let p;
                for (p = 0; p < self.map.points.sections.length; p++) {
                    let pos = self.getPos(e, self.map.canvas);
                    let place = self.map.points.sections[p];
                    let check = self.map.detectPoly(place['area'], pos.x, pos.y, place['name'], false);
                    if (check !== "none") {
                        return self.map.canvas.style.cursor = "pointer";
                    }
                }
                self.map.canvas.style.cursor = "default";
            });
        //}
    }

    /**
     * @param {Engine} game Game class
     * @param {JSON} info Territory information
     */
    setInfo(info) {
        this.side.toggle('info');
        document.getElementById('info_title').innerText = info.title;
        document.getElementById('info_owner').innerText = info.owner;
        document.getElementById('info_population').innerText = info.population;
        document.getElementById('info_military').innerText = info.military;
        document.getElementById('info_food').innerText = info.food;
    }

    /**
     * 
     * @param {MouseEvent} e Mouse event
     * @param {Element} target Element to get value from
     * @returns {{'x': Number, 'y': Number}} Returns position of mouse relative to target element
     */
    getPos(e, target) {
        let x;
        let y;
        if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        } else {
            x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        x -= target.offsetLeft;
        y -= target.offsetTop;
        let pos = {};
        pos.x = x;
        pos.y = y;
        return pos;
    }
}

class GameMap {
    constructor(game, points) {
        this.game = game;
        this.canvas = document.getElementById('map');
        this.context = document.getElementById('map').getContext('2d');
        this.points = points;
    }

    /**
     * @param {[Number, Number]} verts An array of verticies
     * @param {Number} testx X testing value
     * @param {Number} testy Y testing value
     * @param {String} name Name of territory
     * @param {Boolean} set Auto set the territor info
     */
    detectPoly(verts, testx, testy, name, set) {
        let vertx = [];
        let verty = [];
        let v;
        for (v = 0; v < verts.length; v++) {
            vertx[v] = verts[v].x;
            verty[v] = verts[v].y;
        }
        let i, j, c = false;
        for (i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            if ((verty[i] > testy != verty[j] > testy) && (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
                c = !c;
            }
        }
        if (c === true) {
            let info = {
                title: name /*,
                        owner: data.territories[name].owner,
                        population: data.territories[name].population,
                        military: data.territories[name].military,
                        food: data.territories[name].food */
            };
            if (set === false) {
                return info;
            } else {
                this.game.setInfo(info);
            }
        } else {
            return "none";
        }
    }
}

class Bucket {

    constructor(canvas) {
        this.RGBA = 4;      // how many indexs per pixel
        this.queue = [];

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.bitmap = this.ctx.getImageData(0, 0, canvas.width - 1, canvas.height - 1);

        this.isRendering = false;
    }

    /**
     * 
     * @param {any} bitmap
     * @param {number} x
     * @param {number} y
     * @param {number} color
     * @param {number} tolerance
     */
    floodFill(x, y, color, tolerance) {
        if (!this.isRendering) {
            this.isRendering = true;

            this.reloadBitmap();

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let start = this.getPixelArrayIndex(x, y);

            let queue = [];
            let self = this;

            (function (node, targetColor, replacementColor, tolerance) {
                queue.push(node);

                while (queue.length) {
                    node = queue.pop();

                    if (self.colorEquals(node, targetColor, tolerance)) {
                        self.setColor(node, replacementColor);

                        for (let d = 0; d < 8; d++) {
                            queue.push(self.getNode(d, node));
                        }
                    }
                }
                self.ctx.putImageData(self.bitmap, 0, 0);

                self.isRendering = false;
            }(
                start,
                Array.prototype.slice.call(this.bitmap.data, start, start + this.RGBA),
                color || [0, 0, 0, 0],
                tolerance || 10
            ));
        }
    }

    reloadBitmap() {
        this.bitmap = this.ctx.getImageData(0, 0, this.canvas.width - 1, this.canvas.height - 1);
    }

    colorEquals(node, color, tolerance) {
        if (node < 0 || node + this.RGBA - 1 > this.bitmap.data.length) {
            return false;
        }

        var diff = 0;
        for (var i = 0; i < this.RGBA; i += 1) {
            diff += Math.abs(this.bitmap.data[node + i] - color[i]);
        }
        return diff <= tolerance;
    }

    setColor(node, color) {
        for (var i = 0; i < this.RGBA; i += 1) {
            this.bitmap.data[node + i] = color[i];
        }
    }

    getNode(direction, node) {
        let n = 0;
        switch (direction) {
            case 0:
                n = -this.bitmap.width - 1; // up and left
                break;
            case 1:
                n = -this.bitmap.width; // up
                break;
            case 2:
                n = -this.bitmap.width + 1; // up and right
                break;
            case 3:
                n = -1; // left
                break;
            case 4:
                n = 1; // right
                break;
            case 5:
                n = this.bitmap.width - 1; // down and left
                break;
            case 6:
                n = this.bitmap.width; // down
                break;
            case 5:
                n = this.bitmap.width + 1; // down and right
                break;
        }

        return node + n * this.RGBA;
    }

    getPixelArrayIndex(x, y) {
        return (y * this.bitmap.width + x) * this.RGBA;
    }
}

class Whiteboard {
    /**
     * 
     * @param {Engine} game Game object
     * @param {Player} player Player object
     */
    constructor(game, player) {
        this.game = game;
        this.player = player;

        this.canvas = document.getElementById('whiteboard');
        this.ctx = document.getElementById('whiteboard').getContext('2d');

        // Fix height/width issues
        let canvasRect = this.canvas.getBoundingClientRect();

        this.width = canvasRect.width;
        this.height = canvasRect.height;

        this.canvas.setAttribute("width", this.width);
        this.canvas.setAttribute("height", this.height);

        this.savedPos = { x: 0, y: 0 };
        this.mouseDown = false;

        this.tool = {
            "color": "000",
            "selected": "none"
        }

        this.bucket = new Bucket(this.canvas);

        this.init();
    }

    init() {
        let self = this;

        this.canvas.addEventListener('click', function (e) {
            e.preventDefault();

            let pos = self.game.getPos(e, self.canvas);

            switch (self.tool.selected) {
                case 'text':
                    let rect = self.canvas.getBoundingClientRect();
                    let msg = document.getElementById('textbox-wb').value;
                    self.ctx.font = "12px Arial";
                    self.ctx.fillText(msg, pos.x, pos.y);
                    break;
                case 'fill':
                    self.bucket.floodFill(pos.x, pos.y, self.hexToRGBA(self.tool.color, 255), 10);
                    break;
            }
        });
        this.canvas.addEventListener('mousedown', function (e) {
            switch (self.tool.selected) {
                case 'pen':
                    let pos = self.game.getPos(e, self.canvas);
                    self.savedPos = { x: pos.x, y: pos.y }
                    self.drawDot(pos.x, pos.y);
                    self.mouseDown = true;
                    break;
            }
        });
        this.canvas.addEventListener('mousemove', function (e) {
            switch (self.tool.selected) {
                case 'pen':
                    if (self.mouseDown === true) {
                        let { x, y } = self.game.getPos(e, self.canvas);
                        self.drawDot(x, y);
                    }
                    break;
            }
        });
        this.canvas.addEventListener('mouseup', function (e) {
            switch (self.tool.selected) {
                case 'pen':
                    if (self.mouseDown === true) {
                        let pos = self.game.getPos(e, self.canvas);
                        self.mouseDown = false;
                    }
                    break;
            }
        });
    }

    drawDot(x, y) {
        this.ctx.strokeStyle = "#" + this.tool.color;
        // Draw filled line
        this.ctx.beginPath();
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = 4;
        this.ctx.moveTo(this.savedPos.x, this.savedPos.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        this.savedPos = { x: x, y: y };
    }

    /**
     * 
     * @param {String} hex
     * @param {Number} alpha
     */
    hexToRGBA(hex, alpha) {
        let r, g, b;

        if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else {
            r = parseInt(hex.slice(0, 1) + hex.slice(0, 1), 16);
            g = parseInt(hex.slice(1, 2) + hex.slice(1, 2), 16);
            b = parseInt(hex.slice(2, 3) + hex.slice(2, 3), 16);
        }

        if (alpha) {
            return [r, g, b, alpha];
        } else {
            return [r, g, b, 255];
        }
    }

    toggleTool(tool) {
        let colors = document.getElementById('colors-wb-container');
        let text = document.getElementById('textbox-wb-container');

        if (this.tool.selected !== "none") {
            let prevBtn = document.getElementById(this.tool.selected + '-wb');
            prevBtn.style.boxShadow = "none";
        }

        if (this.tool.selected === tool) {
            let prevBtn = document.getElementById(this.tool.selected + '-wb');
            prevBtn.style.boxShadow = "none";

            colors.setAttribute("class", "hidden");
            text.setAttribute("class", "hidden");

            this.tool.selected = "none";
        } else {
            if (tool === "pen" || tool === "fill") {
                colors.setAttribute("class", "");
                text.setAttribute("class", "hidden");
            } else if (tool === "text") {
                colors.setAttribute("class", "hidden");
                text.setAttribute("class", "");
            }
            let nextBtn = document.getElementById(tool + '-wb');
            nextBtn.style.boxShadow = "inset 0px 0px 2px 2px rgba(0,0,0,.075)";

            this.tool.selected = tool;
        }
    }

    toggleColor(hex) {
        if (this.tool.color !== "none") {
            let prevBtn = document.getElementById(this.tool.color + '-btn');
            prevBtn.setAttribute('class', '');
        }

        let nextBtn = document.getElementById(hex + '-btn');
        nextBtn.setAttribute('class', 'checked');

        this.tool.color = hex;
    }
}

class Player {
    constructor(opts) {
        this.isHost = opts.isHost;
        this.name = opts.name;
    }
}

let points = {
    "sections": [{
        "name": "Skyrim",
        "area": [
            { "x": 267, "y": 43 },
            { "x": 260, "y": 47 },
            { "x": 245, "y": 44 },
            { "x": 224, "y": 63 },
            { "x": 207, "y": 111 },
            { "x": 245, "y": 125 },
            { "x": 277, "y": 159 },
            { "x": 350, "y": 159 },
            { "x": 370, "y": 170 },
            { "x": 391, "y": 159 },
            { "x": 375, "y": 85 },
            { "x": 347, "y": 54 },
            { "x": 335, "y": 66 },
            { "x": 315, "y": 55 },
            { "x": 300, "y": 58 },
            { "x": 290, "y": 53 },
            { "x": 277, "y": 68 },
            {
                "x": 267, "y": 43
            }]
    }, {
        "name": "High Rock",
        "area": [
            { "x": 49, "y": 191 },
            { "x": 46, "y": 170 },
            { "x": 58, "y": 161 },
            { "x": 55, "y": 144 },
            { "x": 105, "y": 72 },
            { "x": 117, "y": 74 },
            { "x": 138, "y": 60 },
            { "x": 146, "y": 64 },
            { "x": 143, "y": 93 },
            { "x": 146, "y": 106 },
            { "x": 160, "y": 96 },
            { "x": 164, "y": 101 },
            { "x": 175, "y": 79 },
            { "x": 190, "y": 74 },
            { "x": 194, "y": 57 },
            { "x": 224, "y": 63 },
            { "x": 207, "y": 111 },
            { "x": 154, "y": 137 },
            { "x": 129, "y": 142 },
            { "x": 125, "y": 139 },
            { "x": 112, "y": 120 },
            { "x": 100, "y": 127 },
            { "x": 97, "y": 138 },
            { "x": 89, "y": 137 },
            { "x": 90, "y": 147 },
            { "x": 66, "y": 177 },
            { "x": 63, "y": 190 },
            { "x": 56, "y": 190 },
            { "x": 49, "y": 191 }
        ]
    }, {
        "name": "Hammerfell",
        "area": [
            { "x": 207, "y": 111 },
            { "x": 154, "y": 138 },
            { "x": 116, "y": 158 },
            { "x": 109, "y": 152 },
            { "x": 108, "y": 158 },
            { "x": 103, "y": 165 },
            { "x": 85, "y": 171 },
            { "x": 87, "y": 177 },
            { "x": 77, "y": 187 },
            { "x": 76, "y": 207 },
            { "x": 69, "y": 215 },
            { "x": 85, "y": 230 },
            { "x": 94, "y": 227 },
            { "x": 106, "y": 209 },
            { "x": 141, "y": 235 },
            { "x": 136, "y": 253 },
            { "x": 160, "y": 251 },
            { "x": 152, "y": 233 },
            { "x": 157, "y": 231 },
            { "x": 165, "y": 241 },
            { "x": 162, "y": 225 },
            { "x": 137, "y": 225 },
            { "x": 133, "y": 211 },
            { "x": 146, "y": 205 },
            { "x": 178, "y": 228 },
            { "x": 194, "y": 248 },
            { "x": 233, "y": 226 },
            { "x": 277, "y": 159 },
            { "x": 245, "y": 125 },
            { "x": 207, "y": 111 }
        ]
    }, {
        "name": "Cyrodiil",
        "area": [
            { "x": 277, "y": 159 },
            { "x": 233, "y": 226 },
            { "x": 216, "y": 237 },
            { "x": 192, "y": 264 },
            { "x": 203, "y": 279 },
            { "x": 216, "y": 283 },
            { "x": 214, "y": 290 },
            { "x": 234, "y": 290 },
            { "x": 263, "y": 273 },
            { "x": 275, "y": 268 },
            { "x": 285, "y": 270 },
            { "x": 291, "y": 282 },
            { "x": 310, "y": 278 },
            { "x": 330, "y": 280 },
            { "x": 342, "y": 286 },
            { "x": 359, "y": 302 },
            { "x": 355, "y": 361 },
            { "x": 396, "y": 361 },
            { "x": 393, "y": 350 },
            { "x": 405, "y": 325 },
            { "x": 405, "y": 325 },
            { "x": 415, "y": 320 },
            { "x": 421, "y": 308 },
            { "x": 431, "y": 295 },
            { "x": 436, "y": 275 },
            { "x": 446, "y": 270 },
            { "x": 418, "y": 220 },
            { "x": 409, "y": 215 },
            { "x": 418, "y": 200 },
            { "x": 402, "y": 165 },
            { "x": 391, "y": 159 },
            { "x": 370, "y": 170 },
            { "x": 350, "y": 159 },
            { "x": 277, "y": 159 }
        ]
    }, {
        "name": "Valenwood",
        "area": [
            { "x": 263, "y": 273 },
            { "x": 232, "y": 297 },
            { "x": 198, "y": 307 },
            { "x": 189, "y": 337 },
            { "x": 178, "y": 349 },
            { "x": 188, "y": 368 },
            { "x": 231, "y": 380 },
            { "x": 235, "y": 371 },
            { "x": 259, "y": 373 },
            { "x": 255, "y": 393 },
            { "x": 264, "y": 400 },
            { "x": 298, "y": 393 },
            { "x": 301, "y": 385 },
            { "x": 275, "y": 325 },
            { "x": 291, "y": 282 },
            { "x": 285, "y": 270 },
            { "x": 275, "y": 268 },
            { "x": 263, "y": 273 }
        ]
    }, {
        "name": "Elsweyr",
        "area": [
            { "x": 291, "y": 282 },
            { "x": 275, "y": 325 },
            { "x": 301, "y": 385 },
            { "x": 314, "y": 399 },
            { "x": 328, "y": 406 },
            { "x": 356, "y": 406 },
            { "x": 365, "y": 411 },
            { "x": 369, "y": 408 },
            { "x": 361, "y": 395 },
            { "x": 355, "y": 396 },
            { "x": 346, "y": 386 },
            { "x": 346, "y": 374 },
            { "x": 355, "y": 361 },
            { "x": 359, "y": 302 },
            { "x": 342, "y": 286 },
            { "x": 330, "y": 280 },
            { "x": 310, "y": 278 },
            { "x": 291, "y": 282 }
        ]
    }, {
        "name": "Summerset Isles",
        "area": [
            { "x": 93, "y": 305 },
            { "x": 74, "y": 314 },
            { "x": 77, "y": 325 },
            { "x": 53, "y": 327 },
            { "x": 46, "y": 346 },
            { "x": 54, "y": 353 },
            { "x": 76, "y": 346 },
            { "x": 77, "y": 356 },
            { "x": 64, "y": 372 },
            { "x": 65, "y": 379 },
            { "x": 64, "y": 382 },
            { "x": 56, "y": 386 },
            { "x": 55, "y": 398 },
            { "x": 63, "y": 402 },
            { "x": 72, "y": 399 },
            { "x": 76, "y": 394 },
            { "x": 126, "y": 402 },
            { "x": 139, "y": 378 },
            { "x": 113, "y": 343 },
            { "x": 122, "y": 324 },
            { "x": 100, "y": 319 },
            { "x": 93, "y": 305 }
        ]
    }, {
        "name": "Summerset Isles",
        "area": [
            { "x": 146, "y": 371 },
            { "x": 141, "y": 369 },
            { "x": 129, "y": 343 },
            { "x": 136, "y": 321 },
            { "x": 126, "y": 314 },
            { "x": 121, "y": 317 },
            { "x": 112, "y": 309 },
            { "x": 115, "y": 301 },
            { "x": 130, "y": 305 },
            { "x": 132, "y": 307 },
            { "x": 135, "y": 307 },
            { "x": 143, "y": 315 },
            { "x": 145, "y": 340 },
            { "x": 151, "y": 363 },
            { "x": 146, "y": 371 }
        ]
    }, {
        "name": "Morrowind",
        "area": [
            { "x": 375, "y": 85 },
            { "x": 391, "y": 159 },
            { "x": 402, "y": 165 },
            { "x": 418, "y": 200 },
            { "x": 409, "y": 215 },
            { "x": 418, "y": 220 },
            { "x": 446, "y": 270 },
            { "x": 515, "y": 280 },
            { "x": 521, "y": 275 },
            { "x": 525, "y": 284 },
            { "x": 542, "y": 284 },
            { "x": 546, "y": 271 },
            { "x": 540, "y": 263 },
            { "x": 539, "y": 251 },
            { "x": 531, "y": 243 },
            { "x": 521, "y": 243 },
            { "x": 521, "y": 237 },
            { "x": 543, "y": 225 },
            { "x": 557, "y": 179 },
            { "x": 573, "y": 169 },
            { "x": 564, "y": 157 },
            { "x": 552, "y": 169 },
            { "x": 548, "y": 166 },
            { "x": 555, "y": 151 },
            { "x": 542, "y": 103 },
            { "x": 501, "y": 84 },
            { "x": 509, "y": 112 },
            { "x": 520, "y": 113 },
            { "x": 523, "y": 169 },
            { "x": 508, "y": 179 },
            { "x": 510, "y": 187 },
            { "x": 500, "y": 201 },
            { "x": 488, "y": 186 },
            { "x": 471, "y": 191 },
            { "x": 463, "y": 205 },
            { "x": 459, "y": 191 },
            { "x": 448, "y": 191 },
            { "x": 420, "y": 159 },
            { "x": 410, "y": 120 },
            { "x": 396, "y": 96 },
            { "x": 401, "y": 84 },
            { "x": 386, "y": 77 },
            { "x": 376, "y": 86 }
        ]
    }, {
        "name": "Morrowind",
        "area": [
            { "x": 490, "y": 87 },
            { "x": 471, "y": 92 },
            { "x": 447, "y": 81 },
            { "x": 424, "y": 84 },
            { "x": 420, "y": 91 },
            { "x": 406, "y": 96 },
            { "x": 421, "y": 125 },
            { "x": 430, "y": 133 },
            { "x": 430, "y": 162 },
            { "x": 459, "y": 179 },
            { "x": 458, "y": 171 },
            { "x": 465, "y": 170 },
            { "x": 474, "y": 182 },
            { "x": 471, "y": 165 },
            { "x": 486, "y": 165 },
            { "x": 494, "y": 179 },
            { "x": 497, "y": 169 },
            { "x": 503, "y": 170 },
            { "x": 501, "y": 163 },
            { "x": 507, "y": 164 },
            { "x": 508, "y": 168 },
            { "x": 513, "y": 168 },
            { "x": 515, "y": 160 },
            { "x": 507, "y": 148 },
            { "x": 513, "y": 148 },
            { "x": 499, "y": 140 },
            { "x": 488, "y": 120 },
            { "x": 501, "y": 112 },
            { "x": 489, "y": 92 },
            { "x": 491, "y": 86 },
            { "x": 471, "y": 91 }
        ]
    }, {
        "name": "Black Marsh",
        "area": [
            { "x": 446, "y": 270 },
            { "x": 436, "y": 275 },
            { "x": 431, "y": 295 },
            { "x": 421, "y": 308 },
            { "x": 415, "y": 320 },
            { "x": 405, "y": 325 },
            { "x": 405, "y": 325 },
            { "x": 393, "y": 350 },
            { "x": 396, "y": 361 },
            { "x": 407, "y": 373 },
            { "x": 403, "y": 392 },
            { "x": 406, "y": 397 },
            { "x": 403, "y": 406 },
            { "x": 409, "y": 421 },
            { "x": 422, "y": 424 },
            { "x": 453, "y": 412 },
            { "x": 477, "y": 423 },
            { "x": 485, "y": 416 },
            { "x": 482, "y": 405 },
            { "x": 474, "y": 404 },
            { "x": 476, "y": 383 },
            { "x": 488, "y": 389 },
            { "x": 484, "y": 403 },
            { "x": 493, "y": 407 },
            { "x": 503, "y": 398 },
            { "x": 503, "y": 391 },
            { "x": 511, "y": 382 },
            { "x": 515, "y": 384 },
            { "x": 525, "y": 353 },
            { "x": 523, "y": 342 },
            { "x": 528, "y": 327 },
            { "x": 526, "y": 321 },
            { "x": 520, "y": 323 },
            { "x": 515, "y": 280 },
            { "x": 446, "y": 270 }
        ]
    }, {
        "name": "Morrowind",
        "area": [
            { "x": 383, "y": 39 },
            { "x": 392, "y": 52 },
            { "x": 389, "y": 52 },
            { "x": 398, "y": 71 },
            { "x": 402, "y": 67 },
            { "x": 403, "y": 77 },
            { "x": 409, "y": 78 },
            { "x": 412, "y": 73 },
            { "x": 421, "y": 74 },
            { "x": 420, "y": 67 },
            { "x": 427, "y": 59 },
            { "x": 422, "y": 42 },
            { "x": 416, "y": 46 },
            { "x": 414, "y": 36 },
            { "x": 400, "y": 35 },
            { "x": 399, "y": 43 },
            { "x": 383, "y": 39 }
        ]
    }]
};

const game = new Engine({
    'map': { 'points': points },
    'player': {
        'name': '',
        'isHost': false
    }
});