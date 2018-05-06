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
        fetch(`https://text.getpocket.com/v3/text?${queryString.stringify(params, { sort: false })}`, {
            method: "GET",
            headers: defaultHeaders
        }).then(response => response.ok ? response.json() : Promise.reject(response));
    },

    sendAction: (externalSystemId, action, consumer_key, access_token) => {
        const actionParams = {
            "action": action.rawValue,
            "item_id": externalSystemId,
            "time": new Date.now
        }

        const body = JSON.stringify({
            "consumer_key": consumerKey,
            "access_token": accessToken,
            "actions": actionParams
        })

        fetch("https://getpocket.com/v3/send", {
            method: "POST",
            headers: defaultHeaders,
            body: body
        }).then(response => response.ok ? response.json() : Promise.reject(response));
    }
};
