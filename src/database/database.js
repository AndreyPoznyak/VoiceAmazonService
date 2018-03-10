const models = require("./models");

//sequelize
//    .authenticate()
//    .then(() => {
//        console.log('Connection has been established successfully.');
//    })
//    .catch(err => {
//        console.error('Unable to connect to the database:', err);
//    });

const User = models.User;
const Article = models.Article;

module.exports = {
    saveUser: (info) => {
        //TODO: do not do it all the time
        User.sync().then(result => {
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
            console.log(error)
        });
    },

    getAllUsers: () => {
        return User.findAndCountAll();
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
