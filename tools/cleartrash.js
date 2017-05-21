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

File.find({ trash: true }).remove(function() {
	console.log("Removed Items. ");
});


