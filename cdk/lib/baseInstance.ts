import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface BaseInstanceProps {}

export class BaseInstance extends Construct {
  readonly instanceId: string;

  readonly ec2SecurityGroup: ec2.ISecurityGroup;

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
    try {
      this.ec2SecurityGroup = ec2.SecurityGroup.fromLookupByName(
        this,
        'ec2-sg',
        'Allow EC2 SSH Access',
        vpc,
      );
    } catch (error) {
      this.ec2SecurityGroup = new ec2.SecurityGroup(this, 'ec2-sg', {
        vpc: vpc,
        securityGroupName: 'Allow EC2 SSH Access',
      });
    }
    this.ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.SSH, 'SSH Access');

    // ----------------------------------------------------------------------
    // EC2 Role
    // ----------------------------------------------------------------------
    const ec2Role = new iam.Role(this, 'ec2-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });

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
      securityGroup: this.ec2SecurityGroup,
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
      //userData: ec2.UserData.forLinux(),
      //init: ec2.CloudFormationInit.fromElements(),
    });

    baseInstance.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    // baseInstance.addUserData()

    this.instanceId = baseInstance.instanceId;
  }
}
