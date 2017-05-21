var mongoose = require("mongoose");
var path = require("path");
var fs = require("fs");

mongoose.connect('mongodb://derp:derp123@localhost/derp');

var models = require("./../models")(mongoose);

var User = models.User;
var Item = models.Item;
var Message = models.Message;
var File = models.File;

var prefix = path.join(__dirname, "..", "..", "data", "files");

var promises = [
	new Promise(function (resolve, reject) {
		User.find().select({ avatar: true }).exec(function (err, users) {
			if (err) {
				reject();
				return;
			}
			var ids = users.map(function (u) {
				return u.avatar;
			});
			resolve(ids);
		});
	}),
	new Promise(function (resolve, reject) {
		Item.find().select({ picture: true }).exec(function (err, items) {
			if (err) {
				reject();
				return;
			}
			var ids = items.map(function (i) {
				return i.picture;
			});
			resolve(ids);
		});
	})
];

Promise.all(promises).then(function (items) {
	var ids = [].concat.apply([], items);
	console.log(ids);
	File.find({ _id: { $nin: ids } }).select({ hash: true }).exec(function(err, files) {
		console.log(files);
		files.forEach(function (file) {
			File.find({ _id: file._id }).update({ $set: { trash: true }}, function () {
				console.log(file._id + " removed. ");	
			});
			if (file.hash) {
				console.log(file.hash + " removed. ");	
				fs.rename(path.join(prefix, file.hash), path.join(prefix, file.hash + ".trash"), function (err) {
					if (err) {
						//console.error(err);
					}
				});
			}
		});
	});
});
