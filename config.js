module.exports = {
	oidc: {
		issuer: process.env.ISSUER || "https://login.nushigh.edu.sg/sso",
		client_id: process.env.CLIENT_ID || "commongoods",
		client_secret: process.env.CLIENT_SECRET || "812Ri48Zqp1lrbWoaHZmszi8TCEH0D8k",
		redirect_uri: process.env.REDIRECT_URI || "http://commongoods.nushigh.edu.sg/callback",
	},
	allowed: process.env.DEBUG ? /(nhs.+@nus\.edu\.sg|.+@nushigh\.edu\.sg)/ : /(nhs.+@nus\.edu\.sg|nhs.+@nushigh.edu.sg)/
};
