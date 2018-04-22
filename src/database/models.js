const Sequelize = require('sequelize');
const { postgres } = require("../../data/config");

const sequelize = new Sequelize(postgres);

const User = sequelize.define("user", {
    email: Sequelize.STRING,
    name: Sequelize.STRING,
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING,
    avatarPath: Sequelize.STRING,
    facebookId: Sequelize.STRING,
    googleId: Sequelize.STRING,
    loginDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
        indexes: [
            {
                unique: true,
                fields: ['email']
            }
        ]
    });

const Article = sequelize.define("article", {
    service: Sequelize.STRING, //without relation for now, "voice" or "pocket" :)
    url: Sequelize.STRING(2000),
    title: Sequelize.STRING(500),//todo: trim title before adding?
    language: Sequelize.STRING,
    images: Sequelize.TEXT, //json with images data
    text: Sequelize.TEXT,
    pathToSpeech: Sequelize.STRING,
    timeAdded: Sequelize.DATE //TODO: why do we need it?
}, {
        indexes: [
            {
                unique: true,
                fields: ['url']
            }
        ]
    });

const UserArticles = sequelize.define("userArticles", {
    externalSystemId: Sequelize.STRING
    //active: Sequelize.BOOLEAN
});

User.belongsToMany(Article, { through: UserArticles });
Article.belongsToMany(User, { through: UserArticles });

module.exports = {
    sequelize,
    User,
    Article,
    UserArticles
};
