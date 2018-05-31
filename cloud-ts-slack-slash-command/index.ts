import * as cloud from "@pulumi/cloud-aws";
import { Output } from "@pulumi/pulumi"; // for output property

// Create an API endpoint
let endpoint = new cloud.HttpEndpoint("echo");

endpoint.get("/echo", async (req, res) => {
    const now = Date.now();
    console.log(`Responding with ${now}`);
    res.status(200).json({ now: now });
});

export let endpointUrl = endpoint.publish().url;
