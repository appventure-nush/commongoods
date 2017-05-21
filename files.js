module.exports = function (mongoose, models) {

	var express = require("express");
	var path = require("path");
	var crypto = require('crypto');
	var fs = require("fs");
	var stream = require('stream');
	
	var gm = require("gm");

	var router = express.Router();
	var File = models.File;

	var dataDirectory = process.env.DATA_DIR;
	var prefix = path.join(dataDirectory);

	var busboy = require("connect-busboy");

	router.use(busboy());

	router.get("/:id", function (req, res) {
		File.findOne({ _id: req.params.id }, function (err, file) {
            if (err || !file) {
				res.status(404).end("File not found");
				return;
            }
			if (file.contenttype) {
				res.setHeader("Content-Type", file.contenttype);
			}
			res.sendFile(file.hash, {
				root: prefix,
				maxAge: 1000*60*60
			}, function (err) { 
				if (err) {
					res.status(err.status).end();
				}
				else {
				}
			});
		});
	});

	router.saveFile = function (file, cb, options) {
		var buffs = [];
		var hash = crypto.createHash('sha1');
		hash.setEncoding('hex');

		if (!options) {
			options = {};
		}

		var stream = file;
		if (options.type == "profile") {
			stream = gm(file)
				.autoOrient()
				.noProfile()
				.resize(240, 240, "^>")
				.gravity("Center")
				.crop(240, 240, 0, 0)
				.quality(50)
				.stream()
		}
		else if (options.type == "picture") {
			stream = gm(file)
				.autoOrient()
				.noProfile()
				.resize(1024, ">")
				.quality(50)
				.stream()
		}

		if (stream instanceof Buffer) {
			hash.write(stream);
			hash.end();
				var thehash = hash.read();
				var write = fs.createWriteStream(path.join(prefix, thehash));
				write.write(stream);
				write.end();
				cb(thehash);
		}
		else {
			stream.pipe(hash);
			stream.on('data', function (d) { buffs.push(d); });
			stream.on('end', function () {
				var thehash = hash.read();
				var write = fs.createWriteStream(path.join(prefix, thehash));
				write.write(Buffer.concat(buffs));
				write.end();
				cb(thehash);
			});
		}

	};

	router.post("/new", function (req, res) {
		if (req.busboy) {

			var buff;
			var opts = {};
			var file = new File({
			});

			req.busboy.on('file', function(fieldname, pipefile, filename, encoding, mimetype) {
				file.contenttype = mimetype;
				file.save();
				
				var buffs = [];
				pipefile.on('data', function (d) { buffs.push(d); });
				pipefile.on('end', function () {
					buff = Buffer.concat(buffs);
				});
			});

			req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
				console.log(key, value, keyTruncated, valueTruncated);
				opts[key] = value;
			});

			req.busboy.on('finish', function() {
				
				router.saveFile(buff, function (hash) {
					file.hash = hash;
					file.save();	
					res.write(JSON.stringify(file.toJSON()));
					res.end();
					console.log("final");
				}, opts);
				
			});

			req.pipe(req.busboy);
		}
		else {
			res.status(400);
			res.write(JSON.stringify({ error: true }));
			res.end();
		}
	});

	return router;
};
