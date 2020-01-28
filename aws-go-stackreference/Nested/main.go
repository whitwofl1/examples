package main

import (
	"fmt"

	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		ref, err := pulumi.NewStackReference(*ctx, "EvanBoyle/GoStackRefExample/dev", nil)
		if err != nil {
			return err
		}
		bar := ref.GetOutput(pulumi.String("foo"))
		bar.Apply(func(b interface{}) (interface{}, error) {
			fmt.Println(b.(string))
			return nil, nil
		})
		ctx.Export("bar", bar)
		return nil
	})
}
