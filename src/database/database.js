'use strict'

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TableName = {
    USERS: "users"
};

module.exports = {
    saveUser: (email) => {
        const params = {
            TableName: TableName.USERS,
            Item: {}
        };
        const userInfo = {
            email: email,
            name: "User Name"
        };

        //TODO: add validation of coming fields
        params.Item = userInfo;

        return dynamoDb.put(params).promise();
    },

    getAllUsers: () => {
        const params = {
            TableName: TableName.USERS
        };

        return dynamoDb.scan(params).promise().then(response => response.Items);
    },

    getUser: (email) => {
        //TODO: add email validation
        const params = {
            TableName: TableName.USERS,
            Key: {
                email: email
            }
        };

        return dynamoDb.get(params).promise();
    }
};
