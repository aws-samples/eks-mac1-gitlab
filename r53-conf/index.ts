import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

let config = new pulumi.Config();
export const domain_name = config.require("domain_name"); 
export const elb_hostname = config.require("elb_hostname"); 
export const elb = elb_hostname.match(/[^z-]*/)!;

export let elb_name = elb[0];

export const gitlab_elb = aws.elb.getLoadBalancer({
    name: elb_name,
});

export const elb_zone = gitlab_elb.then(v => v.zoneId);

const hosted_zone = new aws.route53.Zone(domain_name, {
    name: domain_name
});

const gitlab_web = new aws.route53.Record("gitlab", {
    zoneId: hosted_zone.zoneId,
    name: "gitlab",
    type: "A",
    aliases: [{
        name: `dualstack.${elb_hostname}`,
        zoneId: elb_zone,
        evaluateTargetHealth: true,
    }],
});

//Get Zone DNS Servers
export const ns1 = hosted_zone.nameServers[0];
export const ns2 = hosted_zone.nameServers[1];
export const ns3 = hosted_zone.nameServers[2];
export const ns4 = hosted_zone.nameServers[3];
