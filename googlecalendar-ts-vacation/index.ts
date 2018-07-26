import * as pulumi from "@pulumi/pulumi";
import { GoogleCalendarEvent, GoogleCalendarEventArgs } from "./googlecalendar";

interface Vacation {
    name: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
}

const vacations: Vacation[] = [
    { name: "Gilfoyle", start: "2018-07-02", end: "2018-07-06" },
    { name: "Richard", start: "2018-07-23", end: "2018-07-27" },
    { name: "Dinesh", start: "2018-12-24", end: "2018-12-28" },
];

for (const vacation of vacations) {
    const name = `vacation-${vacation.name}-${vacation.start}-${vacation.end}`;
    const event = new GoogleCalendarEvent(name, {
        summary: `${vacation.name} OOF`,
        start: vacation.start + "T00:00:00-07:00",
        end: vacation.end + "T00:00:00-07:00",
        location: vacation.location,
        description: vacation.description
    });
}
