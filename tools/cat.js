var http = require("http");
var mongoose = require("mongoose");
mongoose.connect('mongodb://derp:derp123@localhost/derp');
var models = require("./../models")(mongoose);
var backend = require("./../backend")(mongoose, models);
var frontend = require("./../frontend")(mongoose, models);

var User = models.User;
var Item = models.Item;
var Message = models.Message;
var File = models.File;

var files = require("./../files")(mongoose, models);

var file = new File();

http.get("http://random.cat/meow", function (res) {
	var buff = "";
	res.setEncoding('utf8');
	res.on('data', function (chunk) {
		buff += chunk;
	});
	res.on('end', function() {
		var meow = JSON.parse(buff);
		console.log(meow);
		http.get(meow.file, function (res) {
			files.saveFile(res, function (hash) {
				file.contenttype = res.headers["content-type"];
				file.hash = hash;
				console.log(file);
				console.log("https://commongoods.eu.org/files/" + file._id);
				file.save();
				process.exit();
			}, {
				type: "profile"
			});
		});
	})
});
