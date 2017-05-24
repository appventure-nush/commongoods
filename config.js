var https = require("https");

module.exports = {
	creds: {
		identityMetadata: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
		issuer: [
			// Will be initialised by below code
			//"https://login.microsoftonline.com/d72a7172-d5f8-4889-9a85-d7424751592a/v2.0",
			//"https://login.microsoftonline.com/5ba5ef5e-3109-4e77-85bd-cfeb0d347e82/v2.0"
		],
		clientID: "e5e7ff39-2c17-4ccd-8827-e67565006a4d",
		responseType: "id_token",
		responseMode: "form_post",
		redirectUrl: "https://" + process.env.DOMAIN + "/auth",
		allowHttpForRedirectUrl: false,
		useCookieInsteadOfSession: false,
		cookieEncryptionKeys: [
			{ key: "708733ffcec881322ba98bd53fb2dc90", iv: "7f6491d2f473" }
		],
		scope: ["profile", "email"],
		loggingLevel: "info"
	},
	allowed: /(nhs.+@nus\.edu\.sg|h1310031@nushigh\.edu\.sg|h1210108@nushigh\.edu\.sg|appventure@nushigh.edu.sg)/
};

var issuers = ["nushigh.edu.sg", "nus.edu.sg"];
issuers.forEach((issuer) => {
	https.get("https://login.microsoftonline.com/" + issuer + "/v2.0/.well-known/openid-configuration", (res) => {
		if (res.statusCode != 200) {
			res.resume();
			return;
		}
		res.setEncoding("utf8");
		var rawData = "";
		res.on("data", (chunk) => { rawData += chunk });
		res.on("end", () => {
			try {
				var parsedData = JSON.parse(rawData);
				module.exports.creds.issuer.push(parsedData.issuer);
			} catch (e) {
				console.error(e.message);
			}
		});
	});
});
