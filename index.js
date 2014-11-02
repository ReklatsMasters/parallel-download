'use strict';

var request = require("request")
	, assign = require('object-assign')
	, MemoryStream = require('memory-stream')
	;

var jobs = {
	parallel: require('./parallel'),
	queue:    require('./queue')
};

/**
 * @class
 * @param {object} [opts] - Options for <request>
 */
function Downloader(opts) {
	this.opts = opts || {};
	this.opts.encoding = null;
	this.opts.timeout = ('timeout' in this.opts) ? this.opts.timeout : 60*1000;
	this.tasks = [];

	this.mode = ('mode' in this.opts) ? this.opts.mode : "parallel";
}

// generator of tasks
var generator = function(url, opts) {
	// task func
	return function(cb) {
		var wstream = opts.stream || new MemoryStream()
			, name = null
			, maxSize = 0
			;

		if (typeof opts.maxSize === 'number' && opts.maxSize > 0) {
			maxSize = opts.maxSize;
			delete opts.maxSize;
		}

		if (opts.stream) {
			delete opts.stream;
		}

		var onFinishStream = function() {
			var content;

			if (wstream instanceof MemoryStream) {
				content = wstream.toBuffer();
			} else {
				content = new Buffer(0);
			}

			return cb(null, {url:url, filename:name, content:content});
		};

		wstream.on('finish', onFinishStream);

		var httpreq = request.get(url, opts)
		.on("error", function(err){
			cb({url:url, error:err});
		})
		.on('response', function (res) {
			if (res.statusCode < 200 || res.statusCode >= 300) {
				return cb({url:url, error: new Error(res.statusCode)});
			}

			if (res.headers.hasOwnProperty("content-disposition")) {
				var attach = res.headers["content-disposition"];
				var posLeft = attach.indexOf('"');

				name = attach.slice(posLeft+1, -1);
			}

			if (maxSize > 0) {
				var size = 0;
				var dataListener = function(chunk) {
					var part = Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk);
					size += part.length;

					if (size > maxSize) {
						httpreq.abort();

						res.unpipe(wstream);
						res.removeListener('data', dataListener);

						wstream.removeAllListeners('finish');
						wstream = null;

						return cb({url:url, error:new Error('Exceeds the maximum allowable size of the buffer')});
					}
				};

				res.on('data', dataListener);
			}

			res.pipe(wstream);
		})
		;
	};
};

/* @typedef {string} Url */

/**
 * @param {Url|Url[]} url
 * @param {object} [opts] - Options for <request>
 */
Downloader.prototype.get = function(url, opts) {
	if (typeof url === "string") {
		this.tasks.push( generator(url, assign({}, this.opts, opts)) );
	} else if (Array.isArray(url)) {
		url.forEach(function(item){
			this.tasks.push( generator(item, assign({}, this.opts, opts)) );
		}, this);
	} else {
		throw new TypeError("Argiment 1: expected string or array");
	}

	return this;
};

/**
 * @typedef ResultHash
 * @type {object}
 * @property {Url} url
 * @property {Buffer} content - Downloaded data
 * @property {null|String} filename - File name from `content-disposition` header
 */

 /**
  * @typedef ErrorHash
  * @type {object}
  * @property {Url} url
  * @property {Error} error
  */

/**
 * @callback RunCallback
 * @param {null|ErrorHash[]} err - Array of errors
 * @param {ResultHash[]} result 
 */

/**
 * @param {RunCallback} cb
 */
Downloader.prototype.run = function(cb) {
	var opts = {};

	if (this.mode == "queue" && typeof this.opts.tryTimeout === 'number' && this.opts.tryTimeout > 0) {
		opts.timeout = this.opts.tryTimeout;
	}

	jobs[this.mode](this.tasks, opts, cb);
};


/**
 * Simple parallel downloader
 * @param {Url|Url[]} urls
 * @param {object}  [opts]
 * @param {RunCallback} cb  
 */
function download(urls, opts, cb) {
	/*jshint validthis:true */
	if (this instanceof download) {
		opts = opts || urls;
		return new Downloader(opts);
	}

	if (!Array.isArray(urls) && (typeof urls !== "string")) {
		throw new TypeError("Expected string or array");
	}

	if (typeof opts === "function") {
		cb = opts;
		opts = {};
	}

	var d = new Downloader(opts);
	d.get(urls);
	d.run(cb);
}

module.exports = download;