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
    console.log("Getting all users request");
    database.getAllUsers().then(users => {
        performRequestCallback(callback, 200, JSON.stringify(users));
    }).catch(error => {
        console.log(error);
        performRequestCallback(callback, 400, "Error: Can't get users from DB");
    });
};

module.exports.getUser = (event, context, callback) => {
    const info = event.queryStringParameters;

    console.log(`Getting user with these params: ${info}`);

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

    console.log(`Adding user with these params: ${info}`);

    if (!info.email || info.email.indexOf("@") === -1) {
        performRequestCallback(callback, 400, "Error: request data is not valid");
        return;
    }

    //TODO: figure out what happens if the email already registered - should be error
    database.saveUser(info.email).then(result => {
        console.log(result);
        performRequestCallback(callback, 200, "Successfully added test user to DB");
    }, error => {
        console.log(error);
        performRequestCallback(callback, 400, "Error when adding test user to DB");
    });
};
