import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { BaseInstance } from './baseInstance';
import { CreateAMI, ResourceType, VolumeType } from './createAMI';

export class CdkStack extends cdk.Stack {
  readonly githubProvider: iam.IOpenIdConnectProvider;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const gitubRef = process.env.version?.split('/') ?? ['0.0.0-Default'];
    const version = gitubRef![gitubRef?.length! - 1];

    // ----------------------------------------------------------------------
    // OIDC Provider
    // ----------------------------------------------------------------------
    try {
      this.githubProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        'GitHubOidcProvider',
        `arn:${this.partition}:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
      );
    } catch (error) {
      this.githubProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
        thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
      });
    }

    // ----------------------------------------------------------------------
    // EC2 Base Instance
    // ----------------------------------------------------------------------
    const baseInstance = new BaseInstance(this, 'BaseInstance');

    // ----------------------------------------------------------------------
    // EC2 Base AMI
    // ----------------------------------------------------------------------
    const baseAmi = new CreateAMI(this, 'BaseAMI', {
      instanceId: baseInstance.instanceId,
      description: 'CloudTalents Startup Base AMI',
      name: `cloudtalents-startup-v${version}`,
      deleteInstance: true,
      deleteAmi: true,
      blockDeviceMappings: [
        {
          deviceName: '/dev/xvda',
          ebs: {
            volumeSize: 8,
            volumeType: VolumeType.GP3,
            deleteOnTermination: true,
          },
        },
      ],
      tagSpecifications: [
        {
          resourceType: ResourceType.IMAGE,
          tags: [{ key: 'version', value: version }],
        },
      ],
    });
  }
}
