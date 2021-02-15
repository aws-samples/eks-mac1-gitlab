import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

//Get Config Values
let config = new pulumi.Config();
const pulumi_org = config.require("pulumi_org"); 

const s3stack = new pulumi.StackReference(`${pulumi_org}/s3-iam/dev`);
const eksstack = new pulumi.StackReference(`${pulumi_org}/eks-vpc/dev`);
const r53_stack = new pulumi.StackReference(`${pulumi_org}/r53-conf/dev`);

//Get the Registration Token
const reg_token = config.require("reg_token"); 

//Get SSH key name
const ssh_keyname = config.require("ssh_keyname");

//Domain name from R53 Stack
const domain_name = r53_stack.getOutput("domain_name");

const subnet_id = eksstack.getOutput("subnet_id");
const subnet_az = eksstack.getOutput("subnet_az");
const vpic_id = eksstack.getOutput("vpc_id");

const mac1_alloc = new aws.ec2.DedicatedHost("pulumi-runner", {
    autoPlacement: "on",
    availabilityZone: subnet_az,
    instanceType: "mac1.metal",
});

const ami = pulumi.output(aws.getAmi({
    filters: [{
        name: "name",
        values: ["amzn-ec2-macos-10.15*"],
    }],
    owners: ["887450438545"], // This owner ID is Amazon
    mostRecent: true,
}));

const group = new aws.ec2.SecurityGroup("ssh-only", {
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
    }],
    vpcId: vpic_id
});

const userdata = pulumi.interpolate
`#!/bin/bash
su - ec2-user -c '/usr/local/bin/brew install --cask corretto'
su - ec2-user -c 'brew install gitlab-runner'

FILE=/Users/ec2-user/.gitlab-registered
if [ ! -f "$FILE" ]; then
  touch /Users/ec2-user/.gitlab-registered
  su - ec2-user -c 'gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.${domain_name}/" \
  --executor "shell" \
  --registration-token "${reg_token}" \
  --description "MacOS Runner" \
  --locked="false"'
fi

su - ec2-user -c '/usr/local/bin/gitlab-runner run &' \
`;

const server = new aws.ec2.Instance("mac1-worker", {
    instanceType: "mac1.metal",
    subnetId: subnet_id,
    tenancy: "host",
    availabilityZone: subnet_az,
    associatePublicIpAddress: true,
    vpcSecurityGroupIds: [ group.id ], // reference the security group resource above
    ami: ami.id,
    iamInstanceProfile: s3stack.getOutput("instance_profile"),
    keyName: ssh_keyname,
    userData: userdata,
    
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;
export const instanceID = server.id;

