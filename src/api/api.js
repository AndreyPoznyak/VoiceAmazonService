const database = require("../database/database");
const pocketProvider = require("../providers/pocket");
const validator = require("../utils/validation");
const Codes = require("../constants/httpCodes");
const helper = require("../utils/helper");
const articleService = require("../services/article");
const serviceTypes = require("../constants/serviceTypes");

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

/*
PATH: GET /articles/all
INPUT MODEL: -
QUERY PARAMS: ?userId=1 or without any params
NOTE: returns all user articles if userId was specified or returns all articles from article table
 */
module.exports.getAllArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;

    console.log("Getting articles request");

    //TODO: copy-paste can be removed here
    if (info && info.userId) {
        database.getUsersArticles(info.userId)
        .then(articles => {
            performRequestCallback(callback, Codes.SUCCESS, articles);
        }, error => {
            console.log(error);

            //TODO: handle separately cases with no users and no articles
            performRequestCallback(callback, Codes.NOT_FOUND, "Error: Can't get user's articles from DB");
        });
    } else {
        database.getAllArticles()
        .then(articles => {
            performRequestCallback(callback, Codes.SUCCESS, articles);
        }, error => {
            console.log(error);

            performRequestCallback(callback, Codes.INTERNAL_ERROR, "Error: Can't get all articles from DB");
        });
    }
};

/*
PATH: GET /articles/voice
INPUT MODEL: -
QUERY PARAMS: ?userId=1
NOTE: returns articles with service === voice
 */
module.exports.getVoiceArticles = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isGetVoiceArticlesParamsSufficient(info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }
    console.log("Getting Voice articles request");

    database.getUsersArticles(info.userId, serviceTypes.VOICE)
    .then(articles => {
        performRequestCallback(callback, Codes.SUCCESS, articles);
    }, error => {
        console.log(error);

        performRequestCallback(callback, Codes.NOT_FOUND, "Error: Can't get user's Voice articles from DB");
    });
};

/*
PATH: GET /articles/pocket
INPUT MODEL: -
QUERY PARAMS: ?accessToken=4b70fcad-ff4b-9ebc-cd49-1a73df&consumerKey=63497-a7f14af78faac366dd755311&userId=1
NOTE: make a call to PocketApi, then add and link articles to user in DB if needed
 */
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

/*
PATH: GET /content
INPUT MODEL: -
QUERY PARAMS: ?userId=1&articleId=1   or    ?userId=1&url=someurl
NOTE: consumers can get content by server article id in the majority of cases.
But if consumer doesn't have article Id(breake connection or something else)
there is an ability to get content by article url - in this case server will add new article
or link existing article to user by url.
 */
module.exports.getArticlesContent = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;
    const validationResult = validator.isGetArticlesContentParamsSufficient(info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    const handleContent = (article) => {
        if (article.articleContent) {
            return sendData(article);
        }

        //get content from pocket, save in db and get article with content again
        return pocketProvider.getContent(article.url)
            .then(result => {
                return database.updateArticleData({
                    resolvedUrl: result["resolvedUrl"],
                    text: result["article"],
                    images: result["images"],
                    language: result["lang"],
                    title: result["title"]
                }, article)
            })
            //get updated article data
            .then(() => database.findArticleById(article.id))
            .then(updatedArticleWithContent => sendData(updatedArticleWithContent));
    }

    const sendData = article => {
        performRequestCallback(callback, Codes.SUCCESS, {
            article: JSON.parse(article.articleContent.text),
            lang: article.language,
            images: JSON.parse(article.articleContent.images),
            url: article.url,
            id: article.id
        });
    }

    if (info.url) {
        //create article if not exist and link to user
        return articleService.handleArticleCreation(info.userId, { url: info.url })
            .then(linkingRes => database.findArticleByUrl(info.url))
            .then(article => handleContent(article))
            .catch(error => {
                console.log(error);
                return performRequestCallback(callback, Codes.INTERNAL_ERROR, error.message);
            });
    }

    return database.findArticleById(info.articleId)
        .then(article => handleContent(article))
        .catch(error => {
            console.log(error);
            return performRequestCallback(callback, Codes.INTERNAL_ERROR, error.message);
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

/*
PATH: PUT /articles/state
INPUT MODEL:
{
    "articleData":{
        "articleId": 1,
        "userId": 1,
        "active": false
    },
    "consumerKey": "000-000-000",
    "accessToken": "000-000-000"
 }
 NOTE: pass active == true to restore article from archive.
 Pass active == false to move article to archive
 */
module.exports.changeArticleState = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const body = JSON.parse(event.body);

    const validationResult = validator.isChangeArticleStateParamasSufficient(body);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    articleService.changeState(body.articleData, body.consumerKey, body.accessToken)
        .then(response => {
            performRequestCallback(callback, Codes.SUCCESS, response);
        })
        .catch(error => {
            performRequestCallback(callback, Codes.INTERNAL_ERROR, error);
        });
};

/*
PATH: DELETE /articles
QUERY PARAMS: ?userId=1&articleId=1
 NOTE: Only for Voice articles. Delete the relation between user and article.
 */
module.exports.deleteArticle = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const info = event.queryStringParameters;

    const validationResult = validator.isDeleteArticleParamasSufficient(info);

    if (!validationResult.success) {
        performRequestCallback(callback, Codes.BAD_REQUEST, `Error: ${validationResult.message}`);
        return;
    }

    articleService.deleteVoiceArticle(info.userId, info.articleId)
        .then(response => {
            performRequestCallback(callback, Codes.SUCCESS, 'Article has been successfully deleted');
        })
        .catch(error => {
            performRequestCallback(callback, Codes.INTERNAL_ERROR, error);
        });
};
