const fetch = require("node-fetch");

module.exports = {
    getArticles: (consumerKey, accessToken) => {
        return fetch("https://getpocket.com/v3/get", {
            method: "POST",
            headers: {
                "Content-Type":"application/json",
                "X-Accept": "application/json"
            },
            body: JSON.stringify({
                "consumer_key": consumerKey,
                "access_token": accessToken,
                "state": "all"
            })
        }).then(response => response.ok ? response.json() : Promise.reject());
    }
};
