class Draggable {

    /**
     * @description Makes an element draggable
     * @param {String} id Element ID
     * @param {Number} x Position X
     * @param {Number} y Position Y
     * @param {Boolean} manualMove Call move somewhere else
     */
    constructor(id, x, y, game, manualMove) {
        this.manualMove = manualMove || false;
        this.elem = document.getElementById(id);
        this.elem.style.position = 'fixed';
        this.elem.isSelected = false;
        this.x = x;
        this.y = y;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.elem.style.left = this.x + 'px';
        this.elem.style.top = this.y + 'px';

        // Setup events
        this.elem.addEventListener('mousedown', this.elemSelected.bind(this));
        if (!game.player.isHost) {
            this.elem.addEventListener('mousemove', this.move.bind(this));
        }
        this.elem.addEventListener('mouseup', this.elemReleased.bind(this));
    }

    /**
     * @description Mounse move event
     * @param {MouseEvent} e Mouse event
     */
    move(e) {
        e.preventDefault();
        if (this.elem.isSelected) {
            this.elem.isMoving = true;
            let dx = e.clientX - this.lastMouseX;
            let dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.x += dx;
            this.y += dy;
            this.elem.style.left = this.x + 'px';
            this.elem.style.top = this.y + 'px';
        }
    }

    /**
     * @description Mouse down event
     * @param {MouseEvent} e Mouse event
     */
    elemSelected (e) {
        this.elem.isSelected = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    /**
     * @description Mouse up event
     * @param {MouseEvent} e Mouse event
     */
    elemReleased (e) {
        e.preventDefault();
        this.elem.isSelected = false;
        this.elem.isMoving = false;
    }
}