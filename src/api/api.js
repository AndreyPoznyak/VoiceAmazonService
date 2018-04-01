const database = require("../database/database");
const pocketProvider = require("../providers/pocket");
const validator = require("../utils/validation");
const Codes = require("../constants/httpCodes");

const wrapMessage = message => JSON.stringify({ message });

const performRequestCallback = (callback, statusCode, body) => {
    callback(null, {statusCode,body});
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

const handleArticle = (info) => {
    return database.getArticleWithUsers(info.url, info.userId)
        .then(articleWithUsers => {
            let result = null;
            if (articleWithUsers) {
                if ((articleWithUsers.users || []).length !== 0) {
                    result = {
                        message: "Article has already been added and linked with user"
                    };
                } else {
                    //link existing article to user 
                    result = database
                        .linkArticleToUser(info, articleWithUsers)
                        .then(result => {
                            return { message: "Existing article successfully linked to user" };
                        })
                        .catch(error => {
                            console.log(error);
                            return { message: "Error: Linking article to user failed" };
                        });
                }
            } else {
                //add new article and link to user
                result = database
                    .saveArticle(info)
                    .then(result => {
                        return { message: "Successfully added article to DB and linked it to user" };
                    })
                    .catch(error => {
                        console.log(error);
                        return { message: "Error: Adding article to DB failed" };
                    });
            }

            return result;
        })
        .catch(error => {
            console.log(error);
            return { message: "Error: Not able to check article's presence in DB" };
        });
}

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
                database.updateUsersLoginDate(user).then(() => {
                    performRequestCallback(callback, Codes.BAD_REQUEST, JSON.stringify({
                        message: "User has already been registered",
                        user: user
                    }));
                }, error => {
                    console.log(error);
                    performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Not able to update user's login date"));
                });
            } else {
                database.saveUser(info).then(savedUser => {
                    performRequestCallback(callback, Codes.CREATED, JSON.stringify({
                        message: "Successfully added user to DB",
                        user: savedUser
                    }));
                }, error => {
                    console.log(error);
                    performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Adding user to DB failed"));
                });
            }
        }, error => {
            console.log(error);
            performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Not able to check user's presence in DB"));
        });
    });
};

//Articles API
module.exports.getAllArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;

    console.log("Getting all articles request");

    syncDatabaseSchema(callback).then(() => {
        
        if ((info || {}).userId) {
            database.getAllUserArticles({ id: info.userId }, {}).then(userWithArticles => {
                performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(userWithArticles.articles));
            }, error => {
                console.log(error);

                performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get articles from DB"));
            });
        } else {
            database.getAllArticles().then(articles => {
                performRequestCallback(callback, Codes.SUCCESS, JSON.stringify(articles));
            }, error => {
                console.log(error);

                performRequestCallback(callback, Codes.INTERNAL_ERROR, wrapMessage("Error: Can't get articles from DB"));
            });
        }
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

module.exports.addArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const articles = JSON.parse(event.body);

    (articles || []).forEach(article => {
        const validationResult = validator.isArticleParamsSufficient(article);

        console.log("Adding article with these params: ", article);

        if (!validationResult.success) {
            performRequestCallback(callback, Codes.BAD_REQUEST, wrapMessage(`Error: ${validationResult.message}`));
            return;
        }
    });

    syncDatabaseSchema(callback)
        .then(() => {
            //hanlde articles synchronously one by one
            const messages = [];
            (articles || []).reduce((promise, item) => {
                return promise.then(_ => {
                    return handleArticle(item).then(data => {
                        messages.push(data.message);
                        return data;
                    });
                });
            }, Promise.resolve())
                .then(response => {
                    callback(null,
                        {
                            statusCode: Codes.CREATED,
                            body: messages
                        });
                });
        });
};
