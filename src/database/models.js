const Sequelize = require('sequelize');
const dbCredentials = require("../../data/config");
//TODO: initialize it once and then inject?
const sequelize = new Sequelize(dbCredentials.postgres);

const User = sequelize.define("user", {
    email: Sequelize.STRING,
    name: Sequelize.STRING,
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING,
    avatarPath: Sequelize.STRING,
    loginDate: Sequelize.DATE
});

const Article = sequelize.define("article", {
    url: Sequelize.STRING,
    title: Sequelize.STRING,
    language: Sequelize.STRING,
    text: Sequelize.STRING,
    pathToSpeech: Sequelize.STRING,
    timeAdded: Sequelize.DATE //TODO: why do we need it?
});

const UserArticles = sequelize.define("userArticles", {
    progress: Sequelize.INTEGER,
    externalSystemId: Sequelize.STRING  //string maybe
});

User.belongsToMany(Article, { through: UserArticles });
Article.belongsToMany(User, { through: UserArticles });

module.exports = {
    User,
    Article,
    UserArticles
};
