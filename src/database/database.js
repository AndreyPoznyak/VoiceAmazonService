const { sequelize, User, Article, UserArticles, ArticleContent } = require("./models");
const serviceTypes = require("../constants/serviceTypes");

module.exports = {

    syncDbSchema: (info) => {
        //we can extend this func in future
        return sequelize.sync({ force: info.force || false })
        //return Article.sync({ force: info.force || false })

        //syncDbSchema: () => sequelize.sync({ force: true }),
        //syncDbSchema: () => Article.sync({ force: true }),
    },


    saveUser: (info) => {
        //loginDate is now by default
        return User.create({
            email: info.email,
            avatarPath: info.avatarPath || null,
            facebookId: info.facebookId || null,
            googleId: info.googleId || null,
            firstName: info.firstName || null,
            lastName: info.lastName || null,
            name: info.name
        });
    },

    getAllUsers: () => {
        return User.findAndCountAll().then(result => {
            console.log("Found " + result.count + " users");
            return result.rows;
        });
    },

    getUser: (email) => {
        return User.findOne({
            where: {
                email
            }
        });
    },

    updateUserData: (user, info) => {
        const now = Date.now();

        console.log(`Updating user ${user.id} login date from ${user.loginDate} to ${now}`);

        user.loginDate = now;

        if (info.name && !user.name) {
            user.name = info.name;
        }

        if (info.firstName && !user.firstName) {
            user.firstName = info.firstName;
        }

        if (info.lastName && !user.lastName) {
            user.lastName = info.lastName;
        }

        if (info.facebookId && !user.facebookId) {
            user.facebookId = info.facebookId;
        }

        if (info.googleId && !user.googleId) {
            user.googleId = info.googleId;
        }

        return user.save();
    },

    //Articles
    saveArticle: (userInfo, article) => {
        return Article.create({
            url: article.url,
            resolvedUrl: article.resolvedUrl || null,
            title: article.title || null,
            language: article.language || null,
            pathToSpeech: article.pathToSpeech || null
        }).then(addedArticle => {
                return addedArticle.addUser(userInfo.userId, {
                    through: {
                        externalSystemId: userInfo.externalSystemId || null,
                        active: userInfo.active || true,
                        service: article.service || serviceTypes.VOICE,
                        timeAdded: article.timeAdded ? new Date(article.timeAdded * 1000) : new Date(Date.now())
                    }
                }).then(() => addedArticle);
            })
    },

    getAllArticles: () => {
        return Article.findAndCountAll().then(result => {
            console.log("Found " + result.count + " articles");

            return result.rows;
        });
    },

    findArticleById: id => {
        return Article.findOne({
            include: [{
                model: ArticleContent
            }],
            where: {
                id
            }
        });
    },

    findArticleByUrl: url => {
        return Article.findOne({
            include: [{
                model: ArticleContent
            }],
            where: {
                url
            }
        });
    },

    updateArticleData: (parameters, article) => {
        console.log(`Updating parameters of article ${article.id}`);

        article.language = parameters.language || article.language;
        article.url = parameters.url || article.url;
        article.resolvedUrl = parameters.resolvedUrl || article.resolvedUrl;
        article.title = parameters.title || article.title;

        return article.getArticleContent()
            .then(existingContent => {
                //update existing content or create new
                if (existingContent) {
                    existingContent.text = parameters.text ? JSON.stringify(parameters.text) : existingContent.text;
                    existingContent.images = parameters.images ? JSON.stringify(parameters.images) : existingContent.images;
                    return existingContent;
                }

                return ArticleContent.create({
                    text: parameters.text ? JSON.stringify(parameters.text) : null,
                    images: parameters.images ? JSON.stringify(parameters.images) : null
                });
            })
            .then(content => article.setArticleContent(content))
            .then(() => article.save())
            .catch(error => {
                console.log(error);
                reject({message: "Error: Not able to update article's content"});
            });
    },

    getUsersArticles: (userId) => {
        return User.findOne({
            include: [{ model: Article }],
            where: { id: userId }
        }).then(user => {
            return user ? user.articles : Promise.reject("There is no such user")
        });
    },

    //TODO: rethink it since it deals with 1 user only and 1 article only - maybe use method above
    getArticleWithUsers: (articleUrl, userId) => {
        return Article.findOne({
            include: [{
                model: User,
                through: {
                    where: { userId }
                }
            }],
            where: { url: articleUrl }
        });
    },

    getArticleById: (articleId, userId) => {
        return Article.findOne({
            include: [{
                model: User,
                through: {
                    attributes: ["externalSystemId", "active", "id", "service", "timeAdded"],
                    where: { userId }
                }
            }, {
                model: ArticleContent
            }],
            where: {
                id: articleId,
            }
        });
    },

    linkArticleToUser: (info, article) => {
        return article.addUser(info.userId, {
            through: {
                externalSystemId: info.externalSystemId || null,
                active: info.active || true,
                service: article.service || serviceTypes.VOICE,
                timeAdded: article.timeAdded ? new Date(article.timeAdded * 1000) : new Date(Date.now())
            }
        });
    },

    updateUserArticleState: (articleData) => {
        return UserArticles.findOne({
            where: {
                articleId: articleData.articleId,
                userId: articleData.userId
            }
        }).then(model => {
            const newActiveState = typeof (articleData.active) === 'boolean' ? articleData.active : model.active;
            model.active = newActiveState

            return model.save()
        });
    }
};
