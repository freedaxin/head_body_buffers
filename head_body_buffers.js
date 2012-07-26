var events = require('events');
var util = require('util');

/**
* @description get head and body from buffers
* @param {int} head_length
* @param {function} getBodyLength
*/
function HeadBodyBuffers (head_length, getBodyLength) {
    events.EventEmitter.call(this);
    this.buffers = [];  // all unread buffers
    this.total_unread_length = 0;   // the total length of all buffers
    this.curr_pos = 0;  // read index of the first buffer
    this.head_length = head_length; // the fixed head length
    this.getBodyLength = getBodyLength;
    this.head = null;   // the head buffer
    this.bytes_to_read = head_length;   // inited by head_length
}

util.inherits(HeadBodyBuffers, events.EventEmitter);

/**
* @description add buffer to read, and check for enough data
* @param {Buffer} buff
*/
HeadBodyBuffers.prototype.addBuffer = function (buff) {
    this.buffers.push(buff);
    this.total_unread_length += buff.length;
    this._checkEnoughData();
}

/**
* @description
*   check for enough data, read head body alternately
*   if head and body in the same buffer, then slice packet from it
*   else create a new Buffer to put head and body in
*/
HeadBodyBuffers.prototype._checkEnoughData = function () {
    // if not enough data, wait for new buffer to be pushed in
    if (this.total_unread_length < this.bytes_to_read) {
        return;
    }
    if (!this.head) {
        // head
        var first_buff = this.buffers[0];
        if (this.curr_pos + this.bytes_to_read <= first_buff.length) {
            this.head = first_buff.slice(this.curr_pos, this.curr_pos + this.bytes_to_read);
            this._skipData(this.bytes_to_read);
            // read head finished, to read body
            this.bytes_to_read = this.getBodyLength(this.head);
            // head and body in the same buffer?
            if (this.curr_pos >= 4 &&
                this.curr_pos + this.bytes_to_read <= first_buff.length) {
                var packet = first_buff.slice(this.curr_pos - 4, this.curr_pos + this.bytes_to_read);
                this._skipData(this.bytes_to_read);
                // to read head again
                this.head = null;
                this.bytes_to_read = this.head_length;
                this.emit('packet', packet);
            }
        } else {
            this.head = new Buffer(4);
            this._dataToBuffer(this.head, 0);
            // read head finished, to read body
            this.bytes_to_read = this.getBodyLength(this.head);
        }
    } else {
        // body
        // copy head and body into a new Buffer
        var buff = new Buffer(this.head_length + this.bytes_to_read);
        this.head.copy(buff);
        this._dataToBuffer(buff, this.head_length);
        // read body finished, to read head again
        this.head = null;
        this.bytes_to_read = this.head_length;
        this.emit('packet', buff);
    }
    this._checkEnoughData();
}

/**
* @description skip data from the first buffer
* @param {int} length_to_skip
*/
HeadBodyBuffers.prototype._skipData = function (length_to_skip) {
    this.total_unread_length -= length_to_skip;
    if (this.curr_pos + length_to_skip < this.buffers[0].length) {
        // there are unread data in the first buffer
        this.curr_pos += length_to_skip;
    } else {
        // no unread data in the first buffer
        this.buffers.shift();
        this.curr_pos = 0;
    }
}

/**
* @description
*   copy bytes_to_read length of data into buff from start_pos
* @param {Buffer} buff
* @param {int} start_pos
*   start position of buff to be written
*/
HeadBodyBuffers.prototype._dataToBuffer = function (buff, start_pos) {
    var copyed_length_total = 0;
    while (this.buffers.length > 0) {
        var first_buff = this.buffers[0];
        if (first_buff.length === 0) {
            this.buffers.shift();
            continue;
        };
        var copyed_length = first_buff.copy(buff, start_pos, this.curr_pos);
        this._skipData(copyed_length);
        start_pos += copyed_length;
        copyed_length_total += copyed_length;
        if (copyed_length_total >= this.bytes_to_read) {
            break;
        }
    }
};

exports.HeadBodyBuffers = HeadBodyBuffers;
