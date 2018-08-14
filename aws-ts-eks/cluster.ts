import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

import { ServiceRole } from "./serviceRole";

export interface EKSClusterOptions {
    /**
     * The VPC in which to create the cluster and its worker nodes.
     */
    readonly vpcId: pulumi.Input<string>;

    /**
     * The subnets to attach to the EKS cluster.
     */
    readonly subnetIds: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The instance type to use for the cluster's nodes.
     */
    readonly instanceType: pulumi.Input<aws.ec2.InstanceType>;

    /**
     * The number of worker nodes that should be running in the cluster.
     */
    readonly desiredCapacity: pulumi.Input<number>;

    /**
     * The minimum number of worker nodes running in the cluster.
     */
    readonly minSize: pulumi.Input<number>;

    /**
     * The maximum number of worker nodes running in the cluster.
     */
    readonly maxSize: pulumi.Input<number>;
}

export class EKSCluster extends pulumi.ComponentResource {
    /**
     * A kubeconfig that can be used to connect to the EKS cluster. This must be serialized as a string before passing
     * to the Kubernetes provider.
     */
    public readonly kubeconfig: pulumi.Output<any>;

    constructor(name: string, args: EKSClusterOptions, opts?: pulumi.ComponentResourceOptions) {
        super("EKSCluster", name, args, opts);

        // Create the EKS service role
        const eksRole = new ServiceRole("eksRole", {
            service: "eks.amazonaws.com",
            description: "Allows EKS to manage clusters on your behalf.",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
                "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
            ],
        }, { parent: this });

        // Create the EKS cluster security group
        const allEgress = {
            description: "Allow internet access.",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: [ "0.0.0.0/0" ],
        };
        const eksClusterSecurityGroup = new aws.ec2.SecurityGroup("eksClusterSecurityGroup", {
            vpcId: args.vpcId,
            egress: [ allEgress ],
        }, { parent: this });

        // Create the EKS cluster
        const eksCluster = new aws.eks.Cluster("eksCluster", {
            roleArn: eksRole.role.apply(r => r.arn),
            vpcConfig: { securityGroupIds: [ eksClusterSecurityGroup.id ], subnetIds: args.subnetIds },
        }, { parent: this });

        // Create the instance role we'll use for worker nodes.
        const instanceRole = new ServiceRole("instanceRole", {
            service: "ec2.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            ],
        }, { parent: this });
        const instanceRoleARN = instanceRole.role.apply(r => r.arn);

