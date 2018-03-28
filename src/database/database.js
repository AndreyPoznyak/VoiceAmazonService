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
    getArticle: (options) => {
        return Article.findOne({
            where: options
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
        });
    },

    getAllArticles: () => {
        return Article.findAndCountAll().then(result => {
            console.log("Found " + result.count + " articles");

            return result.rows;
        });
    },

    getUserArticles: () => {
        return UserArticles.findAndCountAll().then(result => {
            console.log("Found " + result.count + "user's articles");

            return result.rows;
        });
    }
};
