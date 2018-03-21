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

        if (!info || !info.title || !info.text) {
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

    isEmail: info => {
        if (!info || !validator.isEmail(info.email)) {
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
