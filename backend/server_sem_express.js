// server.js

const http = require('http'); //Módulo nativo do Node.js
const hostname = '127.0.0.1'; //localhost
const port = 3000;

const server = http.createServer((req, res) =>{
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text-plain');
    res.end('Hello world! Este é o seu primeiro servidor Node.js\n');
});

server.listen(port, hostname, () => {
    console.log(`Servidor rodando em http://${hostname}:${port}/`);
});