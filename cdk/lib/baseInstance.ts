import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';

import path = require('path');

export interface BaseInstanceProps {
  randomId: string;
  vpc: ec2.IVpc;
  ec2SecurityGroup: ec2.SecurityGroup;
  ec2InstanceProfile: iam.InstanceProfile;
}

export class BaseInstance extends Construct {
  readonly instanceId: string;

  constructor(scope: Construct, id: string, props: BaseInstanceProps) {
    super(scope, id);

    const secret_key = process.env.SECRET_KEY ?? '';
    const db_user = process.env.DB_USER ?? '';
    const db_password = process.env.DB_PASSWORD ?? '';
    const db_secrets = `#!/bin/bash
export SECRET_KEY=${secret_key}
export DB_USER=${db_user}
export DB_PASSWORD=${db_password}
`;

    // ----------------------------------------------------------------------
    // EC2 Instance
    // ----------------------------------------------------------------------
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      readFileSync(path.join(__filename, '..', '..', 'resources', 'base_install_ubuntu.sh'), {
        encoding: 'utf-8',
      }),
    );

    const baseInstance = new ec2.Instance(this, `ec2-instance-${props.randomId}`, {
      instanceName: `base-instance-${props.randomId}`,
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnets: props.vpc.publicSubnets,
        onePerAz: false,
      }),
      securityGroup: props.ec2SecurityGroup,
      instanceProfile: props.ec2InstanceProfile,
      // machineImage: ec2.MachineImage.genericLinux({
      //   //https://cloud-images.ubuntu.com/locator/ec2/
      //   'us-east-1': 'ami-09b9b5665040249ad'
      // }),
      machineImage: ec2.MachineImage.fromSsmParameter(
        //https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
        '/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id',
        {
          os: ec2.OperatingSystemType.LINUX,
          userData: userData,
        },
      ),
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
      // userData: ec2.UserData.forLinux(),
      init: ec2.CloudFormationInit.fromElements(
        ec2.InitSource.fromGitHub('/opt/app', 'rickyriosp', 'cloudtalents-bootcamp-application'),
        ec2.InitFile.fromString('/opt/app/secrets.sh', db_secrets),
        // ec2.InitCommand.shellCommand('/opt/app/setup.sh'),
      ),
    });

    // baseInstance.userData.addExecuteFileCommand({
    //   filePath: path.join(__filename, '..', '..', '..', 'setup.sh'),
    // });

    baseInstance.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    this.instanceId = baseInstance.instanceId;
  }
}
