var path = require("path");
var express = require("express");
var flash = require("connect-flash");
var expresshbs = require("express-handlebars");
var mongoose = require("mongoose");
var handlebars = require("handlebars");

var prefix = process.env.PREFIX || "/";

var dbHost = process.env.DB_HOST;
var dbUsername = process.env.DB_USERNAME;
var dbPassword = process.env.DB_PASSWORD;
var dbName = process.env.DB_NAME;
var dbAuthSource = process.env.DB_AUTHSOURCE || dbName;

console.log('Connecting to mongodb://' + dbUsername + ':' + dbPassword + '@' + dbHost + '/' + dbName + '?authSource=' + dbAuthSource);
mongoose.connect('mongodb://' + dbUsername + ':' + dbPassword + '@' + dbHost + '/' + dbName + '?authSource=' + dbAuthSource, { autoIndex: true });

var models = require("./models")(mongoose);
var backend = require("./backend")(mongoose, models);
var frontend = require("./frontend")(prefix);

var User = models.User;
var Item = models.Item;
var Message = models.Message;

var app = express();


app.engine('handlebars', expresshbs({
    defaultLayout: 'main',
    helpers: {
        newlinetobr: function (text) {
            return new handlebars.SafeString(handlebars.Utils.escapeExpression(text).replace(/\r\n/g, "<br />").replace(/\r/g, "<br />").replace(/\n/g, "<br />"));
        },
        datetodatestring: function (date) {
            return date.toLocaleDateString();
        },
        no: function (array, options) {
            if (array.length == 0 || !array) {
                return options.fn(this);
            } else {
                return "";
            }
        },
        initialsFrom: function (name) {
			if (typeof name !== "string") {
				return "";
			}
			return name
				.split(/[ ,.]/)
				.map(p => p.charAt(0))
				.join("");
		},
        fileURL: function (id) {
            id = id + "";
            if (id.indexOf("@") > 0) {
                return "https://secure.gravatar.com/avatar/" + require('crypto').createHash('md5').update(id.trim().toLowerCase()).digest("hex") + "?size=72";
            } else if (id.indexOf("http") == 0 || id.indexOf("data") == 0) {
                return id;
            } else {
                return prefix + "/files/" + id;
            }
        },
		either: function () {
			var options = arguments[arguments.length - 1];
			for (var i = 0; i < arguments.length - 1; i++) {
				if (arguments[i]) {
					return options.fn(this);
				}
			}
		},
		status: function () {
			var options = arguments[arguments.length - 1];
			for (var i = 0; i < arguments.length - 1; i++) {
				if (arguments[i] == this.status) {
					return options.fn(this);
				}
			}
		},
		each_backward: function(context, options) {
			var ret = "";
			for(var i = context.length - 1; i >= 0; i--) {
				ret = ret + options.fn(context[i]);
			}
			return ret;
		},
    }
}));

app.set('view engine', 'handlebars');

app.use(prefix, flash());

app.use(prefix, backend);
app.use(prefix, frontend);

app.use(prefix + "files", express.static(process.env.DATA_DIR));

app.use(prefix, express.static(path.join(__dirname, "assets")));

var server = app.listen(process.env.PORT || 8080, process.env.IP || "127.0.0.1", function () {
    console.log("listening");
});

var io = require('socket.io')(server);

function push(socket, me, message) {
    socket.emit("message", {
        text: message.text,
        to: message.to,
        owner: message.owner,
        isself: message.owner.equals(me._id)
    }, function (status) {
		if (status == "success" && message.to.equals(me._id)) {
			Message.update({_id: message._id}, {$set: {read: true}}, function () {
			});
		}
	});
}

var users = {};
io.use(function (socket, next) {
    backend.session(socket.request, {}, next);
});
io.on("connection", function (socket) {
    if (!socket.request.session.passport) {
        socket.emit("badauth");
        return;
    }
    User.findOne({_id: socket.request.session.passport.user}, function (err, me) {
        if (err || !me) {
            console.error(err);
            socket.emit("badauth");
            return;
        }
        users[me._id] = socket;
		socket.on('disconnect', function() {
			users[me._id] = undefined;
		});
        socket.on("message", function (data) {
            User.findOne({_id: data.to._id}, function (err, to) {
                if (err || !to) {
                    console.error(err);
                    socket.emit("badto");
                    return;
                }
                var message = new Message({
                    owner: me._id,
                    to: to._id,
                    text: data.text
                });
                message.save();
                push(socket, me, message);
                if (users[to._id]) {
                    try {
                        push(users[to._id], to, message);
                    } catch (e) {
                        console.error(e);
                        users[to._id] = undefined;
                    }
                }
            });
        });
        socket.on("getuser", function (data, cb) {
            var find = {};
            if (data.username) {
                find.username = data.username;
            }
            if (data.id) {
                find._id = data.id;
            }
            User.findOne(find, function (err, user) {
                if (err || !user) {
                    cb({});
                    return;
                }
                cb({
                    _id: user._id,
                    avatar: user.avatar,
                    flagged: user.flagged,
                    reputation: user.reputation,
                    username: user.username,
                    name: user.name,
					color: user.color
                });
            });
        });
        socket.on("getme", function (data, cb) {
            cb({
                _id: me._id,
                avatar: me.avatar,
                flagged: me.flagged,
                reputation: me.reputation,
                username: me.username,
				name: me.name,
				color: me.color
            });
        });
        socket.on("pastmessages", function (data) {
            Message.find().or([{to: me._id, owner: data.to._id}, {owner: me._id, to: data.to._id}]).exec(function (err, docs) {
                for (var i = 0; i < docs.length; i++) {
                    push(socket, me, docs[i]);
                }
            });
        });
    });
});

