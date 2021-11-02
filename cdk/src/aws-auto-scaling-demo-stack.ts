import * as Core from '@aws-cdk/core';
import * as EC2 from '@aws-cdk/aws-ec2';
import * as ASG from '@aws-cdk/aws-autoscaling';
import { MetaData } from './meta-data';
import { AmazonLinuxEdition, AmazonLinuxGeneration, InstanceClass, InstanceSize, InstanceType, IVpc, MachineImage, Subnet, SubnetFilter, SubnetType, UserData, Vpc } from '@aws-cdk/aws-ec2';
import { Duration, Tag, Tags } from '@aws-cdk/core';
import { IRole, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { AdjustmentType, ScalingProcess, StepScalingAction } from '@aws-cdk/aws-autoscaling';

export class AWSAutoScalingDemoStack extends Core.Stack {
  constructor(scope: Core.Construct, id: string, props?: Core.StackProps) {
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
      /*cidr: "10.40.0.0/16", subnetConfiguration: [
          { cidrMask: 24, name: MetaData.PREFIX+"isolated-sne", subnetType: SubnetType.ISOLATED }       
      ],*/
      cidr: "10.40.0.0/16", subnetConfiguration: [
          //{ cidrMask: 24, name: MetaData.PREFIX+"isolated-sne", subnetType: SubnetType.ISOLATED },
          { cidrMask: 25, name: MetaData.PREFIX+"public-sne", subnetType: SubnetType.PUBLIC }       
      ],
      maxAzs: 2
    });
    
    /*var publicNacl = this.createPublicNacl(vpc);
    vpc.publicSubnets.forEach( subnet => { subnet.associateNetworkAcl(MetaData.PREFIX+"public-nacl-assoc", publicNacl) } );
    var privateNacl = this.createPrivateNacl(vpc);
    vpc.privateSubnets.forEach( subnet => { subnet.associateNetworkAcl(MetaData.PREFIX+"private-nacl-assoc", privateNacl) } );
    */
    this.tagVPCResources(vpc);
    //Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"vpc");
    
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
    userData.addCommands("cd /tmp");
    userData.addCommands("yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm");
    userData.addCommands("systemctl enable amazon-ssm-agent");
    userData.addCommands("systemctl start amazon-ssm-agent");
    userData.addCommands("yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm -y");
    userData.addCommands("yum install stress -y");
    userData.addCommands("yum install httpd -y");
    userData.addCommands("yum install git -y");
    userData.addCommands("git clone https://github.com/sundgaard-aws/aws-auto-scaling.git");

    /*userData.addCommands("uptime");
    userData.addCommands("sudo stress --cpu  8 --timeout 20");
    userData.addCommands("uptime");*/
    return userData;
  }
  
  private defineAutoScalingGroup(vpc:IVpc,instanceType:InstanceType) {    
    var asg = new ASG.AutoScalingGroup(this, MetaData.PREFIX+"asg", { 
      vpc:vpc,instanceType:instanceType,
      machineImage:MachineImage.latestAmazonLinux({generation:AmazonLinuxGeneration.AMAZON_LINUX_2,edition:AmazonLinuxEdition.STANDARD}),
      autoScalingGroupName:MetaData.PREFIX+"asg",
      userData:this.buildUserData(),
      vpcSubnets:vpc.selectSubnets({subnets:vpc.publicSubnets}),
      minCapacity:0,maxCapacity:4,desiredCapacity:0,cooldown:Duration.seconds(30),
      role: this.buildEC2ASGRole()
    });
    asg.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));
    asg.scaleOnCpuUtilization(MetaData.PREFIX+"asg", {targetUtilizationPercent:60,cooldown:Duration.seconds(10),estimatedInstanceWarmup:Duration.seconds(60)});
    //asg.scaleOnMetric(MetaData.PREFIX+"asg", {adjustmentType:AdjustmentType.CHANGE_IN_CAPACITY,})
    Tags.of(asg.role).add(MetaData.NAME, MetaData.PREFIX+"role");
    Tags.of(asg).add(MetaData.NAME, MetaData.PREFIX+"asg");
    return asg;
  }

  private buildEC2ASGRole(): IRole {
    var role = new Role(this, MetaData.PREFIX+"role", {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      roleName: MetaData.PREFIX+"ec2-asg-role",
      description: "EC2 Role used for the auto scaling group launch configuration"
    });
    return role;
  }

  private tagVPCResources(vpc: Vpc) {
    Core.Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"vpc");
    Core.Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"igw", { includeResourceTypes: [EC2.CfnInternetGateway.CFN_RESOURCE_TYPE_NAME] });
    Core.Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"nat", { includeResourceTypes: [EC2.CfnNatGateway.CFN_RESOURCE_TYPE_NAME]});
    Core.Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"default-nacl", { includeResourceTypes: [EC2.CfnNetworkAcl.CFN_RESOURCE_TYPE_NAME]});
    var defaultNacl = EC2.NetworkAcl.fromNetworkAclId(vpc, MetaData.PREFIX+"vpc", vpc.vpcDefaultNetworkAcl);
    Core.Tags.of(defaultNacl).add(MetaData.NAME, MetaData.PREFIX+"default-nacl");
    
    Core.Tags.of(vpc).add(MetaData.NAME, MetaData.PREFIX+"default-sg", { includeResourceTypes: [EC2.CfnSecurityGroup.CFN_RESOURCE_TYPE_NAME]});
    
    vpc.publicSubnets.forEach( subnet => {
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"public-sne", { includeResourceTypes: [EC2.CfnSubnet.CFN_RESOURCE_TYPE_NAME]});
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"public-rt", { includeResourceTypes: [EC2.CfnRouteTable.CFN_RESOURCE_TYPE_NAME]});
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"public-nacl", { includeResourceTypes: [EC2.CfnNetworkAcl.CFN_RESOURCE_TYPE_NAME]});
    });
    
    vpc.privateSubnets.forEach( subnet => {
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"private-sne", { includeResourceTypes: [EC2.CfnSubnet.CFN_RESOURCE_TYPE_NAME]});
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"private-rt", { includeResourceTypes: [EC2.CfnRouteTable.CFN_RESOURCE_TYPE_NAME]});
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"private-nacl", { includeResourceTypes: [EC2.CfnNetworkAcl.CFN_RESOURCE_TYPE_NAME]});
    });
    
    vpc.isolatedSubnets.forEach( subnet => {
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"isolated-sne", { includeResourceTypes: [EC2.CfnSubnet.CFN_RESOURCE_TYPE_NAME]});
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"isolated-rt", { includeResourceTypes: [EC2.CfnRouteTable.CFN_RESOURCE_TYPE_NAME]});
        Core.Tags.of(subnet).add(MetaData.NAME, MetaData.PREFIX+"isolated-nacl", { includeResourceTypes: [EC2.CfnNetworkAcl.CFN_RESOURCE_TYPE_NAME]});
    });
  }  
}

