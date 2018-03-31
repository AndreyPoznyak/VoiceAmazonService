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

let databaseWasSynced = false; //small optimization for the scope of the same process

const syncDatabaseSchema = callback => {
    if (databaseWasSynced) {
        return Promise.resolve();
    }

    return database.syncDbSchema().then(() => {
        databaseWasSynced = true;
    }, error => {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't sync database schema."));
    });
};

//NOTE: event Contains incoming request data (e.g., query params, headers and more)

//User API
module.exports.getAllUsers = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log("Getting all users request");

    syncDatabaseSchema(callback).then(() => {
        database.getAllUsers().then(users => {
            performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(users));
        }, error => {
            console.log(error);
            performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get users from DB"));
        });
    });
};

module.exports.getUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isEmail(info);

    console.log("Getting user with these params:", info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    syncDatabaseSchema(callback).then(() => {
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
    });
};

module.exports.addUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = JSON.parse(event.body);
    const validationResult = validator.isUserParamsSufficient(info);

    console.log(`Adding user with these params: `, info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    syncDatabaseSchema(callback).then(() => {
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
    });
};

//Articles API
module.exports.getAllArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    //TODO: pass user's id and get relevant articles
    const info = event.queryStringParameters;

    console.log("Getting all articles request");

    syncDatabaseSchema(callback).then(() => {
        database.getAllArticles().then(articles => {
            performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(articles));
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get articles from DB"));
        });
    });
};

//TODO: add user id in order to set up the relation
//TODO: save the articles
module.exports.getPocketArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isPocketParamsSufficient(info);

    console.log("Getting articles from Pocket with these params: ", info);

    //TODO: move it somehow not to duplicate the code
    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    syncDatabaseSchema(callback).then(() => {
        pocketProvider.getArticles(info.consumerKey, info.accessToken).then(articles => {
            console.log(articles);

            performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(articles));
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get articles from Pocket"));
        });
    });
};

module.exports.addArticle = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = JSON.parse(event.body);
    const validationResult = validator.isArticleParamsSufficient(info);

    console.log("Adding article with these params: ", info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
        return;
    }

    syncDatabaseSchema(callback).then(() => {
        database.getArticleWithUsers({
                url: info.url
            }, {
                userId: info.userId
            }).then(articleWithUsers => {
                if (articleWithUsers) {
                    if ((articleWithUsers.users || []).length !== 0) {
                        performRequestCallback(callback,
                            Codes.BAD_REQUEST,
                            JSON.stringify({
                                message: "Article has already been added and linked with user",
                                userId: info.userId,
                                article: article
                            }));
                    } else {
                        //link existing article to user 
                        database.linkArticleToUser(info.userId, articleWithUsers).then(result => {
                                console.log(result);
                                performRequestCallback(callback,
                                    Codes.CREATED,
                                    wrapMessage("Existing article successfully linked to user"));
                            }, error => {
                                console.log(error);
                                performRequestCallback(callback,
                                    Codes.INTERNAL_ERROR,
                                    wrapMessage("Error: Adding article to DB failed"));
                            });
                    }
                } else {
                    database.saveArticle(info).then(result => {
                            console.log(result);
                            performRequestCallback(callback,
                                Codes.CREATED,
                                wrapMessage("Successfully added article to DB"));
                        }, error => {
                            console.log(error);
                            performRequestCallback(callback,
                                Codes.INTERNAL_ERROR,
                                wrapMessage("Error: Adding article to DB failed"));
                        });
                }
            }, error => {
                console.log(error);
                performRequestCallback(callback,
                    Codes.INTERNAL_ERROR,
                    wrapMessage("Error: Not able to check article's presence in DB"));
            });
    });
};
