'use strict'

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TableName = {
    USERS: "users"
};

module.exports = {
    saveUser: (info) => {
        const params = {
            TableName: TableName.USERS,
            Item: {
                email: info.email,
                avatarPath: info.avatarPath || null,
                facebookId: info.facebookId || null,
                googleId: info.googleId || null,
                firstName: info.firstName || null,
                lastName: info.lastName || null,
                name: info.name || null
            }
        };

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

        return dynamoDb.get(params).promise().then(response => response.Item);
    }
};
