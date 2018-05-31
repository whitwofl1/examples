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
import * as awsInfra from "@pulumi/aws-infra";
import * as pulumi from "@pulumi/pulumi";

import * as config from "./config";

import { awsAccountId } from "./util";
import { loadBalancerSecurityGroup } from "./securityGroups";

// defaultVpc is the default VPC for the current AWS account.
const defaultVpc = awsInfra.Network.getDefault();

// accessLogsBucketPolicyString returns a stringified policy to allow the ELB service account to write to the access logs bucket.
function accessLogsBucketPolicyString(
    bucketName: string, serviceAccount: string, logsPrefix: string, accountId: string): string {
    const policy: aws.iam.PolicyDocument = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { AWS: serviceAccount },
                Action: "s3:PutObject",
                Resource: `arn:aws:s3:::${bucketName}/${logsPrefix}/AWSLogs/${accountId}/*`,
            },
        ],
    };

    return JSON.stringify(policy);
}

const logsPrefix = "alb";

// accessLogsBucket will store request logs for the load balancer.
const accessLogsBucket = new aws.s3.Bucket("alb-access-logs");

let serviceAccount = aws.elasticloadbalancing.getServiceAccount();
let policy = pulumi
    .all([accessLogsBucket.id, serviceAccount, awsAccountId])
    .apply(([accessLogsBucketId, serviceAccountResult, accountId]) => {
        return accessLogsBucketPolicyString(accessLogsBucketId, serviceAccountResult.arn, logsPrefix, accountId);
    });

let accessLogsBucketPolicy = new aws.s3.BucketPolicy(
    "accessLogsBucketPolicy",
    {
        bucket: accessLogsBucket.id,
        policy: policy,
    });

export let alb = new aws.elasticloadbalancingv2.LoadBalancer(
    "alb",
    {
        subnets: defaultVpc.subnetIds,
        securityGroups: [ loadBalancerSecurityGroup.id ],
        internal: false,  // default false
        idleTimeout: 120,  // seconds
        accessLogs: accessLogsBucket && {
            enabled: true,
            bucket: accessLogsBucket.id,
            prefix: logsPrefix,
        },
    },
    {
        // We depend on the policy being created before we create the load balancer.
        dependsOn: [ accessLogsBucketPolicy ],
    },
);

const httpPort = 80;
const httpsPort = 443;

// The "empty target group" is the default target group used by our load balancer, and doesn't do
// anything other than act as a black hole for incomming traffic. We will create separate target
// groups for individual services based on routing rules.
let emptyHttpTargetGroup = new aws.elasticloadbalancingv2.TargetGroup("emptyTG", {
    port: httpPort,
    protocol: "HTTP",
    vpcId: defaultVpc.vpcId,
});

export const httpListener = new aws.elasticloadbalancingv2.Listener("httpListener", {
    loadBalancerArn: alb.arn,
    port: httpPort,
    protocol: "HTTP",
    defaultActions: [{
        targetGroupArn: emptyHttpTargetGroup.arn,
        type: "forward",
    }],
});

export const httpsListener = new aws.elasticloadbalancingv2.Listener("httpsListener", {
    loadBalancerArn: alb.arn,
    port: httpsPort,
    protocol: "HTTPS",
    certificateArn: config.httpsCertArn,
    defaultActions: [{
        targetGroupArn: emptyHttpTargetGroup.arn,
        type: "forward",
    }],
});
