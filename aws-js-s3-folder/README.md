# Static Website Hosted on AWS S3

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://pulumi.io/quickstart/aws-s3-website.html).

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Run `pulumi new` to create a new project from the example:

    ```bash
    $ pulumi new https://github.com/pulumi/examples/aws-js-s3-folder --dir website
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
    Installing dependencies...
    Your new project is configured and ready to go! ✨
    To deploy it, 'cd website' and then run 'pulumi up'.
    ```

1.  Run `cd website` to change to the new project directory.

    ```bash
    $ cd website
    ```

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update of stack 'website-dev'
    Previewing changes:
    ...

    Updating stack 'website-dev'
    Performing changes:

        Type                    Name                 Status      Info
    +   pulumi:pulumi:Stack     website-website-dev  created
    +   ├─ aws:s3:Bucket        s3-website-bucket    created
    +   ├─ aws:s3:BucketPolicy  bucketPolicy         created
    +   ├─ aws:s3:BucketObject  index.html           created
    +   └─ aws:s3:BucketObject  favicon.png          created

    ---outputs:---
    bucketName: "s3-website-bucket-***"
    websiteUrl: "***.s3-website-us-west-2.amazonaws.com"

    info: 5 changes performed:
        + 5 resources created
    Update duration: ***

    Permalink: https://app.pulumi.com/***
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT                                           VALUE
        bucketName                                       s3-website-bucket-***
        websiteUrl                                       ***.s3-website-us-west-2.amazonaws.com
    ```

1.  To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    $ aws s3 ls $(pulumi stack output bucketName)
    2018-04-17 15:40:47      13731 favicon.png
    2018-04-17 15:40:48        249 index.html
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    $ pulumi stack output websiteUrl
    ***.s3-website-us-west-2.amazonaws.com
    ```

    ![Hello S3 example](images/part2-website.png)

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
