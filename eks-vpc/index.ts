import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as awsx from "@pulumi/awsx";

// Create an EKS cluster with non-default configuration
const vpc = new awsx.ec2.Vpc("pulumi-vpc", { 
    numberOfAvailabilityZones: 3 
});

const cluster = new eks.Cluster("PulumiJenkinsCluster", {
    vpcId: vpc.id,
    privateSubnetIds: vpc.privateSubnetIds,
    publicSubnetIds: vpc.publicSubnetIds,
    instanceType: "t3.large",
    desiredCapacity: 6,
    minSize: 1,
    maxSize: 6,
    deployDashboard: false,
    providerCredentialOpts: {
        profileName: aws.config.profile,
    },
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Export VPC
const subnet = pulumi.output(vpc.publicSubnets.then(getsub => getsub[0].subnet));
export const subnet_id = subnet.id;
export const subnet_az = subnet.availabilityZone;
export const vpc_id = vpc.id;