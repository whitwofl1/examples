# Static Website Hosted on AWS S3 in Go

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://pulumi.io/quickstart/aws-s3-website.html).

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Run `pulumi new` to create a new project from the example:

    ```bash
    $ pulumi new https://github.com/pulumi/examples/aws-go-s3-folder --dir website
    This command will walk you through creating a new Pulumi project.

    Enter a value or leave blank to accept the default, and press <ENTER>.
    Press ^C at any time to quit.
    project name: (website)
    project description: (A static website hosted on AWS S3)
    Created project 'website'.
    stack name: (website-dev)
    Created stack 'website-dev'.
    aws:region: The AWS region to deploy into: (us-west-2)
    Saved config.
    Your new project is configured and ready to go! ✨
    To deploy it, 'cd website' and then run 'pulumi up'.
    ```

1.  Run `cd website` to change to the new project directory.

    ```bash
    $ cd website
    ```

1.  Compile the Go program and ensure it's on your path (such as with `$GOPATH`):

    ```
    $ go get .
    $ go install .
    ```

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Please choose a stack, or create a new one: website-dev
    Previewing update of stack 'website-dev'
    Previewing changes:
    ...

    Updating stack 'website-dev'
    Performing changes:

        Type                    Name                 Status      Info
    +   pulumi:pulumi:Stack     website-website-dev  created
    +   ├─ aws:s3:Bucket        s3-website-bucket    created
    +   ├─ aws:s3:BucketPolicy  bucketPolicy         created
    +   ├─ aws:s3:BucketObject  www/favicon.png      created
    +   └─ aws:s3:BucketObject  www/index.html       created

    info: 5 changes performed:
        + 5 resources created
    Update duration: ***

    Permalink: https://app.pulumi.com/***
    ```

1.  To see the resources that were created, run `pulumi stack`:

    ```bash
    $ pulumi stack
    Current stack is website-dev:
        Owner: ***
        Last updated: ***
        Pulumi version: v0.15.0
        Plugin go [language] version: 0.15.0
        Plugin aws [resource] version: 0.15.0

    Current stack resources (6):
        TYPE                                             NAME
        pulumi:pulumi:Stack                              website-website-dev
        pulumi:providers:aws                             default
        aws:s3/bucket:Bucket                             s3-website-bucket
        aws:s3/bucketPolicy:BucketPolicy                 bucketPolicy
        aws:s3/bucketObject:BucketObject                 www/index.html
        aws:s3/bucketObject:BucketObject                 www/favicon.png
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
