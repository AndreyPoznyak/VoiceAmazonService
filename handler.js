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
        if(error) {
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
    

    callback(null, {
        statusCode: 200,
        body: "Hello"
    });
};

module.exports.hello = (event, context, callback) => {
    console.log(event); // Contains incoming request data (e.g., query params, headers and more)

    const response = {
        statusCode: 200,
        headers: {
            "x-custom-header" : "whatever"
        },
        body: JSON.stringify({
            message: "Testing the API. Hello mathafaka!"
        })
    };

    callback(null, response);
};