        // Compute the required kubeconfig. Note that we do not export this value: we want the exported config to
        // depend on the autoscaling group we'll create later so that nothing attempts to use the EKS cluster before
        // its worker nodes have come up.
        const myKubeconfig = pulumi.all([eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority])
            .apply(([clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
                return {
                    apiVersion: "v1",
                    clusters: [{
                        cluster: {
                            server: clusterEndpoint,
                            "certificate-authority-data": clusterCertificateAuthority.data,
                        },
                        name: "kubernetes",
                    }],
                    contexts: [{
                        context: {
                            cluster: "kubernetes",
                            user: "aws",
                        },
                        name: "aws",
                    }],
                    "current-context": "aws",
                    kind: "Config",
                    users: [{
                        name: "aws",
                        user: {
                            exec: {
                                apiVersion: "client.authentication.k8s.io/v1alpha1",
                                command: "heptio-authenticator-aws",
                                args: ["token", "-i", clusterName],
                            },
                        },
                    }],
                };
            });

        // Create the Kubernetes provider we'll use to manage the config map we need to allow worker nodes to access
        // the EKS cluster.
        const k8sProvider = new k8s.Provider("eks-k8s", {
            kubeconfig: myKubeconfig.apply(c => JSON.stringify(c)),
        }, { parent: this });

        // Enable access to the EKS cluster for worker nodes.
        const eksNodeAccess = new k8s.core.v1.ConfigMap("nodeAccess", {
            apiVersion: "v1",
            metadata: {
                name: "aws-auth",
                namespace: "kube-system",
            },
            data: {
                mapRoles: instanceRoleARN.apply(arn => `- rolearn: ${arn}\n  username: system:node:{{EC2PrivateDNSName}}\n  groups:\n    - system:bootstrappers\n    - system:nodes\n`),
            },
        }, { parent: this, provider: k8sProvider });

        // Create the cluster's worker nodes.
        const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
            role: instanceRole.role,
        }, { parent: this });
        const instanceSecurityGroup = new aws.ec2.SecurityGroup("instanceSecurityGroup", {
            vpcId: args.vpcId,
            ingress: [
                {
                    description: "Allow nodes to communicate with each other",
                    fromPort: 0,
                    toPort: 0,
                    protocol: "-1", // all
                    self: true,
                },
                {
                    description: "Allow worker Kubelets and pods to receive communication from the cluster control plane",
                    fromPort: 1025,
                    toPort: 65535,
                    protocol: "tcp",
                    securityGroups: [ eksClusterSecurityGroup.id ],
                },
            ],
            egress: [ allEgress ],
            tags: eksCluster.name.apply(n => <aws.Tags>{
                [`kubernetes.io/cluster/${n}`]: "owned",
            }),
        }, { parent: this });
        const eksClusterIngressRule = new aws.ec2.SecurityGroupRule("eksClusterIngressRule", {
            description: "Allow pods to communicate with the cluster API Server",
            type: "ingress",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            securityGroupId: eksClusterSecurityGroup.id,
            sourceSecurityGroupId: instanceSecurityGroup.id,
        }, { parent: this });
        const instanceSecurityGroupId = pulumi.all([instanceSecurityGroup.id, eksClusterIngressRule.id])
            .apply(([instanceSecurityGroupId]) => instanceSecurityGroupId);

        const awsRegion = pulumi.output(aws.getRegion({}, { parent: this }));
        const userdata = pulumi.all([awsRegion, eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority])
            .apply(([region, clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
                return `#!/bin/bash -xe

CA_CERTIFICATE_DIRECTORY=/etc/kubernetes/pki
CA_CERTIFICATE_FILE_PATH=$CA_CERTIFICATE_DIRECTORY/ca.crt
mkdir -p $CA_CERTIFICATE_DIRECTORY
echo "${clusterCertificateAuthority.data}" | base64 -d >  $CA_CERTIFICATE_FILE_PATH
INTERNAL_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
sed -i s,MASTER_ENDPOINT,${clusterEndpoint},g /var/lib/kubelet/kubeconfig
sed -i s,CLUSTER_NAME,${clusterName},g /var/lib/kubelet/kubeconfig
sed -i s,REGION,${region.name},g /etc/systemd/system/kubelet.service
sed -i s,MAX_PODS,20,g /etc/systemd/system/kubelet.service
sed -i s,MASTER_ENDPOINT,${clusterEndpoint},g /etc/systemd/system/kubelet.service
sed -i s,INTERNAL_IP,$INTERNAL_IP,g /etc/systemd/system/kubelet.service
DNS_CLUSTER_IP=10.100.0.10
if [[ $INTERNAL_IP == 10.* ]] ; then DNS_CLUSTER_IP=172.20.0.10; fi
sed -i s,DNS_CLUSTER_IP,$DNS_CLUSTER_IP,g /etc/systemd/system/kubelet.service
sed -i s,CERTIFICATE_AUTHORITY_FILE,$CA_CERTIFICATE_FILE_PATH,g /var/lib/kubelet/kubeconfig
sed -i s,CLIENT_CA_FILE,$CA_CERTIFICATE_FILE_PATH,g  /etc/systemd/system/kubelet.service
systemctl daemon-reload
systemctl restart kubelet kube-proxy
`;
            });
        const eksWorkerAmi = aws.getAmi({
            filters: [{
                name: "name",
                values: [ "eks-worker-*" ],
            }],
            mostRecent: true,
            owners: [ "602401143452" ], // Amazon
        }, { parent: this });
        const instanceLaunchConfiguration = new aws.ec2.LaunchConfiguration("instanceLaunchConfiguration", {
            associatePublicIpAddress: true,
            imageId: eksWorkerAmi.then(r => r.imageId),
            instanceType: args.instanceType,
            iamInstanceProfile: instanceProfile.id,
            securityGroups: [ instanceSecurityGroupId ],
            userData: userdata,
        }, { parent: this });
        const autoscalingGroup = new aws.autoscaling.Group("autoscalingGroup", {
            desiredCapacity: args.desiredCapacity,
            launchConfiguration: instanceLaunchConfiguration.id,
            maxSize: args.maxSize,
            minSize: args.minSize,
            vpcZoneIdentifiers: args.subnetIds,

            tags: [{
                key: eksCluster.name.apply(n => `kubernetes.io/cluster/${n}`),
                value: "owned",
                propagateAtLaunch: true,
            }]

        }, { parent: this, dependsOn: eksNodeAccess });

        // Export the cluster's kubeconfig with a dependency upon the cluster's autoscaling group. This will help
        // ensure that the cluster's consumers do not attempt to use the cluster until its workers are attached.
        this.kubeconfig = pulumi.all([autoscalingGroup.id, myKubeconfig]).apply(([_, kubeconfig]) => kubeconfig);

        this.registerOutputs({ kubeconfig: this.kubeconfig });
    }
}
