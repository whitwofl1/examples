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

async function getAwsAccountId() {
    let callerIdentity = await aws.getCallerIdentity();
    return callerIdentity.accountId;
}

// awsAccountId is the AWS Account ID of the current AWS account. Typically the
// set of default credentials used by the AWS CLI or set via environment
// variables. (Can also be explicitly set via Pulumi configuration values.)
export let awsAccountId = getAwsAccountId();