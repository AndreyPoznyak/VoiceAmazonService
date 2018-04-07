const { sequelize, User, Article, UserArticles } = require("./models");

module.exports = {

    syncDbSchema: () => sequelize.sync(),
    //syncDbSchema: () => sequelize.sync({ force: true }),

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

    updateUsersLoginDate: (user) => {
        const now = Date.now();

        console.log(`Updating user ${user.id} login date from ${user.loginDate} to ${now}`);

        user.loginDate = now;

        return user.save();
    },

    //Articles
    getArticleUserRelation: (articleUrl, userId) => {
        return Article.findOne({
            include: [
                {
                    model: User,
                    through: {
                        where: { userId: userId }
                    }
                }
            ],
            where: { url: articleUrl }
        });
    },

    saveArticle: (userInfo, article) => {
        return Article.create({
            url: article.url,
            title: article.title,
            language: article.language || null,
            text: article.text,
            pathToSpeech: article.pathToSpeech || null,
            timeAdded: article.timeAdded || null
        }).then(addedArticle => {
            User.findOne({
                where: {
                    id: userInfo.userId
                }
            }).then(user => {
                addedArticle.addUser(
                    user, {
                        through: {
                            externalSystemId: userInfo.externalSystemId || null
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
