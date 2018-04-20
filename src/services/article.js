const database = require("../database/database");

module.exports = {
    handleArticleCreation: (userId, article) => {
        return new Promise((resolve, reject) => {
            database.getArticleWithUsers(article.url, userId)
                .then(articleWithUsers => {
                    let userInfo = {
                        userId: userId,
                        externalSystemId: article.externalSystemId
                    };

                    if (articleWithUsers) {
                        if (articleWithUsers.users.length !== 0) {
                            resolve({
                                message: "Article has already been added and linked to user"
                            });
                        } else {
                            //link existing article to user

                            database
                                .linkArticleToUser(userInfo, articleWithUsers)
                                .then(() => {
                                    resolve({ message: "Existing article successfully linked to user" });
                                }, error => {
                                    console.log(error);

                                    reject({ message: "Error: Linking article to user failed" });
                                });
                        }
                    } else {
                        //add new article and link to user
                        database
                            .saveArticle(userInfo, article)
                            .then(() => {
                                resolve({ message: "Successfully added article to DB and linked it to user" });
                            })
                            .catch(error => {
                                console.log(error);

                                reject({ message: "Error: Adding article to DB failed" });
                            });
                    }
                })
                .catch(error => {
                    console.log(error);

                    reject({ message: "Error: Not able to check article's presence in DB" });
                });
        });
    },

    isTextSaved: article => !!article.text
};

