const { sequelize, User, Article, UserArticles } = require("./models");

module.exports = {

    syncDbSchema: () => sequelize.sync(),

    saveUser: (info) => {
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

    //Articles
    getArticleWithUsers: (articleWhere, userWhere) => {
        return Article.findOne({
            include: [
                {
                    model: User,
                    through: {
                        where: userWhere
                    }
                }
            ],
            where: articleWhere
        });
    },

    saveArticle: (info) => {
        return Article.create({
            url: info.url,
            title: info.title,
            language: info.language || null,
            text: info.text,
            pathToSpeech: info.pathToSpeech || null,
            timeAdded: info.timeAdded || null
        }).then(addedArticle => {
            User.findOne({
                where: {
                    id: info.userId
                }
            }).then(user => {
                addedArticle.addUser(
                    user, {
                        through: {
                            progress: 0,
                            externalSystemId: info.externalSystemId || null
                        }
                    });
            });
        });
    },

    getAllArticles: () => {
        return Article.findAndCountAll().then(result => {
            console.log("Found " + result.count + " articles");

            return result.rows;
        });
    },

    getAllUserArticles: (userWhere, articleWhere) => {
        return User.findOne({
            include: [
                {
                    model: Article,
                    through: {
                        where: articleWhere
                    }
                }
            ],
            where: userWhere
        });
    },

    linkArticleToUser: (info, article) => {
        return User.findOne({
            where: {
                id: info.userId
            }
        }).then(user => {
            return user.addArticle(article, {
                    through: {
                        externalSystemId: info.externalSystemId || null
                    }
                });
        });
    }
};
