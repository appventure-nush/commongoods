module.exports = function (mongoose, models) {

    var http = require("http");

    var express = require("express");
    var cookieparser = require('cookie-parser');
    var session = require('express-session');
    var MongoStore = require('connect-mongo')(session);
    var bodyparser = require("body-parser");

	var make_color = require("pleasejs").make_color;

    var tools = require("./tools");
    var User = models.User;
    var Item = models.Item;
    var Message = models.Message;
    var File = models.File;

    var files = require("./files")(mongoose, models);

    var backend = express.Router();

    backend.use(bodyparser.json());
    backend.use(bodyparser.urlencoded({extended: true}));
    
	var bcrypt = require("bcryptjs");

    var passport = require('passport');
	var passportdata = "keyboard cat";

    backend.use(cookieparser());
    backend.use(backend.session = session({
        secret: passportdata,
        store: new MongoStore({
            mongooseConnection: mongoose.connection
        })
    }));
    backend.use(passport.initialize());
    backend.use(passport.session());
	
	var config = require("./config.js");
	var Strategy = require('openid-client').Strategy;
	var Issuer = require('openid-client').Issuer;
	var registerPassport = function (client, params) {
		passport.use('oidc', new Strategy({ client, params }, function (tokenset, done) {
			var email = tokenset.claims.email;
			var name = tokenset.claims.name;
			if (!config.allowed.test(email)) {
				return done(null, false, { message: "Can't login, bad email. " });
			}
			User.findOne({username: email}, function (err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					// Create user
					var user = User({
						username: email,
						name: name,
						color: make_color({ saturation: 1 })[0]
					});
					user.save(function (err) {
						return done(err, user);
					});
				}
				else {
					// User exists
					return done(null, user);
				}
			});
		}));

		backend.get('/auth', passport.authenticate('oidc', {
			failureRedirect: '/login',
			failureFlash: true
		}));

		backend.get('/callback', passport.authenticate('oidc', {
			successRedirect: '/',
			failureRedirect: '/login',
			failureFlash: true
		}));
	}
	Issuer.discover(config.oidc.issuer)
	.then(function (issuer) {
		var client = new issuer.Client({
			client_id: config.oidc.client_id,
			client_secret: config.oidc.client_secret,
			redirect_uris: [config.oidc.redirect_uri],
		});
		registerPassport(client, {
			scope: 'openid profile email'
		});
	});

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function (id, done) {
        User.findOne({_id: id}).exec(function (err, user) {
            done(null, user);
        });
    });

    backend.use(function (req, res, next) {
        res.data = {
            loggedin: req.user != undefined,
            user: req.user
        };
        next();
    });

    backend.use(function (req, res, next) {
        if (req.method.toLowerCase() == "get" && res.data.loggedin && !req.url.match(/(css\/|js\/|fonts\/|images\/)/)) {
            res.data.notifications = 0;
            Promise.all([
                Message.find({to: req.user._id, read: false}),
                Item.find().or([
					{status: "pending", owner: req.user._id},
					{status: "accepted", wanter: req.user._id},
					{status: "rejected", wanter: req.user._id},
					//{status: "passed", owner: req.user._id}
				])
            ]).then(function (counts) {
                res.data.notificationcount = counts.map(function (i) {
                    return i.length;
                }).reduce(function (a, b) {
                    return a + b;
                }, 0);
                next();
            }).catch(function (e) {
                next(e);
            });
        } else {
            next();
        }
    });
    backend.get("/messaging", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
        } else {
            next();
        }
    });

    backend.get('/', function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
		}
        Item.find().sort([['_id', 'descending']]).limit(100).select({_id: true, name: true, description: true, picture: true, owner: true, available: true, pickup: true}).populate("owner", {username: true, name: true, color: true, avatar: true, reputation: true}).lean().exec(function (err, items) {
            if (err || !items) {
                next(err);
                return;
            }
            res.data.items = items;
            next();
        });
    });

    backend.use("/files", files);

    backend.get("/notifications", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
        }
		Promise.all([
			Message.find({to: req.user._id, read: false}).populate("owner").sort([['_id', 'descending']]).limit(50).lean(),
			Item.find().or([
				{status: "pending", owner: req.user._id},
				{status: "accepted", owner: req.user._id},
				{status: "accepted", wanter: req.user._id},
				{status: "rejected", wanter: req.user._id},
				// {status: "passed", owner: req.user._id}
			]).populate("owner").populate("wanter").sort([['_id', 'descending']]).limit(50)
		]).then(function (stuff) {
			res.data.messages = stuff[0];
			res.data.items = stuff[1];
			next();
		});
    });

    backend.get('/search', function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
		}
        Item.find({$text: {$search: req.query.q, $language: "en"}}).sort([['_id', 'descending']]).limit(100).populate("owner").lean().exec(function (err, items) {
            if (err || !items) {
                next(err);
                return;
            }
            res.data.items = items;
            next();
        });
    });

    backend.get("/user/:username", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
		}
        User.findOne({username: req.params.username}, function (err, user) {
            res.data.profile = user;
            res.data.loggedin = req.user != undefined;
            if (err || !user) {
                next(err);
            } else {
                res.data.ownprofile = req.user ? req.user.username == req.params.username : false;
                if (!res.data.ownprofile && req.user) {
                    res.data.hasflagged = (user.flaggers.indexOf(req.user._id) > -1);
                }
                var cb = function (err, messages) {
                    Item.find({owner: user.id}).sort([['_id', 'descending']]).populate("owner").lean().exec(function (err, items) {
                        if (err || !items) {
                            next(err);
                            return;
                        }
                        res.data.profile.unreadmessages = messages.length;
                        res.data.items = items;
                        next();
                    });
                }
                if (req.user) {
                    Message.find({to: req.user.id, owner: user.id, read: false}).exec(cb);
                } else {
                    cb(null, []);
                }
            }
        });
    });

    backend.get("/user/:username/edit", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
        } else if (req.user.username != req.params.username) {
            req.flash("error", "Don't try to edit someone else's profile! ");
            res.redirect(req.originalUrl.replace("/edit", ""));
        } else {
            next();
        }
    });

    backend.post('/new', function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            next();
            return;
        } else if (req.body.name.length < 3) {
            req.flash("error", "Name too short");
            res.redirect(req.path);
            next();
            return;
        } else if (req.body.picture.length === 0) {
            req.flash("error", "Please select an image");
            res.redirect(req.path);
            return;
        }
        var item = new Item({
            name: req.body.name,
            description: req.body.description,
			pickup: req.body.pickup,
            picture: req.body.picture,
            owner: req.user._id,
            available: true,
			state : "posted",
        });
        item.save(function (err) {
            if (err) {
                req.flash("error", "Unknown error");
                res.redirect(req.path);
            } else {
                res.redirect("/user/" + encodeURIComponent(req.user.username));
                req.user.reputation += 1;
                req.user.save();
            }
            next();
        });

    });

    backend.get(["/item/:id", "/item/:id/waiting", "/item/:id/give", "/item/:id/confirmed"], function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
		}
        Item.findOne({_id: req.params.id}).populate("wanter").populate("owner").populate("history").lean().exec(function (err, item) {
            if (err || !item) {
                next(err);
                return;
            }
			res.data.item = item;
			res.data.isowner = req.user ? res.data.item.owner._id.equals(req.user._id) : false;
			res.data.iswanter = (req.user && res.data.item.wanter) ? res.data.item.wanter._id.equals(req.user._id) : false;
			if (res.data.item.wanter && (res.data.isowner || res.data.iswanter)) {
				Message.find({to: req.user._id, owner: res.data.iswanter ? res.data.item.owner._id : res.data.item.wanter._id, read: false}).exec(function (err, messages) {
					if (err || !messages) {
						next(err);
						return;
					}
					res.data.unreadmessages = messages.length;
					console.log(res.data);
					next();
				});
			} else {
				next();
			}
        });
    });

    backend.get("/item/:id/edit", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
		}
		// TODO: prevent edits when pending
        Item.findOne({_id: req.params.id}).populate("wanter").populate("owner").lean().exec(function (err, item) {
            if (err || !item) {
                next(err);
                return;
            }
            res.data.item = item;
            next();
        });
    });

    backend.post('/item/:id/edit', function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            next();
            return;
        } else if (req.body.name.length < 3) {
            req.flash("error", "Name too short");
            res.redirect(req.path);
            next();
            return;
        } else if (req.body.picture.length == 0) {
            req.flash("error", "Invalid image URL");
            res.redirect(req.path);
            return;
        }
        Item.findOne({_id: req.params.id}).update({
            name: req.body.name,
            description: req.body.description,
			pickup: req.body.pickup,
            picture: req.body.picture,
        }, function (err) {
            if (err) {
                req.flash("error", "Unknown error");
                res.redirect(req.path);
            } else {
                res.redirect("/item/" + req.params.id);
            }
            next();
        });

    });


    backend.post("/item/:id/want", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
        }
        Item.findOne({_id: req.params.id}).exec(function (err, item) {
			if (err || !item) {
				req.flash("error", "Item could not be found. ");
				res.redirect("/item/" + req.params.id);
				return;
			}
			if (!item.owner.equals(req.user._id)) {
				if (item.status == "posted" || item.status == "rejected" || item.status == "passed") {
					// it can be requested
					item.status = "pending";
					item.available = false;
					item.wanter = req.user._id;
					item.save();
					req.flash("success", "Waiting for the owner to respond to your request. ");
					res.redirect("/item/" + req.params.id + "/waiting");
					return;
				}
			}
			req.flash("error", "Bad request. ");
			res.redirect("/item/" + req.params.id);
        });
    });
    
	backend.post("/item/:id/accept", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
        }
        Item.findOne({_id: req.params.id}).exec(function (err, item) {
			if (err || !item) {
				req.flash("error", "Item could not be found. ");
				res.redirect("/item/" + req.params.id);
				return;
			}
			if (item.owner.equals(req.user._id)) {
				if (item.status == "pending") {
					// it can be confirmed
					item.status = "accepted";
					item.save();
					req.flash("success", "Please arrange a meeting with the person who wants it. ");
					res.redirect("/item/" + req.params.id);
					return;
				}
			}
			req.flash("error", "Bad request. ");
			res.redirect("/item/" + req.params.id);
        });
    });
    
	backend.post("/item/:id/reject", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
        }
        Item.findOne({_id: req.params.id}).exec(function (err, item) {
			if (err || !item) {
				req.flash("error", "Item could not be found. ");
				res.redirect("/item/" + req.params.id);
				return;
			}
			if (item.owner.equals(req.user._id)) {
				if (item.status == "pending") {
					// it can be confirmed
					item.status = "rejected";
					item.available = true;
					item.save();
					req.flash("success", "You have rejected the request. ");
					res.redirect("/item/" + req.params.id);
					return;
				}
			}
			req.flash("error", "Bad request. ");
			res.redirect("/item/" + req.params.id);
        });
    });
	
	backend.post("/item/:id/confirm", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
        }
        Item.findOne({_id: req.params.id}).exec(function (err, item) {
			if (err || !item) {
				req.flash("error", "Item could not be found. ");
				res.redirect("/item/" + req.params.id);
				return;
			}
			if (item.wanter && item.wanter.equals(req.user._id)) {
				if (item.status == "accepted") {
					// it can be confirmed
					
					item.status = "passed";
					item.history.push(item.owner);
					if(!(item.wanter === item.history[0])){
						User.update({_id : item.owner}, { $inc: { reputation: 3 }}).exec();
						console.log("ooooooooo");
					}
					item.owner = item.wanter;
					item.wanter = undefined;
					item.available = false;
					item.save();
					req.flash("success", "You now own the item. ");
					res.redirect("/item/" + req.params.id + "/confirmed");
					return;
				}
			}
			req.flash("error", "Bad request. ");
			res.redirect("/item/" + req.params.id);
        });
    });

    backend.post("/item/:id/available", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
			return;
        }
		Item.findOne({_id: req.params.id}, function (err, item) {
			if (err || !item) {
				req.flash("error", "Item could not be found. ");
				res.redirect("/item/" + req.params.id);
				return;
			}
			if (item.owner.equals(req.user._id)) {
				if (item.available) {
					item.available = false;
					item.save();
					req.flash("success", "The item is now unavailable. ");
					res.redirect("/item/" + item.id);
					return;
				}
				else {
					item.available = true;
					item.save();
					req.flash("success", "The item is now available. ");
					res.redirect("/item/" + item.id);
					return;
				}
			}
			req.flash("error", "Bad request. ");
			res.redirect("/item/" + req.params.id);
        });
    });

    backend.post("/user/:username/edit", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
        } else if (req.user.username != req.params.username) {
            req.flash("error", "Don't try to edit someone else's profile! ");
            res.redirect(req.originalUrl.replace("/edit", ""));
        } else {
            User.findOne({_id: req.user.id}, function (err, user) {
                res.data.profile = user;
                if (err || !user) {
                    next(err);
                } else {
					
					var newpass = req.body.newpassword || req.body.newpassword2 || req.body.oldpassword;
                    if (newpass) {
						if (req.body.newpassword != req.body.newpassword2) {
							req.flash("error", "Passwords do not match");
							res.redirect("/user/" + encodeURIComponent(user.username) + "/edit");
							next();
							return;
						}
                    	else if (req.body.newpassword.length < 3) {
							req.flash("error", "Password too short");
							res.redirect("/user/" + encodeURIComponent(user.username) + "/edit");
							next();
							return;
						}
					}

					var cont = function () {
						if (req.body.username) {
							user.username = req.body.username;
						}
						if (req.body.name) {
							user.name = req.body.name;
						}
						if (req.body.avatar) {
							user.avatar = req.body.avatar;
						}
						user.save();
						req.flash("success", "Profile modified successfully. ");
						res.redirect("/user/" + encodeURIComponent(user.username));
						next();
					}

					if (newpass) {
						bcrypt.compare(req.body.oldpassword, user.password, function (err, valid) {
							if (valid) {
								bcrypt.hash(req.body.newpassword, 8, function(err, hash) {
									user.password = hash;
									cont();
								});
							}
							else {
								req.flash("error", "Old password incorrect");
								res.redirect("/user/" + encodeURIComponent(user.username) + "/edit");
								next();
								return;
							}	
						});
					}
					else {
						cont();
					}

                }
            });
        }
    });

    backend.post("/user/:username/flag", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
        } else {
            User.findOne({username: req.params.username}, function (err, user) {
                if (err || !user) {
                    next(err);
                } else {
                    res.flagged = true;
                    if (user.flaggers.indexOf(req.user._id) === -1) {
                        user.reputation -= 20;
                        user.flaggers.push(req.user);
                        req.flash("success", "User has been flagged by you. ");
                        console.log(req.user.username + " flagged " + user.username);
                    } else {

                        user.reputation += 20;
                        user.flaggers.splice(user.flaggers.indexOf(req.user._id), 1);
                        req.flash("success", "User has been unflagged by you.");
                        console.log(req.user.username + " unflagged " + user.username);
                    }
                    user.save();
                    res.redirect("/user/" + encodeURIComponent(user.username));
                    next();
                }
            });
        }
    });

    backend.get("/map/data", function (req, res, next) {
        if (!req.user) {
            req.flash("error", "Please log in");
            res.redirect("/login");
            return;
		}
        Item.find().sort([['_id', 'descending']]).limit(100).select({_id: true, name: true, description: true, picture: true, owner: true, available: true, location: true}).populate("owner", {username: true, name: true, color: true, avatar: true, reputation: true}).lean().exec(function (err, items) {
            if (err || !items) {
                next(err);
                return;
            }
            res.data.items = items;
            next();
        });
    });

    backend.get('/logout', function (req, res) {
        req.logout();
        res.redirect("/");
    });
    
    return backend;
};
