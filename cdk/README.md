# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Latest CDK docs
https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html
https://docs.aws.amazon.com/cdk/api/latest/docs/aws-autoscaling-readme.html

## Upgrade the CDK
npm install -g aws-cdk@latest

## Upgrade nodejs on Windows
choco install nodejs

## Upgrade nodejs on Ubuntu
yum install nodejs

## Load stress tool
https://www.tecmint.com/linux-cpu-load-stress-test-with-stress-ng-tool/
https://www.linuxshelltips.com/create-cpu-load-linux/

``` bash
sudo yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm -y
sudo yum install stress -y
sudo stress --cpu 4 -v --timeout 500s
top
```