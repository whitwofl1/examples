# Static Website Hosted on AWS S3

The component version of [aws-js-s3-folder](../aws-js-s3-folder). For a detailed walkthrough of this example, see [Tutorial: Pulumi Components](https://pulumi.io/reference/component-tutorial.html).

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Run `pulumi new` to create a new project from the example:

    ```bash
    $ pulumi new https://github.com/pulumi/examples/aws-js-s3-folder-component --dir website-component
    This command will walk you through creating a new Pulumi project.

    Enter a value or leave blank to accept the default, and press <ENTER>.
    Press ^C at any time to quit.
    project name: (website-component)
    project description: (A static website hosted on AWS S3)
    Created project 'website-component'.
    stack name: (website-component-dev)
    Created stack 'website-component-dev'.
    aws:region: The AWS region to deploy into: (us-west-2)
    Saved config.
    Installing dependencies...
    Your new project is configured and ready to go! ✨
    To deploy it, 'cd website-component' and then run 'pulumi up'.
    ```
1.  Run `cd website-component` to change to the new project directory.

    ```bash
    $ cd website-component
    ```

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update of stack 'website-component-dev'
    Previewing changes:
    ...

    Updating stack 'website-component-dev'
    Performing changes:

        Type                         Name                                     Status      Info
    +   pulumi:pulumi:Stack          website-component-website-component-dev  created
    +   └─ pulumi:examples:S3Folder  pulumi-static-site                       created
    +      ├─ aws:s3:Bucket          pulumi-static-site                       created
    +      ├─ aws:s3:BucketPolicy    bucketPolicy                             created
    +      ├─ aws:s3:BucketObject    index.html                               created
    +      └─ aws:s3:BucketObject    favicon.png                              created

    ---outputs:---
    bucketName: "pulumi-static-site-***"
    websiteUrl: "***.s3-website-us-west-2.amazonaws.com"

    info: 6 changes performed:
        + 6 resources created
    Update duration: ***

    Permalink: https://app.pulumi.com/***
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT                                           VALUE
        bucketName                                       pulumi-static-site-***
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

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
