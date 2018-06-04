import * as cloud from "@pulumi/cloud-aws";
import { Output } from "@pulumi/pulumi"; // for output property
import { parse } from "path";

// TODO validate the token

interface SlackSlashCommandPostBody {
    token: string;
    team_id: string;
    team_domain: string;
    channel_id: string;
    channel_name: string;
    user_id: string;
    command: string;
    text: string;
    response_url: string;
    trigger_id: string;
}

type SlackSlashCommandResponseType = "in_channel";

interface SlackSlashCommandResponse {
    response_type?: SlackSlashCommandResponseType;
    text: string;
    attachments?: SlackSlashCommandResponseAttachment[];
}

interface SlackSlashCommandResponseAttachment {
    text: string;
}




// Create an API endpoint
let endpoint = new cloud.HttpEndpoint("echo");

endpoint.get("/test", async (req, res) => {
    const now = Date.now();
    console.log(now);
    res.status(200).end(now.toString());
});

endpoint.post("/echo", async (req, res) => {
    const data = parseUrlEncodedBody(req.body);

    const response: SlackSlashCommandResponse = {
        response_type: "in_channel",
        text: data.text,
    };

    res.status(200).json(response);
});

const quoteTable = new cloud.Table("quotes");

// quote-add [name] [value]
endpoint.post("/quote-add", async (req, res) => {
    const data = parseUrlEncodedBody(req.body);

    const kvp = getIdValue(data.text);
    if (!kvp) {
        res.status(400).end();
        return;
    }

    console.log(`Saving '${kvp.key}'='${kvp.value}'`);

    // Fetch the array.
    const value = await quoteTable.get({ id: kvp.key });
    const array: string[] = (value && value.array) || [];

    // Add a new value.
    array.push(kvp.value);

    // Save the updated array in the table.
    await quoteTable.insert({ id: kvp.key, array: array});

    // Only visible to the person who issued the command.
    const response: SlackSlashCommandResponse = {
        text: `"${kvp.value}" added for '${kvp.key}'`,
    };

    res.status(200).json(response);
});

interface KeyValuePair<K, V> {
    key: K;
    value: V;
}

function getIdValue(text: string): KeyValuePair<string, string> | undefined {
    text = (text || "").trim();
    const index = text.indexOf(" ");
    if (index !== -1) {
        const id = text.substr(0, index).trim();
        const value = text.substr(index + 1).trim();
        return {
            key: id,
            value: value,
        };
    }

    return undefined;
}

// /quote-rando [name]
endpoint.post("/quote-rando", async (req, res) => {
    const data = parseUrlEncodedBody(req.body);

    // TODO validate data.text

    const id = data.text.trim();

    // Fetch the array.
    const value = await quoteTable.get({ id: id });
    const array: string[] = (value && value.array) || [];

    if (array.length === 0) {
        // Only visible to the person who issued the command.
        const response: SlackSlashCommandResponse = {
            text: `No quotes for '${id}'.`,
        };
        res.status(200).json(response);
        return;
    }

    console.log(array);

    const quote = array[Math.floor(Math.random() * array.length)];

    // Show to entire channel.
    const response: SlackSlashCommandResponse = {
        response_type: "in_channel",
        text: quote,
    };
    res.status(200).json(response);
});


// /quote-clear [name]
endpoint.post("/quote-clear", async (req, res) => {
    const data = parseUrlEncodedBody(req.body);

    // TODO validate data.text

    const id = data.text.trim();

    await quoteTable.delete({ id: id });

    // Only visible to the person who issued the command.
    const response: SlackSlashCommandResponse = {
        text: `Cleared all quotes for '${id}'.`,
    };
    res.status(200).json(response);
});


// Hack the Planet!
// Mess with the best, die like the rest.
// Spandex: it's a privilege, not a right.

function parseUrlEncodedBody(body: Buffer): SlackSlashCommandPostBody {
    const parse = require("buffer-urlencoded");
    const data = parse(body);
    const result: any = {};
    for (const key of Object.keys(data)) {
        result[key] = data[key].toString();
    }
    return result;
}

export let endpointUrl = endpoint.publish().url;
