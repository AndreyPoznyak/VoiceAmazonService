'use strict'

const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLNonNull
} = require('graphql');

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'RootQueryType' // an arbitrary name
    }),
});

module.exports.query = (event, context, callback) => graphql(schema, event.queryStringParameters.query)
    .then(result => callback(null, {
            statusCode: 200,
            body: JSON.stringify(result)
        }), error => callback(error)
    );

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
