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
    pathToSpeech: Sequelize.STRING
});

module.exports = {
    User,
    Article
};