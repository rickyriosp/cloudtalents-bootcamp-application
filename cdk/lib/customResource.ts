import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as path from 'path';

export interface CreateAMICustomResourceProps extends cdk.ResourceProps {
  readonly properties: { [propname: string]: any };
  readonly uid: string;
}

export class CreateAMICustomResource extends Construct {
  public readonly lambda: lambda.IFunction;
  public readonly createAMICustomResource: cdk.CustomResource;

  constructor(scope: Construct, id: string, props: CreateAMICustomResourceProps) {
    super(scope, id);
    this.lambda = this.ensureLambda();

    const CreateAMIProvider = new cr.Provider(this, 'AmiResourceProvider', {
      onEventHandler: this.lambda,
    });

    this.createAMICustomResource = new cdk.CustomResource(this, 'AmiCustomResource', {
      serviceToken: CreateAMIProvider.serviceToken,
      properties: { ...props },
    });
  }

  private ensureLambda(): lambda.Function {
    const stack = cdk.Stack.of(this);
    const constructName = 'CreateAMIResource';
    const existing = stack.node.tryFindChild(constructName);
    if (existing) {
      return existing as lambda.Function;
    }

    const amiCustomResourceRole = new iam.Role(this, 'AmiCustomResourceRole', {
      description: 'Custom AMI Resources',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['AmiPolicy']: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: ['*'],
              actions: [
                'ec2:*',
                'lambda:GetPolicy',
                'lambda:AddPermission',
                'iam:PutRolePolicy',
                'iam:CreateServiceLinkedRole',
              ],
            }),
            new iam.PolicyStatement({
              resources: [
                `arn:${stack.partition}:ssm:${stack.region}:${stack.account}:parameter/createAMI/*`,
              ],
              actions: ['ssm:PutParameter', 'ssm:GetParameter', 'ssm:DeleteParameter'],
            }),
          ],
        }),
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    const fn = new lambda.Function(stack, constructName, {
      runtime: lambda.Runtime.PYTHON_3_13,
      code: lambda.Code.fromAsset(path.join(__dirname, '../resources')),
      handler: 'index.handler',
      architecture: lambda.Architecture.ARM_64,
      role: amiCustomResourceRole,
      timeout: cdk.Duration.minutes(15),
    });

    return fn;
  }
}
