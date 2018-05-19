const validator = require("validator");

module.exports = {
    isUserParamsSufficient: info => {
        let success = true;
        let errorMessage = "";

        if (!info || !info.email || !info.name) {
            success = false;
            errorMessage = "No necessary data specified";
        } else if (!validator.isEmail(info.email)) {
            success = false;
            errorMessage = "Invalid email address";
        }

        return {
            success: success,
            message: errorMessage
        };
    },

    isArticleParamsSufficient: info => {
        let success = true;
        let errorMessage = "";

        if (!info || !info.url) {
            success = false;
            errorMessage = "No necessary data specified";
        } else if (!validator.isURL(info.url)) {
            success = false;
            errorMessage = "The URL is invalid";
        }

        return {
            success: success,
            message: errorMessage
        };
    },

    isChangeArticleStateParamasSufficient: info => {
        let success = true;
        let errorMessage = "";

        if (!info || !info.articleData || !info.articleData.articleId ||
            !info.articleData.userId || typeof (info.articleData.active) !== 'boolean') {
            success = false;
            errorMessage = "Article data hasn't been specified";
        }

        return {
            success: success,
            message: errorMessage
        };
    },

    isPocketParamsSufficient: info => {
        let success = true;
        let errorMessage = "";

        if (!info || !info.consumerKey || !info.accessToken || !info.userId) {
            success = false;
            errorMessage = "No necessary data specified";
        }

        return {
            success,
            message: errorMessage
        }
    },

    isEmail: info => {
        if (!info || !info.email || !validator.isEmail(info.email)) {
            return {
                success: false,
                message: "Invalid or absent email address"
            }
        } else {
            return {
                success: true
            }
        }
    }
};
