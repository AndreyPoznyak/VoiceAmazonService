const fetch = require("node-fetch");
const queryString = require('query-string');
const { pocket } = require("../../data/config");

const defaultHeaders = {
    "Content-Type": "application/json",
    "X-Accept": "application/json"
};

module.exports = {
    //TODO: take consumerKey from consts
    getArticles: (consumerKey, accessToken) => {
        return fetch("https://getpocket.com/v3/get", {
            method: "POST",
            headers: defaultHeaders,
            body: JSON.stringify({
                "consumer_key": consumerKey,
                "access_token": accessToken,
                "state": "all"
            })
        }).then(response => new Promise((resolve, reject) => {

            if (response.ok) {
                response.json().then(content => {
                    const pocketArticlesArray = [];

                    if (content && content.list) {
                        Object.keys(content.list).forEach(key => { pocketArticlesArray.push(content.list[key]) });
                    }

                    resolve(pocketArticlesArray);
                });
            } else {
                reject(response)
            }
        }));
    },

    getContent: (articlesUrl) => {
        const params = {
            "consumer_key": pocket.consumerKey,
            "url": articlesUrl,
            "images": "0",
            "videos": "0",
            "refresh": "0",
            "output": "json"
        };
        //            "state": "unread"
        return fetch(`https://text.getpocket.com/v3/text?${queryString.stringify(params, { sort: false })}`, {
            method: "GET",
            headers: defaultHeaders
        }).then(response => response.ok ? response.json() : Promise.reject(response));
    },

    updateArticleState: (externalSystemId, active, consumerKey, accessToken) => {
        //if active == true -> we need to post readd(restore from archive) action, otherwise move to archive
        const actionParams = {
            "action": active ? "readd" : "archive",
            "item_id": externalSystemId,
            "time": new Date()
        }

        const body = JSON.stringify({
            "consumer_key": consumerKey,
            "access_token": accessToken,
            "actions": [actionParams]
        })

        return fetch("https://getpocket.com/v3/send", {
            method: "POST",
            headers: defaultHeaders,
            body: body
        }).then(response => response.ok ? response.json() : Promise.reject(response));
    }
};
