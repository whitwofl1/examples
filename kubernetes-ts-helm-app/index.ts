import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
//import * as docker from "@pulumi/docker";

// TODO use docker.buildAndPushImage so we can build the
// container as part of the Pulumi program.
// Ideally, we'd use the digest returned from that function to make sure the
// deployment is refreshed. Not sure how we change the name or tag.
// Until then, run the following commands to build/push the image
// to Google Container Registry:
//   docker build -t gcr.io/pulumi-development/hellonode .
//   gcloud docker -- push gcr.io/pulumi-development/hellonodeß
// docker.buildAndPushImage(...)
const image = "gcr.io/pulumi-development/hellonode"

const appName = "hellonode";
const appLabels = { app: appName };

// Allocate a namespace for the resources.
const namespace = new k8s.core.v1.Namespace(appName, {
    metadata: { name: appName }
});

// Allocate a deployment of the image.
const deployment = new k8s.apps.v1beta1.Deployment(appName, {
    metadata: {
        namespace: namespace.metadata.apply(m => m.name)
    },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: { containers: [{ name: appName, image: image }] }
        }
    }
});

// Allocate an IP to the deployment.
const frontend = new k8s.core.v1.Service(appName, {
    metadata: {
        labels: deployment.spec.apply(spec => spec.template.metadata.labels),
        namespace: namespace.metadata.apply(m => m.name)
    },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: 8080, protocol: "TCP" }],
        selector: appLabels
    }
});

// When "done", this will print the public IP.
export let frontendIp: pulumi.Output<string>;
frontendIp = frontend.status.apply(status => status.loadBalancer.ingress[0].ip);

// TODO deploy mysql helm chart.
// Requires https://github.com/pulumi/pulumi-kubernetes/pull/160 to be able to specify
// the namespace.

// TODO update node app to use database.



// // Deploy the latest version of the stable/wordpress chart.
// const wordpress = new k8s.helm.v2.Chart("wpdev", {
//     repo: "stable",
//     version: "2.1.3",
//     chart: "wordpress"
// });

// // Export the public IP for Wordpress.
// const frontend = wordpress.getResource("v1/Service", "wpdev-wordpress");
// export const frontendIp = frontend.status.apply(status => status.loadBalancer.ingress[0].ip);
