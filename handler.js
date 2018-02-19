'use strict'

const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLNonNull
} = require('graphql');

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const promisify = foo => new Promise((resolve, reject) => {
    foo((error, result) => {
        if (error) {
            reject(error)
        } else {
            resolve(result)
        }
    })
})

// const schema = new GraphQLSchema({
//     query: new GraphQLObjectType({
//         name: 'RootQueryType' // an arbitrary name
//     }),
// });

module.exports.query = (event, context, callback) => {
    let statusCode = 200;
    let message = "";

    const params = {
        TableName: "users",
        //Key: {
        //    email: "test"
        //}
    };

    //dynamoDb.get(params, (error, result) => {
    dynamoDb.scan(params, (error, result) => {
        if (error) {
            statusCode = 400;
            message = "Can't get users from DB";
        } else {
            if (result.Count > 0) {
                message = JSON.stringify(result.Items)
            } else {
                message = "Users not found";
                statusCode = 404;
            }
        }

        callback(null, {
            statusCode: statusCode,
            body: message
        });
    });
};

module.exports.hello = (event, context, callback) => {
    //event Contains incoming request data (e.g., query params, headers and more)
    let statusCode = 200;
    let message = "Successfully added test user to DB"

    const params = {
        TableName: "users",
        Item: {
            email: `testmail@${Date.now()}.com`,
            name: "User Name"
        }
    };

    dynamoDb.put(params, (error) => {
        if (error) {
            console.log(error);
            statusCode = 400;
            message = "Error when adding test user to DB"
        }

        callback(null, {
            statusCode: statusCode,
            body: message
        });
    });
};
