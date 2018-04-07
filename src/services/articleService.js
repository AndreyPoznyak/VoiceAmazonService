const database = require("../database/database");

module.exports = {
    handleArticleCreation: (userId, article) => {
        return database.getArticleUserRelation(article.url, userId)
            .then(articleUserRelation => {
                let result = null;
                var userInfo = {
                    userId: userId,
                    externalSystemId: article.externalSystemId
                };
                if (articleUserRelation) {
                    if (articleUserRelation.users.length !== 0) {
                        result = {
                            message: "Article has already been added and linked to user"
                        };
                    } else {
                        //link existing article to user

                        result = database
                            .linkArticleToUser(userInfo, articleUserRelation)
                            .then(result => {
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
                        .then(result => {
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
    }
}

