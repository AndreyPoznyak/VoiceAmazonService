const database = require("../database/database");
const pocketProvider = require("../providers/pocket");
const validator = require("../utils/validation");
const Codes = require("../constants/httpCodes");
const helper = require("../utils/helper");
const articleService = require("../services/article");

const performRequestCallback = (callback, statusCode, body) => callback(null, { statusCode, body: JSON.stringify(body, null, 4) });

let databaseWasSynced = false; //small optimization for the scope of the same process

const syncDatabaseSchema = callback => {
    if (databaseWasSynced) {
        return Promise.resolve();
    }

    return database.syncDbSchema().then(() => {
        databaseWasSynced = true;
    }, error => {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't sync database schema.");
    });
};

//NOTE: event Contains incoming request data (e.g., query params, headers and more)

//User API
module.exports.getAllUsers = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    console.log("Getting all users request");

    syncDatabaseSchema(callback).then(() => {
        database.getAllUsers().then(users => {
            performRequestCallback(callback, Codes.SUCCESS, users);
        }, error => {
            console.log(error);
            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get users from DB");
        });
    });
};

module.exports.getUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isEmail(info);

    console.log("Getting user with these params:", info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    syncDatabaseSchema(callback).then(() => {
        database.getUser(info.email).then(user => {
            if (user) {
                performRequestCallback(callback, Codes.SUCCESS, user);
            } else {
                performRequestCallback(callback, Codes.NOT_FOUND, `User with email ${info.email} is not found`);
            }
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Getting the user failed");
        });
    });
};

module.exports.addUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = JSON.parse(event.body);
    const validationResult = validator.isUserParamsSufficient(info);

    console.log(`Adding user with these params: `, info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    syncDatabaseSchema(callback).then(() => {
        database.getUser(info.email).then(user => {
            if (user) {
                database.makeUsersInfoUpToUpdate(user, info).then(() => {
                    performRequestCallback(callback, Codes.BAD_REQUEST, {
                        message: "User has already been registered",
                        user: user
                    });
                }, error => {
                    console.log(error);
                    performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Not able to update user's login date and other params");
                });
            } else {
                database.saveUser(info).then(savedUser => {
                    performRequestCallback(callback, Codes.CREATED, {
                        message: "Successfully added user to DB",
                        user: savedUser
                    });
                }, error => {
                    console.log(error);
                    performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Adding user to DB failed");
                });
            }
        }, error => {
            console.log(error);
            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Not able to check user's presence in DB");
        });
    });
};

//Articles API
module.exports.getAllArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;

    console.log("Getting all articles request");

    syncDatabaseSchema(callback).then(() => {

        if (info && info.userId) {
            database.getAllUserArticles({ id: info.userId }, {}).then(usersArticles => {
                performRequestCallback(callback, Codes.SUCCESS, usersArticles.articles);
            }, error => {
                console.log(error);

                performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get articles from DB");
            });
        } else {
            database.getAllArticles().then(articles => {
                performRequestCallback(callback, Codes.SUCCESS, articles);
            }, error => {
                console.log(error);

                performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get articles from DB");
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
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    syncDatabaseSchema(callback).then(() => {
        pocketProvider.getArticles(info.consumerKey, info.accessToken).then(articles => {
            performRequestCallback(callback, Codes.SUCCESS, articles);
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get articles from Pocket");
        });
    });
};

module.exports.getArticlesContent = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isArticleParamsSufficient(info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    const linkArticleToUser = article => {
        articleService.handleArticleCreation(info.userId, article).then(result => {
            performRequestCallback(callback, Codes.SUCCESS, {
                content: article.text,
                notes: result
            });
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, `Error: ${error.message}`);
        });
    };

    const fetchContent = () => {
        pocketProvider.getContent(info.url).then(result => {
            //link to user
            database.addTextToArticle(result, article).then(() => {
                linkArticleToUser(article);
            }, error => {
                console.log(error);

                performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Not able to save article's text");
            });
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get parsed article's text from Pocket");
        });
    };

    syncDatabaseSchema(callback).then(() => {
        database.getArticle(info.url).then(article => {
            if (article) {
                if (articleService.isTextSaved(article)) {
                    linkArticleToUser(article);
                } else {
                    fetchContent();
                }
            } else {
                fetchContent();
                //performRequestCallback(callback, Codes.BAD_REQUEST, `Error: Not able to find such article`);
            }
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, `Error: Not able to get the article from DB`);
        });
    });
};

//NOTE: not relevant atm
module.exports.addArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const body = JSON.parse(event.body);

    syncDatabaseSchema(callback)
        .then(() => {
            const articlePromises = [];

            if (body && body.articles && body.userId) {
                const articles = helper.removeDuplicatesByUniqueKey(body.articles, 'url');

                articles.forEach(article => {
                    const validationResult = validator.isArticleParamsSufficient(article);

                    if (validationResult.success) {
                        console.log("Adding article with these params: ", article);
                        articlePromises.push(articleService.handleArticleCreation(body.userId, article))
                    } else {
                        console.log("Validation error has been occured for article: ", article);
                        articlePromises.push(Promise.resolve({ message: `Error: ${validationResult.message}` }))
                    }
                });
            } else {
                performRequestCallback(callback, Codes.BAD_REQUEST, `Error: invalid input model`);
            }

            Promise.all(articlePromises)
                .then(responses => {
                    performRequestCallback(callback, Codes.CREATED, responses.map(response => response.message));
                })
                .catch(error => {
                    performRequestCallback(callback, Codes.INTERNAL_ERROR, error);
                });
        });
};
