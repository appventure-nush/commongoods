module.exports.makeString = function makeString(n) {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < n; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
};
module.exports.validators = {
	username: function (t) {
		if (t.length < 0) {
			return "too short";
		}
		else {
			return true;
		}
	},
	password: function (t) {
		if (t.length < 8) {
			return "too short";
		}
		else {
			return true;
		}
	},
	title: function (t) {
		if (t.length < 4) {
			return "too short";
		}
		else {
			return true;
		}
	},
	description: function (t) {
		return true;
	},
};
