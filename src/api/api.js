'use strict'

const database = require("../database/database");

// const {
//     graphql,
//     GraphQLSchema,
//     GraphQLObjectType,
//     GraphQLString,
//     GraphQLNonNull
// } = require('graphql');

// const schema = new GraphQLSchema({
//     query: new GraphQLObjectType({
//         name: 'RootQueryType' // an arbitrary name
//     }),
// });

const performRequestCallback = (callback, statusCode, body) => {
    callback(null, {
        statusCode: statusCode,
        body: body
    });
};

//NOTE: event Contains incoming request data (e.g., query params, headers and more)

module.exports.getAllUsers = (event, context, callback) => {
    database.getAllUsers().then(users => {
        performRequestCallback(callback, 200, JSON.stringify(users));
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, 400, "Error: Can't get users from DB");
    });
};

module.exports.getUser = (event, context, callback) => {
    const info = event.queryStringParameters;

    if (!info || !info.email || info.email.indexOf("@") === -1) {
        performRequestCallback(callback, 400, "Error: request data is not valid");
        return;
    }

    database.getUser(info.email).then(user => {
        performRequestCallback(callback, 200, JSON.stringify(user));
    }).catch(error => {
        console.log(error);
        //TODO: add 404
        performRequestCallback(callback, 400, "Error: Getting the user failed");
    });
};

module.exports.addUser = (event, context, callback) => {
    const info = JSON.parse(event.body);

    if (!info.email || info.email.indexOf("@") === -1) {
        performRequestCallback(callback, 400, "Error: request data is not valid");
        return;
    }

    database.saveUser(info.email).then(() => {
        performRequestCallback(callback, 200, "Successfully added test user to DB");
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, 400, "Error when adding test user to DB");
    });
};
