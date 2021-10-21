#!/usr/bin/env node
import 'source-map-support/register';
import * as CDK from '@aws-cdk/core';
import { AWSAutoScalingDemoStack } from './aws-auto-scaling-demo-stack';
import { MetaData } from './meta-data';

var props = {env: {account: process.env["CDK_DEFAULT_ACCOUNT"], region: process.env["CDK_DEFAULT_REGION"] } };
logDebug("Using account="+process.env["CDK_DEFAULT_ACCOUNT"]);
logDebug("Using region="+process.env["CDK_DEFAULT_REGION"]);
const app = new CDK.App();
new AWSAutoScalingDemoStack(app, MetaData.PREFIX+'compute-stack', props);


function logDebug(msg:String) {
    console.debug(msg);
}