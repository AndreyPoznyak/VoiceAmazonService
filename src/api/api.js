const database = require("../database/database");
const pocketProvider = require("../providers/pocket");
const validator = require("../utils/validation");
const Codes = require("../constants/httpCodes");
const helper = require("../utils/helper");
const articleService = require("../services/article");

const performRequestCallback = (callback, statusCode, body) => callback(null, { statusCode, body: JSON.stringify(body, null, 4) });

module.exports.syncDbSchema = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;

    database.syncDbSchema(info).then(() => {
        performRequestCallback(callback, Codes.SUCCESS, 'Db schema has been successfully synced');
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, `Error: Can't sync database schema: ${error.message}`);
    });
};

//NOTE: event Contains incoming request data (e.g., query params, headers and more)

//User API
module.exports.getAllUsers = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    console.log("Getting all users request");

    database.getAllUsers().then(users => {
        performRequestCallback(callback, Codes.SUCCESS, users);
    }, error => {
        console.log(error);
        performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get users from DB");
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

    database.getUser(info.email).then(user => {
        if (user) {
            database.updateUserData(user, info).then(() => {
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
};

//Articles API
module.exports.getAllArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;

    console.log("Getting articles request");

    //TODO: copy-paste can be removed here
    if (info && info.userId) {
        database.getUsersArticles(info.userId).then(articles => {
            performRequestCallback(callback, Codes.SUCCESS, articles);
        }, error => {
            console.log(error);

            //TODO: handle separately cases with no users and no articles
            performRequestCallback(callback, Codes.NOT_FOUND, "Error: Can't get user's articles from DB");
        });
    } else {
        database.getAllArticles().then(articles => {
            performRequestCallback(callback, Codes.SUCCESS, articles);
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get all articles from DB");
        });
    }
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

    pocketProvider.getArticles(info.consumerKey, info.accessToken).then(pocketArticlesArray => {

        if (pocketArticlesArray) {
            const articleDtos = pocketArticlesArray.map(a => articleService.getArticleDto(a))

            const articlePromises = [];

            const uniqueArticles = helper.removeDuplicatesByUniqueKey(articleDtos, 'url');
            uniqueArticles.forEach(article => {
                const validationResult = validator.isArticleParamsSufficient(article);

                console.log("Adding article with these params: ", article);
                articlePromises.push(articleService.handleArticleCreation(info.userId, article))

            });

            Promise.all(articlePromises)
                .then(responses => {
                    //add id field(from our db) to articles which come from pocket
                    const articlesFromDb = responses.map(resp => resp.article);
                    uniqueArticles.forEach(ua => {
                        const theSameArticle = articlesFromDb.find(a => a.url === ua.url);
                        if (theSameArticle != null) {
                            ua.id = theSameArticle.id
                        }
                    });

                    performRequestCallback(callback, Codes.SUCCESS, uniqueArticles);
                })
                .catch(error => {
                    performRequestCallback(callback, Codes.INTERNAL_ERROR, error);
                });
        }

    }, error => {
        console.log(error);

        performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get articles from Pocket");
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

    //NOTE: it creates new article as well
    const handleArticleWithLinkToUser = article => {
        return articleService.handleArticleCreation(info.userId, article).catch(error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, `Error: ${error.message}`);

            return Promise.reject();
        });
    };

    const sendData = article => {
        //TODO: maybe ust send the whole article
        performRequestCallback(callback, Codes.SUCCESS, {
            article: JSON.parse(article.text),
            lang: article.language,
            images: JSON.parse(article.images),
            url: article.url
        });
    };

    const handleContent = (article, linkingStatus) => {
        pocketProvider.getContent(article.url).then(result => {
            database.updateArticleData({
                url: result["resolvedUrl"],
                text: result["article"],
                images: result["images"],
                language: result["lang"],
                title: result["title"]
            }, article).then(() => {
                console.log(linkingStatus);

                sendData(article);
            }, error => {
                console.log(error);

                performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Not able to save article's text");
            });
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get parsed article's text from Pocket");
        });
    };

    database.getArticle(info.url).then(article => {
        if (article) {
            if (articleService.isTextSaved(article)) {
                handleArticleWithLinkToUser(article).then(linkingResult => {
                    console.log(linkingResult);

                    sendData(article);
                });
            } else {
                handleArticleWithLinkToUser(article).then(linkingResult => {
                    handleContent(article, linkingResult);
                });
            }
        } else {
            handleArticleWithLinkToUser({
                url: info.url
            }).then(linkingResult => {
                //TODO: maybe call the outer method again (DRY)
                database.getArticle(info.url).then(article => {
                    handleContent(article, linkingResult);
                }, error => {
                    console.log(error);

                    performRequestCallback(callback, Codes.INTERNAL_ERROR, `Error: Not able to get just saved article from DB`);
                });
            });
        }
    }, error => {
        console.log(error);

        performRequestCallback(callback, Codes.INTERNAL_ERROR, `Error: Not able to get the article from DB`);
    });
};

//NOTE: not relevant atm
module.exports.addArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const body = JSON.parse(event.body);

    const articlePromises = [];

    if (body && body.articles && body.userId) {
        const articles = helper.removeDuplicatesByUniqueKey(body.articles, 'url');

        articles.forEach(article => {
            const validationResult = validator.isArticleParamsSufficient(article);

            if (validationResult.success) {
                console.log("Adding article with these params: ", article);
                articlePromises.push(articleService.handleArticleCreation(body.userId, article));
                //.catch(error => error) can be added here in order for everything to be resolved
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
};
