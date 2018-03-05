function AutoRenderer() {
    var parser = new DOMParser();
    this.handles = [];
    this.context = {};
    function Handle(scriptElement, context) {
        var templateString = scriptElement.innerHTML;
        this.template = Handlebars.compile(templateString);
        this.context = context || {};
        this.element = scriptElement;
    }
    Handle.prototype.update = function (newContext) {
        newContext && (this.context = newContext);
        var rawHTML = this.template(this.context);
        var newElement = document.createElement("div");
        Array.prototype.forEach.call(parser.parseFromString(rawHTML, "text/html").firstChild.childNodes[1].childNodes, function (ele) {
            newElement.appendChild(ele);
        });
        this.element.parentElement.replaceChild(newElement, this.element);
        this.element = newElement;
    };
    var scriptElements = document.querySelectorAll("script[type='text/x-handlebars-template']");
    Array.prototype.forEach.call(scriptElements, function (scriptElement) {
        var handler = new Handle(scriptElement, this.context);
        this.handles.push(handler);
    }.bind(this));
}

AutoRenderer.prototype.update = function (newContext) {
    for (var i = 0; i < this.handles.length; i++) {
        var handle = this.handles[i];
        if (handle.context == this.context) {
            handle.update(newContext);
        }
    }
    this.context = newContext;
}

var a = new AutoRenderer();

var socket = io({
    path: window.location.pathname.split("messaging")[0] + "socket.io"
});

var cont = {
    messages: [],
    to: {},
    me: {}
};

var reconnecting = false;;

socket.on("badauth", function () {
    window.location = window.location.pathname.split("messaging")[0] + "login";
});

socket.on("badto", function (e) {
    cont.messages.push({
        ismeta: true,
        text: "Unable to send message"
    });
    a.update(cont);
});

socket.on("error", function (e) {
    cont.messages.push({
        ismeta: true,
        text: socket.connected ? "Unable to send message(s)" : e
    });
    document.getElementById("message").disabled = true;
    document.getElementById("messagesubmit").disabled = true;
    console.error(e);
    a.update(cont);
});
socket.on("connect_error", function (e) {
    if (!reconnecting && e.message == "xhr poll error") {
        cont.messages.push({
            ismeta: true,
            text: "Connection failed"
        });
    }
    console.error(e);
    a.update(cont);
});
socket.on("connect_timeout", function (e) {
    cont.messages.push({
        ismeta: true,
        text: "Connection timeout"
    });
    reconnecting = false;
    console.error(e);
    a.update(cont);
});
socket.on("reconnect_attempt", function (e) {
    if (!reconnecting) {
        cont.messages.push({
            ismeta: true,
            text: "Reconnecting..."
        });
    }
    reconnecting = true;
    a.update(cont);
});
socket.on("reconnect_failed", function (e) {
    cont.messages.push({
        ismeta: true,
        text: "Couldn't reconnect, reload the page to continue"
    });
    reconnecting = false;
    a.update(cont);
});
socket.on("reconnect", function (e) {
    cont.messages.push({
        ismeta: true,
        text: "Reconnected!"
    });
    document.getElementById("message").disabled = false;
    document.getElementById("messagesubmit").disabled = false;
    reconnecting = false;
    a.update(cont);
});
socket.on("disconnected", function (e) {
    cont.messages.push({
        ismeta: true,
        text: "Disconnected: " + e
    });
    reconnecting = false;
    a.update(cont);
});

var getuser = new Promise(function (resolve, reject) {
    socket.emit("getuser", {
        username: decodeURIComponent(window.location.pathname.split("/").pop())
    }, function (data) {
        if (!data._id) {
            cont.messages.push({
                ismeta: true,
                text: "User is not on commongoods yet!"
            });
            a.update(cont);
        }
        cont.to = data;
        resolve();
    });
});

var getme = new Promise(function (resolve, reject) {
    socket.emit("getme", null, function (data) {
        resolve();
        cont.me = data;
    });
});


Promise.all([getme, getuser]).then(function () {

    socket.emit("pastmessages", {
        to: cont.to,
    });

    socket.on("message", function (message, fn) {
        console.log(message);
        if (message.isself ? (cont.to._id == message.to) : (cont.to._id == message.owner)) {
            if (sending == true) {
                sending = false;
                document.getElementById("message").disabled = false;
                document.getElementById("messagesubmit").disabled = false;
                document.getElementById("message").value = "";
            }
            cont.messages.push(message);
            a.update(cont);
            window.scrollTo(0, document.getElementById("messageform").offsetTop);
            fn("success");
        }
        else {
            fn("ignore");
        }
    });

});

var sending = false;

document.getElementById("messageform").addEventListener("submit", function (e) {
    e.preventDefault();
    if (socket.connected) {
        if (sending == true) {
            return;
        }
        sending = true;
        socket.emit("message", {
            text: document.getElementById("message").value,
            to: cont.to
        });
        document.getElementById("message").disabled = true;
        document.getElementById("messagesubmit").disabled = true;
    } else if (cont.messages[cont.messages.length-1].isunable != true) {
        cont.messages.push({
            ismeta: true,
            isunable: true,
            text: "Not connected, unable to send message"
        });
        a.update(cont);
    }
});

