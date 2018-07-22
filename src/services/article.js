const database = require("../database/database");
const serviceTypes = require("../constants/serviceTypes")
const pocketProvider = require("../providers/pocket");
const helper = require("../utils/helper");

module.exports = {
    //review perfomance
    handleArticleCreation: (userId, article) => {
        return new Promise((resolve, reject) => {
            database.getArticleWithUsers(article.url, userId)
                .then(articleWithUsers => {
                    let userInfo = {
                        userId: userId,
                        externalSystemId: article.externalSystemId,
                        active: article.active,
                        service: article.service,
                        timeAdded: article.timeAdded
                    };

                    if (articleWithUsers) {
                        if (articleWithUsers.users.length !== 0) {
                            resolve({
                                article: articleWithUsers,
                                message: "Article has already been added and linked to user"
                            });
                        } else {
                            //link existing article to user

                            database
                                .linkArticleToUser(userInfo, articleWithUsers)
                                .then(() => {
                                    resolve({
                                        article: articleWithUsers,
                                        message: "Existing article successfully linked to user" });
                                }, error => {
                                    console.log(error);

                                    reject({ message: "Error: Linking article to user failed" });
                                });
                        }
                    } else {
                        //add new article and link to user
                        database
                            .saveArticle(userInfo, article)
                            .then((addedArticle) => {
                                resolve({
                                    article: addedArticle,
                                    message: "Successfully added article to DB and linked it to user" });
                            })
                            .catch(error => {
                                console.log(error);

                                reject({ message: "Error: Adding article to DB failed" });
                            });
                    }
                })
                .catch(error => {
                    console.log(error);

                    reject({ message: "Error: Not able to check article's presence in DB" });
                });
        });
    },

    mapPocketArticle: (pocketArticle) => {
        return {
            url: pocketArticle.resolved_url,
            resolvedUrl: pocketArticle.resolved_url,
            title: pocketArticle.resolved_title || null,
            service: serviceTypes.POCKET,
            timeAdded: pocketArticle.time_added,
            externalSystemId: pocketArticle.resolved_id,
            active: pocketArticle.status == "0"
        }
    },

    mapDatabaseArticle: (dbArticleWithUser) => {
        const isUserDataExist = dbArticleWithUser &&
                                dbArticleWithUser.users &&
                                dbArticleWithUser.users.length > 0 &&
                                dbArticleWithUser.users[0].userArticles;
        return {
            url: dbArticleWithUser.resolvedUrl,
            resolvedUrl: dbArticleWithUser.resolvedUrl,
            title: dbArticleWithUser.title || null,
            service: isUserDataExist ? dbArticleWithUser.users[0].userArticles.service : null,
            timeAdded: isUserDataExist ? dbArticleWithUser.users[0].userArticles.timeAdded : null,
            externalSystemId: isUserDataExist ? dbArticleWithUser.users[0].userArticles.externalSystemId : null,
            active: isUserDataExist ? dbArticleWithUser.users[0].userArticles.active : null
        }
    },

    changeState: (articleData, consumerKey, accessToken) => {
        return database.getArticleById(articleData.articleId, articleData.userId)
            .then(article => {
                if (!article || !article.users || !article.users[0].userArticles) {
                    return Promise.reject({ message: "Cannot find article or userArticles relation" });
                }

                return database.updateUserArticleState(articleData);
            })
            .then(userArticlesModel => {
                switch (userArticlesModel.service) {
                    case serviceTypes.POCKET:
                        if (!consumerKey || !accessToken) {
                            return Promise.reject({ message: "Consumer key or access token hasn't been specified" });
                        }
                        return pocketProvider.updateArticleState(userArticlesModel.externalSystemId,
                             articleData.active, consumerKey, accessToken);
                    case serviceTypes.VOICE:
                        return { message: `Article state has been changed to ${articleData.active}` };
                    default:
                        return Promise.reject({ message: "Article belongs to unknown service" });
                }
            });
    },

    deleteVoiceArticle: (userId, articleId) => {
        return database.getArticleById(articleId, userId)
            .then(article => {
                if (!article || !article.users || !article.users[0].userArticles) {
                    return Promise.reject({ message: "Cannot find article or userArticles relation" });
                }

                if (article.users[0].userArticles.service !== serviceTypes.VOICE) {
                    return Promise.reject({ message: "Cannot delete article with service type not equals to Voice" });
                }

                return database.deleteUserArticleRelation(userId, articleId);
            })
    },

    getPocketArticles: (consumerKey, accessToken, userId) => {
        return pocketProvider.getArticles(consumerKey, accessToken)
            .then(pocketArticlesArray => {

                if (pocketArticlesArray) {
                    //TODO: do not use module.exports
                    const articleDtos = pocketArticlesArray.map(a => module.exports.mapPocketArticle(a))

                    const articlePromises = [];

                    const uniqueArticles = helper.removeDuplicatesByUniqueKey(articleDtos, 'url');
                    uniqueArticles.forEach(article => {

                        console.log("Adding article with these params: ", article);
                        articlePromises.push(module.exports.handleArticleCreation(userId, article))

                    });

                    return Promise.all(articlePromises)
                        .then(responses => {
                            //add id field(from our db) to articles which come from pocket
                            const articlesFromDb = responses.map(resp => resp.article);
                            uniqueArticles.forEach(ua => {
                                const theSameArticle = articlesFromDb.find(a => a.url === ua.url);
                                if (theSameArticle != null) {
                                    ua.id = theSameArticle.id
                                }
                            });

                            return uniqueArticles;
                        })
                }

            })
            .catch(error => {
                console.log(error);
                return Promise.reject({ Message: `Can't get articles from Pocket due to error: ${error.message}` })
            });
    },

    getVoiceArticles: (userId) => {
        return database.getUsersArticles(userId, serviceTypes.VOICE);
    },

    getAllArticles: () => {
        return database.getAllArticles();
    }
};

