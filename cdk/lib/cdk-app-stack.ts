import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import path = require('path');

export class CloudTalentsAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AMI version to use - from GitHub Actions input param
    const version = process.env.version;
    console.log(`AMI name: cloudtalents-startup-${version}`);

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
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'ec2-http-sg', {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: 'ec2-http-access',
      description: 'Allow EC2 HTTP Access',
    });

    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.HTTP, 'Allow HTTP Access');
    // ec2SecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(),'Allow ALL Outbound Access');
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
    // EC2 Instance Profile
    // ----------------------------------------------------------------------
    const ec2InstanceProfile = new iam.InstanceProfile(this, 'ec2-iprofile', {
      instanceProfileName: 'ec2-iprofile',
      role: ec2Role,
    });

    // ----------------------------------------------------------------------
    // EC2 Instance
    // ----------------------------------------------------------------------
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      instanceName: 'cloudtalents-app',
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnets: vpc.publicSubnets,
        onePerAz: false,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      associatePublicIpAddress: true,
      machineImage: ec2.MachineImage.lookup({
        name: `cloudtalents-startup-${version}`,
        owners: [this.account],
        // filters: {
        //   imageId: [''],
        // },
      }),
    });

    ec2Instance.userData.addExecuteFileCommand({
      filePath: path.join(__dirname, '..', 'resources', 'new_install.sh'),
    });
  }
}
