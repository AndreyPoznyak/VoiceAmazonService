const database = require("../database/database");

const wrapMessage = message => JSON.stringify({ message });

const performRequestCallback = (callback, statusCode, body) => {
    callback(null, {
        statusCode,
        body
    });
};

//NOTE: event Contains incoming request data (e.g., query params, headers and more)

module.exports.getAllUsers = (event, context, callback) => {
    console.log("Getting all users request");
    database.getAllUsers().then(users => {
        performRequestCallback(callback, 200, JSON.stringify(users));
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, 400, wrapMessage("Error: Can't get users from DB"));
    });
};

module.exports.getUser = (event, context, callback) => {
    const info = event.queryStringParameters;

    console.log(`Getting user with these params: ${info}`);

    if (!info || !info.email || info.email.indexOf("@") === -1) {
        performRequestCallback(callback, 400, wrapMessage("Error: request data is not valid"));
        return;
    }

    database.getUser(info.email).then(user => {
        if (user) {
            performRequestCallback(callback, 200, JSON.stringify(user));
        } else {
            performRequestCallback(callback, 404, wrapMessage(`User with email ${info.email} is not found`));
        }
    }).catch(error => {
        console.log(error);
        //TODO: add 404
        performRequestCallback(callback, 400, wrapMessage("Error: Getting the user failed"));
    });
};

module.exports.addUser = (event, context, callback) => {
    const info = JSON.parse(event.body);

    console.log(`Adding user with these params: ${info}`);

    if (!info.email || info.email.indexOf("@") === -1) {
        performRequestCallback(callback, 400, wrapMessage("Error: request data is not valid"));
        return;
    }

    database.getUser(info.email).then(user => {
        if (user) {
            performRequestCallback(callback, 400, JSON.stringify({
                message: "User has already been registered",
                user: user
            }));
        } else {
            database.saveUser(info).then(result => {
                console.log(result);
                performRequestCallback(callback, 200, wrapMessage("Successfully added user to DB"));
            }, error => {
                console.log(error);
                performRequestCallback(callback, 400, wrapMessage("Error: Adding user to DB failed"));
            });
        }
    }, () => {
        performRequestCallback(callback, 400, wrapMessage("Error: Not able to check user's presence in DB"));
    });
};
