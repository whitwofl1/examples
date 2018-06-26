import * as pulumi from "@pulumi/pulumi"
import * as dynamic from "@pulumi/pulumi/dynamic";

class EKSNodeAccessProvider implements dynamic.ResourceProvider {
    private async invokeKubectl(kubeconfig: string, instanceRoleArn: string, isDelete: boolean) {
		const child_process = await import("child_process");
		const fs = await import("fs");
        const process = await import("process");
		const tmp = await import("tmp");

        // Write the kubectl config and access policy to temporary files and apply the access policy changes.
		const configFile = tmp.fileSync({ postfix: ".yaml" });
		fs.writeFileSync(configFile.fd, kubeconfig);

        const env = Object.assign({}, process.env);
        env.KUBECONFIG = `${process.env.KUBECONFIG || ""}:${configFile.name}`;

        if (isDelete) {
            child_process.execSync(`kubectl delete configmaps --namespace kube-system aws-auth`, { env: env });
            return;
        }

        const accessPolicy = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: ${instanceRoleArn}
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
`;
        const accessPolicyFile = tmp.fileSync({ postfix: ".yaml" });
        fs.writeFileSync(accessPolicyFile.fd, accessPolicy);

        child_process.execSync(`kubectl apply -f ${accessPolicyFile.name}`, { env: env });
    }

    public check(olds: any, news: any) { return Promise.resolve({ inputs: news }); }
    public async create(inputs: any) {
        await this.invokeKubectl(<string>inputs.kubeconfig, <string>inputs.instanceRoleArn, false);
        return { id: "0", outs: inputs };
    }
    public async update(id: string, olds: any, news: any) {
        await this.invokeKubectl(<string>news.kubeconfig, <string>news.instanceRoleArn, false);
        return { outs: news };
    }
    public async delete(id: pulumi.ID, props: any) {
        await this.invokeKubectl(<string>props.kubeconfig, <string>props.instanceRoleArn, true);
    }
}

export interface EKSNodeAccessArgs {
    kubeconfig: pulumi.Input<string>;

    instanceRoleArn: pulumi.Input<string>;
}

export class EKSNodeAccess extends dynamic.Resource {
    constructor(name: string, args: EKSNodeAccessArgs, opts?: pulumi.ResourceOptions) {
        super(new EKSNodeAccessProvider(), name, args, opts);
    }
}

