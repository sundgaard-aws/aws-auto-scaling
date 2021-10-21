import * as CDK from '@aws-cdk/core';
import * as ASG from '@aws-cdk/aws-autoscaling';
import { MetaData } from './meta-data';
import { InstanceClass, InstanceSize, InstanceType, IVpc, MachineImage, SubnetType, UserData, Vpc } from '@aws-cdk/aws-ec2';
import { Duration, Tag, Tags } from '@aws-cdk/core';
import { ManagedPolicy, Policy, PolicyStatement } from '@aws-cdk/aws-iam';

export class AWSAutoScalingDemoStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);
    var vpc = this.defineVPC();
    var instanceType = this.defineInstanceType();
    //this.defineLaunchTemplate(vpc, instanceType);
    this.defineAutoScalingGroup(vpc, instanceType);
  }

  private defineInstanceType():InstanceType {
    var instanceType = InstanceType.of(InstanceClass.T3, InstanceSize.MICRO);
    return instanceType;
  }

  private defineVPC():IVpc {
    var vpc = new Vpc(this, MetaData.PREFIX+"vpc", {
      /*cidr: "10.40.0.0/16", subnetConfiguration: [
          { cidrMask: 24, name: MetaData.PREFIX+"private-sne", subnetType: SubnetType.PRIVATE },
          { cidrMask: 25, name: MetaData.PREFIX+"public-sne", subnetType: SubnetType.PUBLIC }
      ],*/
      cidr: "10.40.0.0/16", subnetConfiguration: [
          { cidrMask: 24, name: MetaData.PREFIX+"isolated-sne", subnetType: SubnetType.ISOLATED }       
      ],
      maxAzs: 2
    });
    
    /*var publicNacl = this.createPublicNacl(vpc);
    vpc.publicSubnets.forEach( subnet => { subnet.associateNetworkAcl(MetaData.PREFIX+"public-nacl-assoc", publicNacl) } );
    var privateNacl = this.createPrivateNacl(vpc);
    vpc.privateSubnets.forEach( subnet => { subnet.associateNetworkAcl(MetaData.PREFIX+"private-nacl-assoc", privateNacl) } );
    
    this.tagVPCResources(vpc);*/
    Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"vpc");
    
    return vpc;
  }

  /*private defineLaunchTemplate(vpc:IVpc,instanceType:InstanceType):ASG. {
    var asg = new ASG.AutoScalingGroup(this, MetaData.PREFIX+"asg", { vpc:vpc,instanceType:instanceType,machineImage:MachineImage.latestAmazonLinux()});
    return asg;
  }*/

  private buildUserData():UserData {
    var userData = UserData.forLinux();
    /*var commands:string[];
    var commands = new Array<string>();
    commands.push("ssd");    
    var strarr:string[]=commands.slice(0);*/
    userData.addCommands("yum install stress");
    /*userData.addCommands("uptime");
    userData.addCommands("sudo stress --cpu  8 --timeout 20");
    userData.addCommands("uptime");*/
    return userData;
  }
  
  private defineAutoScalingGroup(vpc:IVpc,instanceType:InstanceType) {    
    var asg = new ASG.AutoScalingGroup(this, MetaData.PREFIX+"asg", { 
      vpc:vpc,instanceType:instanceType,
      machineImage:MachineImage.latestAmazonLinux(),
      autoScalingGroupName:MetaData.PREFIX+"asg",
      userData:this.buildUserData(),
    });
    asg.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));
    asg.scaleOnCpuUtilization(MetaData.PREFIX+"asg", {targetUtilizationPercent:60,cooldown:Duration.seconds(10)})
    Tags.of(asg.role).add(MetaData.NAME, MetaData.PREFIX+"role");
    Tags.of(asg).add(MetaData.NAME, MetaData.PREFIX+"asg");
    return asg;
  }
}

