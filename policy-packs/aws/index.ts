import * as aws from "@pulumi/aws";
import { ResolvedResource as R } from "@pulumi/pulumi/queryable";
import {
    EnforcementLevel,
    PolicyPack,
    ReportViolation,
    validateTypedResource,
    asTypedResource,
    ResourceValidationPolicy
} from "@pulumi/policy";

export function requireNameTag(name: string, enforcementLevel: EnforcementLevel = "mandatory"): ResourceValidationPolicy {
    const check = (it: R<aws.ec2.Instance> | R<aws.ec2.Vpc> | undefined, report: ReportViolation) => {
        if (it) {
            checkRequireNameTag(it, report);
        }
    }
    return {
        name: name,
        description: "A 'Name' tag is required.",
        enforcementLevel: enforcementLevel,
        validateResource: (args, report) => {
            check(asTypedResource(aws.ec2.Instance.isInstance, args), report);
            check(asTypedResource(aws.ec2.Vpc.isInstance, args), report);
        },
    };
}

export function checkRequireNameTag(it: R<aws.ec2.Instance> | R<aws.ec2.Vpc>, report: ReportViolation) {
    if (!it.tags || it.tags["Name"] === undefined) {
        report("A 'Name' tag is required.");
    }
}

// const policies = new PolicyPack("aws", {
//     policies: [
//         {
//             name: "discouraged-ec2-public-ip-address",
//             description: "Associating public IP addresses is discouraged.",
//             enforcementLevel: "advisory",
//             validateResource: validateTypedResource(aws.ec2.Instance.isInstance, (it, args, reportViolation) => {
//                 if (it.associatePublicIpAddress) {
//                     reportViolation("Consider not setting associatePublicIpAddress to true.");
//                 }
//             }),
//         },
//         requireNameTag("required-name-tag", "mandatory"),
//         // {
//         //     name: "required-name-tag",
//         //     description: "A 'Name' tag is required.",
//         //     enforcementLevel: "mandatory",
//         //     // validateResource: [
//         //     //     validateTypedResource(aws.ec2.Instance.isInstance, (it, args, reportViolation) => {
//         //     //         requireNameTag(it.tags, reportViolation);
//         //     //     }),
//         //     //     validateTypedResource(aws.ec2.Vpc.isInstance, (it, args, reportViolation) => {
//         //     //         requireNameTag(it.tags, reportViolation);
//         //     //     }),
//         //     // ],
//         //     validateResource: (args, reportViolation) => {
//         //         requireNameTag(asResource(aws.ec2.Instance.isInstance, args), reportViolation);
//         //         requireNameTag(asResource(aws.ec2.Vpc.isInstance, args), reportViolation);
//         //     },
//         // },
//         {
//             name: "prohibited-public-internet",
//             description: "Ingress rules with public internet access are prohibited.",
//             enforcementLevel: "mandatory",
//             validateResource: validateTypedResource(aws.ec2.SecurityGroup.isInstance, (it, args, reportViolation) => {
//                 const publicInternetRules = it.ingress.find(ingressRule =>
//                     (ingressRule.cidrBlocks || []).find(cidr => cidr === "0.0.0.0/0"));
//                 if (publicInternetRules) {
//                     reportViolation("Ingress rules with public internet access are prohibited.");
//                 }
//             }),
//         },
//         {
//             name: "prohibited-elasticbeanstalk",
//             description: "Use of Elastic Beanstalk is prohibited.",
//             enforcementLevel: "mandatory",
//             validateResource: (args, reportViolation) => {
//                 if (args.type.startsWith("aws:elasticbeanstalk")) {
//                     reportViolation("Use of Elastic Beanstalk is prohibited.");
//                 }
//             },
//         },
//     ],
// });

