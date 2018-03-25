const database = require("../database/database");
const pocketProvider = require("../providers/pocket");
const validator = require("../utils/validation");
const Codes = require("../constants/httpCodes");

const wrapMessage = message => JSON.stringify({ message });

const performRequestCallback = (callback, statusCode, body) => {
    callback(null, {
        statusCode,
        body
    });
};

const trySyncDbSchema = async (callback) => {
    try {
        await database.syncDbSchema();
        return true;
    } catch (error) {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't sync database scheme."));
        return false;
    }
}

//NOTE: event Contains incoming request data (e.g., query params, headers and more)
//User API
module.exports.getAllUsers = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log("Getting all users request");

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    database.getAllUsers().then(users => {
        performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(users));
    }, error => {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get users from DB"));
    });
};

module.exports.getUser = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isEmail(info);

    console.log("Getting user with these params:", info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    database.getUser(info.email).then(user => {
        if (user) {
            performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(user));
        } else {
            performRequestCallback(callback, Codes.NOT_FOUND, wrapMessage(`User with email ${info.email} is not found`));
        }
    }, error => {
        console.log(error);

        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Getting the user failed"));
    });
};

module.exports.addUser = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = JSON.parse(event.body);
    const validationResult = validator.isUserParamsSufficient(info);

    console.log(`Adding user with these params: `, info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    database.getUser(info.email).then(user => {
        if (user) {
            performRequestCallback(callback, Codes.BAD_REQUEST, JSON.stringify({
                message: "User has already been registered",
                user: user
            }));
        } else {
            database.saveUser(info).then(result => {
                console.log(result);

                performRequestCallback(callback, Codes.CREATED, JSON.stringify({
                    message: "Successfully added user to DB",
                    user: result
                }));
            }, error => {
                console.log(error);
                performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Adding user to DB failed"));
            });
        }
    }, () => {
        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Not able to check user's presence in DB"));
    });
};

module.exports.getUserArticles = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    console.log("Getting all  user's articles request");

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    database.getUserArticles().then(userArticles => {
        performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(userArticles));
    }, error => {
        console.log(error);

        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get user's articles from DB"));
    });
};

//Articles API
module.exports.getAllArticles = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    //TODO: pass user's id and get relevant articles
    const info = event.queryStringParameters;

    console.log("Getting all articles request");

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    database.getAllArticles().then(articles => {
        performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(articles));
    }, error => {
        console.log(error);

        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get articles from DB"));
    });
};

//TODO: add user id in order to set up the relation
//TODO: save the articles
module.exports.getPocketArticles = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isPocketParamsSufficient(info);

    console.log("Getting articles from Pocket with these params: ", info);

    //TODO: move it somehow not to duplicate the code
    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    pocketProvider.getArticles(info.consumerKey, info.accessToken).then(articles => {
        console.log(articles);

        performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(articles));
    }, () => {
        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get articles from Pocket"));
    });
};

module.exports.addArticle = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = JSON.parse(event.body);
    const validationResult = validator.isArticleParamsSufficient(info);

    console.log("Adding article with these params: ", info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    if (!await trySyncDbSchema(callback)) {
        return;
    }

    database.getArticle({
        url: info.url
    }).then(article => {
        if (article) {
            performRequestCallback(callback, Codes.BAD_REQUEST, JSON.stringify({
                message: "Article has already been added",
                article: article
            }));
        } else {
            database.saveArticle(info).then(result => {
                console.log(result);
                performRequestCallback(callback, Codes.CREATED, wrapMessage("Successfully added article to DB"));
            }, error => {
                console.log(error);
                performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Adding article to DB failed"));
            });
        }
    }, error => {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Not able to check article's presence in DB"));
    });
};
