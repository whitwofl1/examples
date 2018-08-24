import { createServer } from "http";

createServer((req, res) => {
    res.writeHead(200);
    res.end("Hello World, from Pulumi!");
}).listen(8080);
