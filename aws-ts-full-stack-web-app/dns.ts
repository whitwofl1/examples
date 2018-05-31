/*
 * Copyright (c) 2018 Pulumi Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as cdn from "./cdn";
import * as config from "./config";

// Create the DNS ALIAS record mapping the domain to a CloudFront distribution.
// Subdomain may be "" to support naked domains.
async function aliasToCloudFront(
        domain: string, subdomain: string,
        cdn: aws.cloudfront.Distribution): Promise<aws.route53.Record> {
    const targetDomain = cdn.domainName;
    const cdnZoneId = cdn.hostedZoneId;

    const hostedZone = await aws.route53.getZone({ name: domain });
    const aRecord: aws.route53.Record = new aws.route53.Record(
        `A-record-${subdomain}.${domain}`,
        {
            name: subdomain,
            zoneId: hostedZone.zoneId,
            type: "A",
            aliases: [
                {
                    name: targetDomain,
                    zoneId: cdnZoneId,
                    evaluateTargetHealth: true,
                },
            ],
        });

    return aRecord;
}

// Map both hostDomain and with a "www." prefix to the CDN.
export let rootRecord = aliasToCloudFront(config.hostDomain, "", cdn.cdn);
export let wwwRecord = aliasToCloudFront(config.hostDomain, "www", cdn.cdn);