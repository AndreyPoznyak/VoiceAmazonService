const YAML = require('yamljs');
const express = require('express');

const app = express();

const slsConfig = YAML.load('serverless.yml');

Object.values(slsConfig.functions).forEach(func => {
    let description = func.events[0].http;
    let funcName = func.handler;

    if (description.method === "post") {
        app.post(description.path, (req, res) => {
            //res.send('Hello World!');
        });
    } else if (description.method === "get") {
        app.get(description.path, (req, res) => {
            //res.send('Hello World!');
        });
    } else {
        console.log("Unsupported http method detected");
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

//app.listen(3000, () => console.log('Test server listening on port 3000!'));
