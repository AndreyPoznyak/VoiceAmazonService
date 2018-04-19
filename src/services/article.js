const database = require("../database/database");

module.exports = {
    handleArticleCreation: (userId, article) => {
        return database.getArticleWithUsers(article.url, userId)
            .then(articleWithUsers => {
                let result = null;
                let userInfo = {
                    userId: userId,
                    externalSystemId: article.externalSystemId
                };

                if (articleWithUsers) {
                    if (articleWithUsers.users.length !== 0) {
                        result = {
                            message: "Article has already been added and linked to user"
                        };
                    } else {
                        //link existing article to user

                        result = database
                            .linkArticleToUser(userInfo, articleWithUsers)
                            .then(() => {
                                return { message: "Existing article successfully linked to user" };
                            })
                            .catch(error => {
                                console.log(error);
                                return { message: "Error: Linking article to user failed" };
                            });
                    }
                } else {
                    //add new article and link to user
                    result = database
                        .saveArticle(userInfo, article)
                        .then(() => {
                            return { message: "Successfully added article to DB and linked it to user" };
                        })
                        .catch(error => {
                            console.log(error);
                            return { message: "Error: Adding article to DB failed" };
                        });
                }

                return result;
            })
            .catch(error => {
                console.log(error);
                return { message: "Error: Not able to check article's presence in DB" };
            });
    },

    isTextSaved: article => !!article.text
};

