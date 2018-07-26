import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";
import { calendar_v3 } from "googleapis";

class GoogleCalendarEventProvider implements dynamic.ResourceProvider {
    check(olds: any, news: any) {
        return Promise.resolve({
            inputs: news,
            failedChecks: this.validateRequiredProperties(news, ["summary", "start", "end"])
        });
    }

    async diff(id: pulumi.ID, olds: any, news: any) { return {} };

    async create(inputs: any) {
        const calendar = await this.getCalendar();

        const body = this.eventFromPropertyBag(inputs);

        const res = await calendar.events.insert({
            calendarId: "primary",
            requestBody: body
        });

        if (res.data.id === undefined) {
            throw new Error("missing id");
        }

        return { id: res.data.id };
    }

    async update(id: pulumi.ID, olds: any, news: any) {
        const calendar = await this.getCalendar();

        const body = this.eventFromPropertyBag(news);

        const res = await calendar.events.update({
            calendarId: "primary",
            eventId: id,
            requestBody: body
        })

        if (res.data.id === undefined) {
            throw new Error("missing id");
        }

        return {
            outs: {
                id: res.data.id
            }
        };
    }

    async delete(id: pulumi.ID, props: any) {
        const calendar = await this.getCalendar();

        await calendar.events.delete({
            calendarId: "primary",
            eventId: id
        });
    }

    private validateRequiredProperties(news: any, properties: string[]): dynamic.CheckFailure[] {
        const failedChecks: dynamic.CheckFailure[] = [];
        for (const prop of properties) {
            if (news[prop] === undefined) {
                failedChecks.push({property: prop, reason: `required property '${prop}' missing`});
            }
        }
        return failedChecks;
    }

    private async getCalendar(): Promise<calendar_v3.Calendar> {
        const googleapis = await import("googleapis");

        // This method looks for the GOOGLE_APPLICATION_CREDENTIALS environment variable
        // which should be set to the path of credentials.json on your machine.
        const auth = await googleapis.google.auth.getClient({
            scopes: ["https://www.googleapis.com/auth/calendar"]
        });

        return googleapis.google.calendar({ version: 'v3', auth });
    }

    private eventFromPropertyBag(inputs: any): any {
        const body: any = {
            summary: inputs["summary"],
            start: { dateTime: inputs["start"] },
            end: { dateTime: inputs["end"] }
        };

        if (inputs["description"]) {
            body.description = inputs["description"];
        }

        if (inputs["location"]) {
            body.description = inputs["location"];
        }

        return body;
    }
}

export interface GoogleCalendarEventArgs {
    summary: pulumi.Input<string>;
    start: pulumi.Input<string>;
    end: pulumi.Input<string>;
    description?: pulumi.Input<string>;
    location?: pulumi.Input<string>;
}

export class GoogleCalendarEvent extends dynamic.Resource {
    constructor(name: string, args: GoogleCalendarEventArgs, opts?: pulumi.ResourceOptions) {
        super(new GoogleCalendarEventProvider(), name, args, opts);
    }
}
