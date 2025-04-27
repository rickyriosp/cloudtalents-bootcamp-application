import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import path = require('path');

export interface BaseInstanceProps {}

export class BaseInstance extends Construct {
  readonly instanceId: string;

  constructor(scope: Construct, id: string, props?: BaseInstanceProps) {
    super(scope, id);

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
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });

    ec2Role.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // ----------------------------------------------------------------------
    // EC2 Instance
    // ----------------------------------------------------------------------
    const baseInstance = new ec2.Instance(this, 'ec2-instance', {
      instanceName: 'ami-base-instance',
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnets: vpc.publicSubnets,
        onePerAz: false,
      }),
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      associatePublicIpAddress: true,
      //   blockDevices: [
      //     {
      //       deviceName: '/dev/xvda',
      //       volume: ec2.BlockDeviceVolume.ebs(10, {
      //         volumeType: ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
      //         deleteOnTermination: true,
      //       }),
      //     },
      //   ],
      userDataCausesReplacement: true,
      //   userData: ec2.UserData.forLinux(),
      //init: ec2.CloudFormationInit.fromElements(),
    });

    baseInstance.userData.addExecuteFileCommand({
      filePath: path.join(__dirname, '..', 'resources', 'base_install.sh'),
    });
    
    baseInstance.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    this.instanceId = baseInstance.instanceId;
  }
}
