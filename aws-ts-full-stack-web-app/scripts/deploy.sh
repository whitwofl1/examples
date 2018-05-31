# !/bin/bash
# Copyright (c) 2018 Pulumi Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may not
# use this file except in compliance with the License. You may obtain a copy of
# the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations under
# the License.

set -o nounset -o errexit -o pipefail

echo -e "\033[0;35mDeploying Gnome Website\033[0m"

# One-way sync the ./www directory the S3 bucket. Note that the contents
# are publicly visible.
S3_BUCKET=$(pulumi stack output cdnContentBucket)
aws s3 sync ./www/ ${S3_BUCKET} --acl public-read --delete