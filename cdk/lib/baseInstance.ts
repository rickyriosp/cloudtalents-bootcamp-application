import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import path = require('path');

export interface BaseInstanceProps {
  randomId: string;
  vpc: ec2.IVpc;
  ec2Role: iam.Role;
  ec2SecurityGroup: ec2.SecurityGroup;
}

export class BaseInstance extends Construct {
  readonly instanceId: string;

  constructor(scope: Construct, id: string, props: BaseInstanceProps) {
    super(scope, id);

    // ----------------------------------------------------------------------
    // EC2 Instance
    // ----------------------------------------------------------------------
    const baseInstance = new ec2.Instance(this, `ec2-instance-${props.randomId}`, {
      instanceName: `base-instance-${props.randomId}`,
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnets: props.vpc.publicSubnets,
        onePerAz: false,
      }),
      securityGroup: props.ec2SecurityGroup,
      role: props.ec2Role,
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      associatePublicIpAddress: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(10, {
            volumeType: ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
            deleteOnTermination: true,
          }),
        },
      ],
      userDataCausesReplacement: true,
      //   userData: ec2.UserData.forLinux(),
      init: ec2.CloudFormationInit.fromElements(
        ec2.InitSource.fromGitHub('/opt/app', 'rickyriosp', 'cloudtalents-bootcamp-application'),
      ),
    });

    baseInstance.userData.addExecuteFileCommand({
      filePath: path.join(__dirname, '..', 'resources', 'base_install.sh'),
    });

    baseInstance.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    this.instanceId = baseInstance.instanceId;
  }
}
