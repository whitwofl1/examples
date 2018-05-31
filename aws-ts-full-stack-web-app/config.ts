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

import * as pulumi from "@pulumi/pulumi";

let config = new pulumi.Config("lawn-gnome-network");

// hostDomain is the domain to serve the website from, e.g. "lawn-gnomes.net".
export const hostDomain: string = config.require("hostDomain");

// httpsCertArn is the AWS ACM certificate ARN. Must be in us-east-1 to be
// attached to CloudFront.
export const httpsCertArn: string = config.require("httpsCertArn");
