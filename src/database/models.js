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
    //store in this column resolved_url for Pocket articles and any url for Voice articles
    //this field is unique
    url: Sequelize.STRING(2000),
    //store in this column resolved_url from Pocket response after parsing content.
    //this field is not unique and needed mainaly for Voice articles just in case
    resolvedUrl: Sequelize.STRING(2000),
    title: Sequelize.STRING(500),//todo: trim title before adding?
    language: Sequelize.STRING,
    pathToSpeech: Sequelize.STRING
}, {
        indexes: [
            {
                unique: true,
                fields: ['url']
            }
        ]
    });

const ArticleContent = sequelize.define("articleContent", {
    images: Sequelize.TEXT, //json with images data
    text: Sequelize.TEXT,
}, {
        freezeTableName: true,
        tableName: 'articleContent'
    });

const UserArticles = sequelize.define("userArticles", {
    externalSystemId: Sequelize.STRING,
    active: Sequelize.BOOLEAN,
    service: Sequelize.STRING,
    timeAdded: Sequelize.DATE 
});

User.belongsToMany(Article, { through: UserArticles });
Article.belongsToMany(User, { through: UserArticles });

Article.hasOne(ArticleContent);

module.exports = {
    sequelize,
    User,
    Article,
    UserArticles,
    ArticleContent
};
