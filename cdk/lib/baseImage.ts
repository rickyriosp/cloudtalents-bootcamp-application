import * as cdk from 'aws-cdk-lib';
import * as imagebuilder from 'aws-cdk-lib/aws-imagebuilder';
import { Construct } from 'constructs';

export interface BaseImageProps {}

export class BaseImage extends Construct {
  constructor(scope: Construct, id: string, props: BaseImageProps) {
    super(scope, id);

    const component = new imagebuilder.CfnComponent(this, 'Component', {});

    const imageRecipe = new imagebuilder.CfnImageRecipe(this, 'ImageRecipe', {
        
    });

    const infraConfiguration = new imagebuilder.CfnInfrastructureConfiguration(
      this,
      'InfrastructureConfiguration',
      {},
    );

    const distribution = new imagebuilder.CfnDistributionConfiguration(this, 'Distribution', {});

    const imagePipeline = new imagebuilder.CfnImagePipeline(this, 'ImagePipeline', {});

    const image = new imagebuilder.CfnImage(this, 'Image', {});

    new cdk.CfnOutput(this, 'AmiIdOutput', {
        exportName: 'ami-id',
        value: imagePipeline.
    });
  }
}
