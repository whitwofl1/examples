package main

import (
	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		ctx.Export("foo", pulumi.String("bar"))
		return nil
	})
}
