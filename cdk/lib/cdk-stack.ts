import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { BaseInstance } from './baseInstance';

export class CloudTalentsAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // For workflows triggered by release, this is the release tag created
    // For tags it is refs/tags/<tag_name>. For example, refs/heads/feature-branch-1.
    // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs#github-context
    const gitubRef = process.env.gitubRef?.split('/') ?? ['0.0.0-Default'];
    const version = gitubRef![gitubRef?.length! - 1];

    // ----------------------------------------------------------------------
    // VPC
    // ----------------------------------------------------------------------
    const vpcId = process.env.vpcId;

    const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
      vpcId: vpcId,
    });

    // ----------------------------------------------------------------------
    // Security Group
    // ----------------------------------------------------------------------
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'ec2-sg', {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: 'ec2-ssh-access',
      description: 'Allow EC2 SSH Access',
    });

    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.SSH, 'SSH Access');
    ec2SecurityGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // ----------------------------------------------------------------------
    // EC2 Role
    // ----------------------------------------------------------------------
    const ec2Role = new iam.Role(this, 'ec2-role', {
      roleName: 'ec2-role',
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });

    ec2Role.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // ----------------------------------------------------------------------
    // EC2 Base Instance
    // ----------------------------------------------------------------------
    const randomId = Math.random().toString(16).substring(2);
    const baseInstance = new BaseInstance(this, `BaseInstance-${randomId}`, {
      randomId: randomId,
      vpc: vpc,
      ec2Role: ec2Role,
      ec2SecurityGroup: ec2SecurityGroup,
    });

    new cdk.CfnOutput(this, 'Version', {
      value: version,
      exportName: 'Version',
    });
    new cdk.CfnOutput(this, 'InstanceId', {
      value: baseInstance.instanceId,
      exportName: 'InstanceId',
    });
  }
}
