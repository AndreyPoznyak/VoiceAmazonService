'use strict'

// const {
//     graphql,
//     GraphQLSchema,
//     GraphQLObjectType,
//     GraphQLString,
//     GraphQLNonNull
// } = require('graphql');

const database = require("../database/database");

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

module.exports.users = (event, context, callback) => {
    database.getAllUsers().then(users => {
        performRequestCallback(callback, 200, JSON.stringify(users));
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, 400, "Can't get users from DB");
    });
};

module.exports.adduser = (event, context, callback) => {
    //event Contains incoming request data (e.g., query params, headers and more)

    database.saveUser().then(() => {
        performRequestCallback(callback, 200, "Successfully added test user to DB");
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, 400, "Error when adding test user to DB");
    });
};
