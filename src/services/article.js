const database = require("../database/database");
const serviceTypes = require("../constants/serviceTypes")

module.exports = {
    //review perfomance
    handleArticleCreation: (userId, article) => {
        return new Promise((resolve, reject) => {
            database.getArticleWithUsers(article.url, userId)
                .then(articleWithUsers => {
                    let userInfo = {
                        userId: userId,
                        externalSystemId: article.externalSystemId,
                        active: article.active
                    };

                    if (articleWithUsers) {
                        if (articleWithUsers.users.length !== 0) {
                            resolve({
                                article: articleWithUsers,
                                message: "Article has already been added and linked to user"
                            });
                        } else {
                            //link existing article to user

                            database
                                .linkArticleToUser(userInfo, articleWithUsers)
                                .then(() => {
                                    resolve({
                                        article: articleWithUsers,
                                        message: "Existing article successfully linked to user" });
                                }, error => {
                                    console.log(error);

                                    reject({ message: "Error: Linking article to user failed" });
                                });
                        }
                    } else {
                        //add new article and link to user
                        database
                            .saveArticle(userInfo, article)
                            .then((addedArticle) => {
                                resolve({
                                    article: addedArticle,
                                    message: "Successfully added article to DB and linked it to user" });
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

    isTextSaved: article => !!article.text,

    getArticleDto: (pocketArticle) => {
        return {
            url: pocketArticle.resolved_url,
            title: pocketArticle.resolved_title || null,
            service: serviceTypes.POCKET,
            timeAdded: Date.now(), //maybe it should be a column in UserArticles table. There is time_added field in pocket's response
            externalSystemId: pocketArticle.resolved_id,
            active: pocketArticle.status == "0"
        }
    }
};
