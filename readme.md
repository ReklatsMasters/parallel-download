# parallel-download

> Parallel downloads files to the buffer.

## install
```bash
npm install parallel-download
```

## usage 

### Simple download
```js
var download = require("parallel-download");

download(["http://example.com/1.txt", "http://example.com/2.txt"], function(err, res){
	console.error(err);
    res.forEach(function(it){
    	console.log(it.content.length, it.url);
    });
})
```

### Object-oriented download and options
```js
var Download = require("parallel-download");

var d = new Download({timeout:30*1000});
d.get("http://example.com/1.txt");
d.get("http://example.com/2.txt", {timeout:120*1000});
// OR d.get(["http://example.com/1.txt", "http://example.com/2.txt"]);
d.run(function(err, res){
	// ...
});
```

### Streams
```js
var Memorystream = require('memory-stream');
var fs           = require('fs');
var Download     = require("parallel-download");

var memstream = new Memorystream();
var fstream = fs.createWriteStream('avatar.png');

var d = new Download();

d.get("http://example.com/1.txt", {stream:memstream});
d.get("http://example.com/2.png", {stream:fstream});

memstream.on("finish", function(){
	console.log( memstream.toBuffer() );
});

d.run(function(error, success){
	// all done
});
```

## API

Methods
===

download(urls, [opts], cb)
-----------------------------
Download array of urls

**Parameters**

**urls**: Url | Array.&lt;Url&gt;

**opts**: object, optional, Options for request

**cb**: RunCallback

new Downloader([opts])
-----------------------------

**Parameters**

**opts**: object,  optional, Options for request


Downloader.get(url, [opts]) 
-----------------------------

**Parameters**

**url**: Url | Array.&lt;Url&gt;, 

**opts**: object, optional, Options for request


Downloader.run(cb) 
-----------------------------

**Parameters**

**cb**: RunCallback

Options
===

All [request](https://github.com/mikeal/request) options

stream
-----------------------------
**WriteStream**  Default is [memory-stream](https://github.com/tommymessbauer/memory-stream)


maxSize
-----------------------------
**Number** The maximum admissible size of the accepted data. Exceeding this limit all callbacks for the event `finish` removed and the download stops (only for this url).

Type Definitions
===

RunCallback(err, result)
-----------------------------

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| err | null : Array.&lt;ErrorHash&gt; | Array of errors |
| result | Array.&lt;ResultHash&gt; | Callback with downloaded data |


ErrorHash
-----------------------------

**Type**: object

**Properties**

| Name | Type | Description |
|------|------|-------------|
| url | String | link |
| error | Error | Error object |

ResultHash
-----------------------------

**Type**: object

**Properties**

| Name | Type | Description |
|------|------|-------------|
| url | String | link |
| content | Buffer | Downloaded data or empty Buffer when used external stream |
|filename | null : String | File name from `content-disposition` header |