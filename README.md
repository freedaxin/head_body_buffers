# Overview

When transfer packets in network composed of a fixed length "head" and a variable length "body", the "data" event emitted by node socket probably not a complete packet, but part of several packets. This tool help you get the "head" and "body" from the buffers.

If the "head" and "body" is in a single buffer, data will not be copyed to a new buffer, just use buffer.slice() to reference data.

see the test for more usage samples.

# Install

npm install head_body_buffers

# Example
```javascript
var net = require('net');
var HeadBodyBuffers = require('head_body_buffers').HeadBodyBuffers;

function packetLength(data) {
    var len = data[0];
    len += (data[1] << 8);
    len += (data[2] << 16);
    return len;
}

var hbd = new HeadBodyBuffers(4, packetLength);
hbd.on('packet', function (packet) {
    var head = packet.slice(0, 4);
    var body = packet.slice(4);
    console.log("head:", head, head.length);
    console.log("body:", body.toString(), body.length);
});

var client = net.connect(3306);
client.on('data', function(data) {
  hbd.addBuffer(data);
});
```
