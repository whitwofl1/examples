# AWS Reference Architecture: "Web Application Hosting"

Implementation of the AWS Reference Architecture _[Web Application Hosting](https://aws.amazon.com/architecture/#aws-ref-arch)_
using Pulumi.

This example demonstrates using the following AWS products:

- Route 53 for DNS management.
- CloudFront for content delivery and caching.
- Simple Storage Service (S3) for static content.
- Elastic Load Balancing for traffic management.
- Elastic Compute Cloud (EC2) for compute.
- Relational Database Service for SQL.
- Certificate Manager for handling HTTPs.

## Application Details

The sample application deployed is a "Social Network for Lawn Gnomes". Users
can login and post photos of their lawn gnomes, update profile data, and
generally do social network CRUD.

The application backend is written in Go, and stores most data in a SQL
database (RDS). Uploaded user content, such as profile pictures, are uploaded
to a general blobstore (S3).

While a social network for lawn gnomes is unlikely to go viral, the
application's infrastructure is written in such a way to provide as much
scaling as needed as traffic grows.

## Getting Started

Before you can run the application, there are a few manual steps that must
first be completed.

You'll need to have `yarn` installed, as well as the [AWS CLI](https://aws.amazon.com/cli/).

### Register a Domain (lawn-gnomes.net)

To run the application you need to first register a domain to host the
application. Pulumi can take care of managing domain records, but provisioning
the domain itself must be done manually.

You can do this directly on the AWS console:
https://console.aws.amazon.com/route53/home#DomainListing:

### Request an SSL Certificate

We'll need to create an SSL certificate so browsers can communicaite with the
website securely over HTTPS. The easiest way to do this is provision one using
Amazon Certificate Manager (ACM).

If you've already registered your domain directly from Amazon using Route53,
requesting a new certificate and verifying domain ownership is a very quick
process.

**NOTE:** You'll want to request the certificate in the `us-east-1` zone. While
you can provision an ACM certificate in any zone, you can only associate those
in `us-east-1` with CloudFront distributions.

**NOTE:** The example code serves content both from the naked host domain
(lawn-gnomes.net) and a www- prefix (www.lawn-gnomes.net).
So you'll want to request a certificate for both "lawn-gnomes.net" and
"*.lawn-gnomes.net" (substituting out for your domain where needed).

https://console.aws.amazon.com/acm/home?region=us-east-1#/wizard/

### Creating your Pulumi Stack

Create a new Pulumi stack to host the application. Download the source code,
and navigate to the directory this `README.md` is found. Then run:

```bash
pulumi stack init gnome-site
```

Once the stack has been created, you'll next need to set the various Pulumi
configuration settings that define how the application will work.

The defaults for most things are sufficient, but the one required value
is the domain name you'll host the application on.

```bash
pulumi config set aws:region "us-east-1"
pulumi config set hostDomain "lawn-gnomes.net"
pulumi config set httpsCertArn "arn:aws:acm:us-east-1:..."
```

### Building

To build the application, it is assumed you have `yarn` installed locally.
(Though you can substitue with `npm` as needed.)

```bash
yarn install
yarn build
```

Updating the Pulumi stack is done via a simple `pulumi update`. However,
both steps are ran via:

```bash
./scripts/deploy.sh
```