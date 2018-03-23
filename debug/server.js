const YAML = require('yamljs');
const express = require('express');
const bodyParser = require('body-parser');
const api = require('../src/api/api');

const app = express();
const slsConfig = YAML.load('serverless.yml');

app.use(bodyParser.json());

const simulateApiCall = (method, request, response) => {
    const event = {
        queryStringParameters: request.query,
        body: JSON.stringify(request.body || {})
    };
    const context = {};
    const callback = (uselessParam, options) => {
        response.status(options.statusCode).send(options.body);
    };

    api[method](event, context, callback);
};

console.log("Endpoints:");

Object.values(slsConfig.functions).forEach(func => {
    let description = func.events[0].http;
    let funcName = func.handler.replace("src/api/api.", "");

    console.log(`${funcName}: ${description.method} - /${description.path}`);

    app[description.method](`/${description.path}`, (req, res) => {
        simulateApiCall(funcName, req, res);
    });
});

const port = 3000;

app.listen(port, () => console.log('Test server listening here: ' + 'http://localhost:' + port + '/'));
