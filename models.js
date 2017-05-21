module.exports = function (mongoose) {
    var Schema = mongoose.Schema;

	var User = mongoose.model('User', {
        name: String,
        username: String,
        color: String,
        reputation: { type: Number, default: 0 },
        avatar: { type: Schema.Types.ObjectId, ref: "File" },
        flagged: { type: Boolean, default: false },
        flaggers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    });
    
	var itemSchema = new Schema({
        name: String,
        description: String,
        picture: { type: Schema.Types.ObjectId, ref: "File" },
        pickup: { type: String, default: "" },
        owner: { type: Schema.Types.ObjectId, ref: "User" },
        wanter: { type: Schema.Types.ObjectId, ref: "User" },
        status: { type: String, default: "posted" },
        history: [{ type: Schema.Types.ObjectId, ref: "User" }],
        available: Boolean,
    })
	itemSchema.index({ name: "text", description: "text", location: "text" });

    var Item = mongoose.model("Item", itemSchema);

    var Message = mongoose.model("Message", {
        owner: { type: Schema.Types.ObjectId, ref: "User" },
        to: { type: Schema.Types.ObjectId, ref: "User" },
        text: String,
        time: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
    });

    var File = mongoose.model("File", {
        hash: String,
        contenttype: String,
        trash: { type: Boolean, default: false }
    });

    return {
        User: User,
        Item: Item,
        Message: Message,
        File: File
    };
}
