import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsinfra from "@pulumi/aws-infra";
import * as k8s from "@pulumi/kubernetes";
import * as helm from "@pulumi/kubernetes/helm";

import { EKSCluster } from "./cluster";

const config = new pulumi.Config("eks");
const instanceType = (config.get("instanceType") || "m4.large") as aws.ec2.InstanceType;

// Create a VPC for our cluster.
const network = new awsinfra.Network("eksNetwork");

// Create the EKS cluster itself.
const cluster = new EKSCluster("eksCluster", {
    vpcId: network.vpcId,
    subnetIds: network.subnetIds,
    instanceType: instanceType,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a Kubernetes provider that targets the EKS cluster.
const k8sProvider = new k8s.Provider("k8s", {
    kubeconfig: cluster.kubeconfig.apply(c => JSON.stringify(c)),
});

// Deploy the HackMD Helm chart into the EKS cluster.
const hackmd = new helm.v2.Chart("hackmd", {
    repo: "stable",
    chart: "hackmd",
    version: "0.1.1",
    values: {
        service: {
            type: "LoadBalancer",
            port: 80,
        },
    },
}, { providers: { kubernetes: k8sProvider } });
