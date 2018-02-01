var express = require("express");

var frontend = express.Router();
var prefix = "/";

frontend.use(function (req, res, next) {
    res.data.error = req.flash("error");
    res.data.success = req.flash("success");
	res.data.DEBUG = process.env.DEBUG;
	res.data.prefix = prefix;
    next();
});

frontend.get("/", function (req, res) {
    res.data.showfooter = true;
    res.data.transparentnav = true;
    res.render("home", res.data);
});

frontend.get("/user/:username", function (req, res) {
    res.render("user", res.data);
});

frontend.get("/user/:username/edit", function (req, res) {
    res.data.editing = true;
    res.render("editprofile", res.data);
});

frontend.get("/search", function (req, res) {
    res.data.showfooter = true;
    res.data.title = "Searching for \"" + req.query.q + "\"";
    res.data.query = req.query.q;
    res.render("itemlist", res.data);
});

frontend.get("/new", function (req, res) {
    res.render("itemadd", res.data);
});

frontend.get("/item/:id", function (req, res) {
    res.render("item", res.data);
});

frontend.get("/item/:id/edit", function (req, res) {
    res.data.editing = true;
    res.render("itemadd", res.data);
});

frontend.get("/item/:id/give", function (req, res) {
    res.render("give", res.data);
});
frontend.get("/item/:id/waiting", function (req, res) {
    res.render("want", res.data);
});
frontend.get("/item/:id/confirmed", function (req, res) {
    res.render("confirmed", res.data);
});

frontend.get("/login", function (req, res) {
    res.render("login", res.data);
});

frontend.get("/notifications", function (req, res) {
    if (res.data.notifications) {
        res.data.notifications.forEach(function (item, index, array) {
            item["is" + item.type] = true;
        });
    }
    res.render("notifications", res.data);
});

frontend.get("/messaging/*", function (req, res) {
    res.render("messaging", res.data);
});
frontend.get("/faq", function (req, res) {
    res.data.showfooter = true;
    res.render("faq", res.data);
});

frontend.get("/about", function (req, res) {
    res.data.showfooter = true;
    res.render("about", res.data);
});

frontend.use(express.static('assets'));

module.exports = function (p) {
    prefix = p;
    return frontend;
};
