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

import * as config from "./config";

// Create the DNS records mapping the host domain for the site to the
// CloudFront distribution.

// cdnContentBucket holds the majority of static content served from CloudFront.
export const cdnContentBucket = new aws.s3.Bucket("cdn-content", {
    bucket: config.hostDomain,
    acl: "public-read",
});

// logsBucket stores the request logs for the CloudFront distribution. These
// can later be queried for doing analytics, calculating metrics, etc.
const logsBucket = new aws.s3.Bucket("service-cdn-logs", {
    bucket: `${config.hostDomain}-logs`,
    acl: "log-delivery-write",
});

// Relevant documentation for all the configuration settings:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html
// https://docs.aws.amazon.com/general/latest/gr/aws_service_limits.html#limits_cloudfront
// https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Origin.html
// https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html
const distributionArgs: aws.cloudfront.DistributionArgs = {
    enabled: true,
    aliases: [ config.hostDomain, `www.${config.hostDomain}` ],

    defaultCacheBehavior: {
        targetOriginId: cdnContentBucket.arn,

        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: [ "GET", "HEAD", "OPTIONS" ],
        cachedMethods: [ "GET", "HEAD", "OPTIONS"],

        // None of these pieces of data are relevant to differentiating content
        // cached from our S3 bucket.
        forwardedValues: {
            cookies: {
                forward: "none",
            },
            headers: ["none"],
            queryString: false,
        },

        // There are other configuration options, such as the data to forward to the "origin" as
        // well as the duration of cached content. See the AWS documentation for more information.
    },

    // TODO: Specify additional caching behaviors to route traffic to the dynamic origin.

    // "All" is the most broad distribution, and also the most expensive. 100 is the least broad, and also the least expensive.
    // See: https://aws.amazon.com/cloudfront/pricing/
    priceClass: "PriceClass_100",

    // "origins" are the locations that CloudFront will look for content it
    // will cache. This application has two origins: S3 (i.e. static file
    // serving) and our ALB (i.e. requests to our API backend.)
    origins: [
        {
            originId: cdnContentBucket.arn,
            domainName: cdnContentBucket.bucketDomainName,
        }
        // TODO: Specify additional caching behaviors to route traffic to the dynamic origin.
    ],

    // CloudFront allows you to intercept and customize error responses it
    // serves. This allows for cusotmizes error pages, instead of the generic
    // "NoSuchKey" from S3.
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages.html
    customErrorResponses: [
        {
            errorCode: 404,
            responseCode: 404,
            errorCachingMinTtl: 60,
            responsePagePath: "/404.html",
        }
    ],

    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },

    // CloudFront certs must be in us-east-1, just like API Gateway.
    viewerCertificate: {
        acmCertificateArn: config.httpsCertArn,
        sslSupportMethod: "sni-only",
    },
    loggingConfig: {
        bucket: logsBucket.bucketDomainName,
        includeCookies: false,
        prefix: `config.hostDomain}/`,
    },

    // The path to return when a request comes in to the domain's root.
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html
    defaultRootObject: "index.html",
};

// NOTE: Sometimes updating the CloudFront distribution will fail with:
// "PreconditionFailed: The request failed because it didn't meet the preconditions in one or more
// request-header fields."
//
// For information on how to work around this error, see "CloudFront ETag Out Of Sync":
// https://docs.pulumi.com/reference/known-issues.html
export const cdn = new aws.cloudfront.Distribution("cdn", distributionArgs);
