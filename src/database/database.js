const models = require("./models");

const { User, Article }  = models;

module.exports = {
    saveUser: (info) => {
        //TODO: do not do it all the time
        return User.sync().then(result => {
            console.log(result);

            return User.create({
                email: info.email,
                avatarPath: info.avatarPath || null,
                facebookId: info.facebookId || null,
                googleId: info.googleId || null,
                firstName: info.firstName || null,
                lastName: info.lastName || null,
                name: info.name
            });
        }, error => {
            console.log(error);

            return Promise.reject(error);
        });
    },

    getAllUsers: () => {
        return User.findAndCountAll().then(result => {
            console.log("Found " + result.count + " users");
            return result.rows;
        });
    },

    getUser: (email) => {
        //TODO: make sure that the table is created

        return User.findOne({
            where: {
                email
            }
        });
    },

    //Articles
    getArticle: (options) => {
        //TODO: do not do it all the time, this is to be sure that the table is created, get is always called before add
        return Article.sync().then(() => {
            return Article.findOne({
                where: options
            });
        }, error => {
            return Promise.reject(error);
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
    }
};
