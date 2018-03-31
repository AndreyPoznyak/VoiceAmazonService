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
    getArticle: (options) => {
        return Article.findOne({
            where: options
        });
    },

    //TODO: link with user
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

    //TODO: rewrite it
    getUserArticles: () => {
        return UserArticles.findAndCountAll().then(result => {
            console.log("Found " + result.count + "user's articles");

            return result.rows;
        });
    }
};
