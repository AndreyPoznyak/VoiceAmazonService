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

const port = 3000;
const host = "http://localhost";

console.log("Endpoints:");

Object.keys(slsConfig.functions).forEach(name => {
    let func = slsConfig.functions[name];
    let description = func.events[0].http;
    let funcName = func.handler.replace("src/api/api.", "");

    console.log(`${funcName}: ${description.method.toUpperCase()} - ${host + ":" + port}/${description.path}`);

    app[description.method](`/${description.path}`, (req, res) => {
        simulateApiCall(funcName, req, res);
    });
});


app.listen(port, () => console.log('Server launched!'));
