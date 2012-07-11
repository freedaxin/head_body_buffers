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
* @description check for enough data, read head body alternately
*/
HeadBodyBuffers.prototype._checkEnoughData = function () {
    // if not enough data, wait for new buffer to be pushed in
    if (this.total_unread_length < this.bytes_to_read) {
        return;
    }
    if (!this.head) {
        // head
        this.head = this._dataToBuffer();
        // read head finished, to read body
        this.bytes_to_read = this.getBodyLength(this.head);
        this._checkEnoughData();
    } else {
        // body
        this.emit('packet', this.head, this._dataToBuffer());
        // read body finished, to read head again
        this.head = null;
        this.bytes_to_read = this.head_length;
    }
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

HeadBodyBuffers.prototype._dataToBuffer = function () {
    // slice from the first buffer if enough bytes_to_read
    // avoid unneccessary buffer copy
    var buff = null;
    if (this.buffers[0].length - this.curr_pos >= this.bytes_to_read) {
        buff = this.buffers[0].slice(this.curr_pos, this.curr_pos + this.bytes_to_read);
        this._skipData(this.bytes_to_read);
        return buff;
    };
    // if not enough bytes_to_read in the first buffer,
    // create new buffer and copy data into it
    buff = new Buffer(this.bytes_to_read);
    var start_pos = 0;
    while (this.buffers.length > 0) {
        var first_buff = this.buffers[0];
        if (first_buff.length === 0) {
            this.buffers.shift();
            continue;
        };
        var copyed_length = first_buff.copy(buff, start_pos, this.curr_pos);
        this._skipData(copyed_length);
        start_pos += copyed_length;
        if (start_pos >= this.bytes_to_read) {
            break;
        }
    }
    return buff;
};

exports.HeadBodyBuffers = HeadBodyBuffers;
