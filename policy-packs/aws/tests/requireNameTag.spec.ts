import { assert } from "chai";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as q from "@pulumi/pulumi/queryable";
import { ResolvedResource as R } from "@pulumi/pulumi/queryable";
import { ResourceValidationArgs, ResourceValidationPolicy } from "@pulumi/policy";
import { requireNameTag } from "..";
import { format } from "url";


describe("requireNameTag Raw", () => {
    const policy = requireNameTag("require-name-tag");

    //const bucket = new aws.s3.Bucket("my-bucket");

    const instance = new aws.ec2.Instance("my-instance", {
        ami: "foo",
        instanceType: "a1.medium",
    });

    // checkPolicyWithTypedResource<aws.ec2.Instance>(policy, {
    //     ami: "foo",
    //     instanceType: "a1.medium",
    // })


    it("Should reject tags of undefined, null, empty, and not containing Name", async () => {
        const types = ["aws:ec2/instance:Instance", "aws:ec2/vpc:Vpc"];
        const props = [
            {},
            { tags: undefined },
            { tags: null },
            { tags: {} },
            { tags: { Foo: "bar" } },
        ];
        for (const type of types) {
            for (const p of props) {
                const violations = await checkPolicy(policy, { type: type, props: p });
                assert.lengthOf(violations, 1);
                assert.strictEqual(violations[0].message, "A 'Name' tag is required.");


                //assert.include(violations, { message: "A 'Name' tag is required." });

                // for (const v of violations) {
                //     console.log("JVP" + v.message);
                // }


                //assert.isNotEmpty(await checkPolicy(policy, { type: type, props: p }));
                // assert.include(
                //     await checkPolicy(policy, { type: type, props: p }),
                //     { message: "A 'Name' tag is required." }
                // );
            }
        }



        // const violations = await checkPolicyWithTypedResource(policy, instance);
        // assert.isNotEmpty(violations, violations.map(v => v.message).join(","));
    });

    it("Should tags with 'Name'", async () => {
        const types = ["aws:ec2/instance:Instance", "aws:ec2/vpc:Vpc"];
        for (const type of types) {
            assert.isEmpty(await checkPolicy(policy, { type: type, props: { tags: { Name: "foo" } } }));
        }
    });

    // const emptyKey: R<aws.kms.Key> = {} as any;

    // it("Should reject enableKeyRotation of undefined, null, and false", async () => {
    //     assert.rejects(checkCmkBackingKeyRotationEnabled(emptyKey));
    //     assert.rejects(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: undefined })));
    //     assert.rejects(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: null })));
    //     assert.rejects(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: false })));
    // });

    // it("Should accept enableKeyRotation of true", async () => {
    //     assert.doesNotReject(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: true })));
    // });
});

// describe("requireNameTag Raw", () => {
//     const policy = requireNameTag("require-name-tag");

//     const emptyInstance: R<aws.ec2.Instance> = {} as any;

//     it("Should reject tags of undefined, null, empty, and not containing ", () => {
//         assertViolations(runPolicy(policy))

//         assert.strictEqual(runPolicy().length, )
//     });

//     // const emptyKey: R<aws.kms.Key> = {} as any;

//     // it("Should reject enableKeyRotation of undefined, null, and false", async () => {
//     //     assert.rejects(checkCmkBackingKeyRotationEnabled(emptyKey));
//     //     assert.rejects(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: undefined })));
//     //     assert.rejects(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: null })));
//     //     assert.rejects(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: false })));
//     // });

//     // it("Should accept enableKeyRotation of true", async () => {
//     //     assert.doesNotReject(checkCmkBackingKeyRotationEnabled(Object.assign(emptyKey, { enableKeyRotation: true })));
//     // });
// });


interface PolicyViolation {
    message: string;
    urn?: string;
}

function assertNoViolations(violations: PolicyViolation[]) {
    assert.strictEqual(violations.length, 0);
}

function assertViolations(violations: PolicyViolation[]) {
    assert.notStrictEqual(violations.length, 0);
}

async function checkPolicy(policy: ResourceValidationPolicy, args: ResourceValidationArgs): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    const report = (message: string, urn?: string) => {
        violations.push({ message: message, urn: urn });
    };

    const validations = Array.isArray(policy.validateResource)
        ? policy.validateResource
        : [policy.validateResource];

    for (const validation of validations) {
        await Promise.resolve(validation(args, report));
    }

    return violations;
}

type SecondConstructorParameter<T> = T extends new (arg1: any, arg2: infer U, ...args: any[]) => any ? U : any;

// async function checkPolicyWithTypedResource<TResource extends pulumi.CustomResource>(
//     policy: ResourceValidationPolicy,
//     args: SecondConstructorParameter<TResource>) {

// }

async function checkPolicyWithTypedResource<TResource extends pulumi.CustomResource>(
    policy: ResourceValidationPolicy,
    resource: TResource): Promise<PolicyViolation[]> {

    const props = {};

    const keys = Object.keys(resource);
    for (const k of keys) {
        if (typeof resource[k].apply === "function") {
            props[k] = await new Promise(resolve => {
                resource[k].apply(v => { resolve(v); });
            });
        } else {
            props[k] = resource[k];
        }


        // props[k] = await new Promise((resolve, reject) => {
        //     resource[k].apply(v => { resolve(v); });
        // });
    }

    const args: ResourceValidationArgs = {
        type: resource["__pulumiType"],
        props: props,
    }

    const violations = await checkPolicy(policy, args);

    console.log("JVP: " + args.type);
    console.log("JVP: " + JSON.stringify(args.props));

    return violations;
}

// function foo<T extends CustomResource>() {

// }

// function checkPolicyResource(policy: ResourceValidationPolicy, resource: pulumi.CustomResource): Promise<PolicyViolation[]> {
//     const violations: PolicyViolation[] = [];
//     const report = (message: string, urn?: string) => {
//         violations.push({ message: message, urn: urn });
//     };
//     const args: ResourceValidationArgs = {
//         type: resource["__pulumiType"],
//         props: q.
//     };

//     await Promise.resolve()

//     policy.validateResource(, report);
//     return violations;
// }