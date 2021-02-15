import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("gitlab-pulumi-bucket");

const role = new aws.iam.Role("gitlab-pulumi-instance-profile", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Principal: {
                Service: "ec2.amazonaws.com"
            },
            Effect: "Allow",
            Sid: ""
        }]
    })
});

const pulumiInstanceProfile = new aws.iam.InstanceProfile("gitlabpulumiInstanceProfile", {role: role.name});

export const instance_profile = pulumiInstanceProfile.name;

const bucketPolicy = new aws.iam.RolePolicy("gitlab-pulumi-s3-policy", {
    policy: bucket.arn.apply(policyarn),
    role: role
})

function policyarn(bucket_arn: string) {
    return JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: [
                "s3:*"
            ],
            Resource: [
                `${bucket_arn}` // policy refers to bucket name explicitly
            ]
        }]
    });
}

export const instance_profile_role = role;