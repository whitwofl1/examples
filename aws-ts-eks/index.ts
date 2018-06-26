import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsinfra from "@pulumi/aws-infra";
import * as kubectl from "./kubectl";

import { ServiceRole } from "./serviceRole";

const config = new pulumi.Config("eks");
const instanceType = config.get("instanceType") || "m4.large";

// Create the EKS service role
const eksRole = new ServiceRole("eksRole", {
    service: "eks.amazonaws.com",
    description: "Allows EKS to manage clusters on your behalf.",
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
        "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
    ],
});

// Create the EKS VPC
const network = new awsinfra.Network("eksNetwork");

// Create the EKS cluster security group
const allEgress = {
    fromPort: 0,
    toPort: 0,
    protocol: "-1",  // all
    cidrBlocks: [ "0.0.0.0/0" ],
};
const eksClusterSecurityGroup = new aws.ec2.SecurityGroup("eksClusterSecurityGroup", {
    vpcId: network.vpcId,
    egress: [ allEgress ],
});

// Create the EKS cluster
const eksCluster = new aws.eks.Cluster("eksCluster", {
    roleArn: eksRole.role.apply(r => r.arn),
    vpcConfig: { securityGroupIds: [ eksClusterSecurityGroup.id ], subnetIds: network.subnetIds },
});

// Compute the required kubeconfig
export const kubeconfig = pulumi.all([eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority])
    .apply(([clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
        return `
apiVersion: v1
clusters:
- cluster:
    server: ${clusterEndpoint}
    certificate-authority-data: ${clusterCertificateAuthority.data}
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: aws
  name: aws
current-context: aws
kind: Config
preferences: {}
users:
- name: aws
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: heptio-authenticator-aws
      args:
        - "token"
        - "-i"
        - "${clusterName}"
`;
    });

// create the instance role
const instanceRole = new ServiceRole("instanceRole", {
    service: "ec2.amazonaws.com",
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    ],
});

// Enable access for worker nodes
const eksNodeAccess = new kubectl.EKSNodeAccess("nodeAccess", {
    kubeconfig: kubeconfig,
    instanceRoleArn: instanceRole.role.apply(r => r.arn),
});

// Create worker nodes
const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
    role: instanceRole.role,
});
const instanceSecurityGroup = new aws.ec2.SecurityGroup("instanceSecurityGroup", {
    vpcId: network.vpcId,
    ingress: [
        {
            description: "Allow node to communicate with each other",
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
    tags: [{
        key: eksCluster.name.apply(n => `kubernetes.io/cluster/${n}`),
        value: "owned",
    }],
});
const eksClusterIngressRule = new aws.ec2.SecurityGroupRule("eksClusterIngressRule", {
    description: "Allow pods to communicate with the cluster API Server",
    type: "ingress",
    fromPort: 443,
    toPort: 443,
    protocol: "tcp",
    securityGroupId: eksClusterSecurityGroup.id,
    sourceSecurityGroupId: instanceSecurityGroup.id,
});
const instanceSecurityGroupId = pulumi.all([instanceSecurityGroup.id, eksClusterIngressRule.id])
    .apply(([instanceSecurityGroupId]) => instanceSecurityGroupId);

const eksWorkerAmi = aws.getAmi({
    filters: [{
        name: "name",
        values: [ "eks-worker-*" ],
    }],
    mostRecent: true,
    owners: [ "602401143452" ], // Amazon
});
const userdata = pulumi.all([eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority])
    .apply(([clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
        return `#!/bin/bash -xe

CA_CERTIFICATE_DIRECTORY=/etc/kubernetes/pki
CA_CERTIFICATE_FILE_PATH=$CA_CERTIFICATE_DIRECTORY/ca.crt
mkdir -p $CA_CERTIFICATE_DIRECTORY
echo "${clusterCertificateAuthority.data}" | base64 -d >  $CA_CERTIFICATE_FILE_PATH
INTERNAL_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
sed -i s,MASTER_ENDPOINT,${clusterEndpoint},g /var/lib/kubelet/kubeconfig
sed -i s,CLUSTER_NAME,${clusterName},g /var/lib/kubelet/kubeconfig
sed -i s,REGION,${aws.config.region},g /etc/systemd/system/kubelet.service
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
const instanceLaunchConfiguration = new aws.ec2.LaunchConfiguration("instanceLaunchConfiguration", {
    associatePublicIpAddress: true,
    imageId: eksWorkerAmi.then(r => r.imageId),
    instanceType: instanceType,
    iamInstanceProfile: instanceProfile.id,
    securityGroups: [ instanceSecurityGroupId ],
    userData: userdata,
});
const autoscalingGroup = new aws.autoscaling.Group("autoscalingGroup", {
    desiredCapacity: 2,
    launchConfiguration: instanceLaunchConfiguration.id,
    maxSize: 2,
    minSize: 1,
    vpcZoneIdentifiers: network.subnetIds,

    tags: [{
        key: eksCluster.name.apply(n => `kubernetes.io/cluster/${n}`),
        value: "owned",
        propagateAtLaunch: true,
    }]
});
