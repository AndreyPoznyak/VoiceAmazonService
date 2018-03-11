const models = require("./models");

const User = models.User;
const Article = models.Article;

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
                name: info.name || null
            });
        }, error => {
            console.log(error);
        });
    },

    getAllUsers: () => {
        return User.findAndCountAll().then(result => {
            console.log("Found " + result.count + " users");
            return result.rows;
        });
    },

    getUser: (email) => {
        //TODO: add email validation

        return User.findOne({
            where: {
                email
            }
        });
    }
};
