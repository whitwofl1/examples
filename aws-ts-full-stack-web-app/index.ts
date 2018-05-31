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

// Import modules so that we ensure its cloud resources are created.
import "./dns";
import "./compute";
import "./loadBalancer";

// Import these modules with names so we can export resource properties.
import * as cdn from "./cdn";
import * as config from "./config";

// websiteUrl is the URL the website can be reached at.
export const websiteUrl = `https://${config.hostDomain}/`;
// cdnContentBucket is the S3 bucket name where static content is stored.
export const cdnContentBucket = cdn.cdnContentBucket.bucket.apply(bucket => `s3://${bucket}`);
