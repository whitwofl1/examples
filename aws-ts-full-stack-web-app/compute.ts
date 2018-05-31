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

import * as loadBalancer from "./loadBalancer";

import { vmSecurityGroup } from "./securityGroups";

// defaultVpc is the default VPC for the current AWS account.
const defaultVpc = awsInfra.Network.getDefault();

// Amazon Linux AMI 2018.03.0 (HVM), SSD Volume Type in us-east-1
const ami  = "ami-14c5486b"
const machineSize = "t2.micro";    // We don't need much compute for the REST API.

// TODO: Hook up an actual Go binary to run on the machine.
let userData = 
`#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 443 &`;

let server = new aws.ec2.Instance("web-server-www", {
    tags: { "Name": "web-server-www" },
    instanceType: machineSize,
    securityGroups: [ vmSecurityGroup.name ],
    ami: ami,
    // TEMPORARY STEP.
    userData: userData
});

// TODO: Create an auto scaling group, instead of the individual EC2 instance, and then
// attach that auto scaling group to the serverTargetGroup?

// Have the server recieve traffic from the load balancer.
export let serverTargetGroup = new aws.elasticloadbalancingv2.TargetGroup("serverTargetGroup", {
    port: 80,
    protocol: "HTTP",
    vpcId: defaultVpc.vpcId,

    deregistrationDelay: 30,  // seconds
    healthCheck: {
        interval: 10,
        path: "/",
        port: "traffic-port",
        protocol: "HTTP",
        matcher: "200-299",
        timeout: 5,
        healthyThreshold: 5,
        unhealthyThreshold: 2,
    },
});

let httpListener = new aws.elasticloadbalancingv2.ListenerRule("serviceHttpListener", {
    listenerArn: loadBalancer.httpListener.arn,
    priority: 100,
    conditions: [{ field: "path-pattern", values: "/*" }],
    actions: [{
        type: "forward",
        targetGroupArn: serverTargetGroup.arn,
    }],
});

let wwwHttpsListenerRules = new aws.elasticloadbalancingv2.ListenerRule("wwwHTTPSRedirect", {
    listenerArn: loadBalancer.httpsListener.arn,
    priority: 100,
    conditions: [{ field: "path-pattern", values: "/*" }],
    actions: [{
        type: "forward",
        targetGroupArn: serverTargetGroup.arn,
    }],
});
