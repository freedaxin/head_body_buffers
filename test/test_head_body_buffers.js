/**
 * test case, can be excuted by mocha
 * test by mysql packet:
 *  http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol
 */

var assert = require('assert');
var HeadBodyBuffers = require('../head_body_buffers.js').HeadBodyBuffers;

/**
* @description get packet length of mysql packet
* @param {Buffer} data
*/
function packetLength(data) {
    var len = data[0];
    len += (data[1] << 8);
    len += (data[2] << 16);
    return len;
}

var COM_QUERY = 3;
var TEST_SQL = "select * from t"

//packet: head(4)+body(1+n_string)
var packet = new Buffer(4+258);
packet.writeUInt8(0x02, 0);
packet.writeUInt8(0x01, 1);
packet.writeUInt8(0x00, 2);
packet.writeUInt8(0x00, 3);
packet.writeUInt8(COM_QUERY, 4);
packet.fill(" ", 5);
packet.write(TEST_SQL, 5);

var hbd = new HeadBodyBuffers(4, packetLength);
exports.init = function () {
    hbd.on('packet', function (packet) {
        var head = packet.slice(0, 4);
        var body = packet.slice(4);
        //console.log("head:", head, head.length);
        //console.log("body:", body.toString(), body.length);
        //console.log("body:", body, body.length, packet.length);
        assert.equal(packet[0], 0x02);
        assert.equal(body[0], COM_QUERY);
        assert.equal(body.length, packetLength(head));
        assert.equal(body.toString(null, 1, 1+TEST_SQL.length), TEST_SQL);
    });
}

exports.testSingleBufferAsPacket = function () {
    hbd.addBuffer(packet);
}

exports.testHeadBody = function () {
    hbd.addBuffer(packet.slice(0, 4));
    hbd.addBuffer(packet.slice(4));
}

exports.testPieces = function () {
    var buff = null;
    buff = packet.slice(0, 2);
    hbd.addBuffer(buff);

    buff = packet.slice(2, 2+2);
    hbd.addBuffer(buff);

    buff = packet.slice(4, 4+1);
    hbd.addBuffer(buff);

    buff = packet.slice(5);
    hbd.addBuffer(buff);
}

exports.testPiecesRandom = function () {
    var times = 10000;
    var times_for_log = times;
    while (--times) {
        var two_packets = new Buffer(2*packet.length);
        packet.copy(two_packets);
        packet.copy(two_packets, packet.length);
        var pos1 = Math.floor(Math.random()*(two_packets.length));
        while (1) {
            var pos2 = Math.floor(Math.random()*(two_packets.length));
            if (pos2 != pos1) {
                break;
            };
        };
        var slice_1 = Math.min(pos1, pos2);
        var slice_2 = Math.max(pos1, pos2);

        var buff1 = two_packets.slice(0, slice_1);
        var buff2 = two_packets.slice(slice_1, slice_2);
        var buff3 = two_packets.slice(slice_2);
        hbd.addBuffer(buff1);
        hbd.addBuffer(buff2);
        hbd.addBuffer(buff3);
        //console.log(buff1, buff2, buff3);
    }
}
