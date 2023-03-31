import * as ecs from '@aws-sdk/client-ecs';
import * as elb from '@aws-sdk/client-elastic-load-balancing-v2';

import { ServiceInstance, Service } from './service';
import { DescribeServicesCommand } from '@aws-sdk/client-ecs';

export type DeploymentConfig = {
    region: string;
    cluster: string;

    service_name: string;
    production_url: string;
    staging_url: string;
    listener_port: number;
    productionHealthCheckUrl: string;
}

export class DeploymentService {

    private ecsClient: ecs.ECSClient;
    private elbClient: elb.ElasticLoadBalancingV2;

    constructor(private config: DeploymentConfig) {

        this.ecsClient = new ecs.ECSClient({ region: config.region });
        this.elbClient = new elb.ElasticLoadBalancingV2({ region: config.region });
    }

    status = async (): Promise<Service> => {

        let serviceName = this.config.service_name;
        let cluster = this.config.cluster;
        let staging_url = this.config.staging_url;
        let production_url = this.config.production_url;

        let green = `${serviceName}-green`;
        let blue = `${serviceName}-blue`;

        let data = await this.ecsClient.send(new ecs.DescribeServicesCommand({
            cluster: cluster,
            services: [green, blue]
        }));

        let instances: Array<ServiceInstance> = [];


        for (const svc of data.services) {

            // Query for ECS properties
            let taskDescriptor = await this.ecsClient.send(new ecs.DescribeTaskDefinitionCommand({ taskDefinition: svc.taskDefinition }));

            // Query for ALB properties
            let targetGroups = await this.elbClient.send(new elb.DescribeTargetGroupsCommand({
                TargetGroupArns: [svc.loadBalancers[0].targetGroupArn]
            }));

            let tg = targetGroups.TargetGroups[0];
            let listeners = await this.elbClient.send(new elb.DescribeListenersCommand({ LoadBalancerArn: tg.LoadBalancerArns[0] }));
            let listener = listeners?.Listeners.find(l => l.Port == this.config.listener_port);
            let rules = await this.elbClient.send(new elb.DescribeRulesCommand({ ListenerArn: listener?.ListenerArn }));
            let rule = rules?.Rules.find(r => this.ruleForwardsToTarget(r, tg.TargetGroupArn));

            // Create object
            let instance = new ServiceInstance();

            instance.version = taskDescriptor.taskDefinition.containerDefinitions[0].image.split(':')[1];
            instance.url = rule.Conditions[0].HostHeaderConfig.Values[0];

            instance.alb_arn = tg.LoadBalancerArns[0];
            instance.target_arn = svc.loadBalancers[0].targetGroupArn;
            instance.rule_arn = rule.RuleArn;

            instance.cluster_arn = svc.clusterArn;
            instance.service_arn = svc.serviceArn;
            instance.task_arn = taskDescriptor.taskDefinition.taskDefinitionArn;
            instance.task = taskDescriptor.taskDefinition;
            instance.deploy_status = svc.deployments[0].status;
            instance.rollout_status = svc.deployments[0].rolloutState;

            instances.push(instance);
        }

        let production = instances.find(i => i.url == production_url);
        let staging = instances.find(i => i.url == staging_url);

        return {
            production: production,
            staging: staging
        };
    }

    ruleForwardsToTarget(rule: elb.Rule, target_arn: string) {

        for (const action of rule.Actions) {
            if (action.TargetGroupArn == target_arn) {
                return true;
            }
        }


        return false;
    }


    deploy = async (slot: ServiceInstance, version: string, awaitCompletion: boolean = true) => {

        let serviceName = this.config.service_name;
        let newTask = await this.getMatchingTaskDefs(version, 5);

        if (!newTask) {

            console.log(`... adding new version '${version}' to task '${slot.task_arn}'`);

            let image = `${slot.task.containerDefinitions[0].image.split(':')[0]}:${version}`;
            slot.task.containerDefinitions[0].image = image;
            slot.task.containerDefinitions[0].environment = [{ name: "AC_SERVICE_VERSION", value: version }]

            let taskCreation = await this.ecsClient.send(new ecs.RegisterTaskDefinitionCommand({
                family: serviceName,
                containerDefinitions: slot.task.containerDefinitions,
                cpu: slot.task.cpu,
                ephemeralStorage: slot.task.ephemeralStorage,
                executionRoleArn: slot.task.executionRoleArn,
                inferenceAccelerators: slot.task.inferenceAccelerators,
                ipcMode: slot.task.ipcMode,
                pidMode: slot.task.pidMode,
                memory: slot.task.memory,
                networkMode: slot.task.networkMode,
                placementConstraints: slot.task.placementConstraints,
                proxyConfiguration: slot.task.proxyConfiguration,
                requiresCompatibilities: slot.task.compatibilities,
                runtimePlatform: slot.task.runtimePlatform,
                volumes: slot.task.volumes
            }));

            newTask = taskCreation.taskDefinition.taskDefinitionArn;
        }

        console.log(`... deploying revision ${newTask.split(':').reverse()[0]} to service '${slot.service_arn}'`);

        await this.ecsClient.send(new ecs.UpdateServiceCommand({
            cluster: slot.cluster_arn,
            service: slot.service_arn,
            taskDefinition: newTask
        }));

        if (awaitCompletion) {
            if (await this.waitForDeploySuccess(slot)) {
                console.log('Deployment complete');
            }
            else {
                console.warn('Deployment timed out');
            }
        }
    }

    async waitForDeploySuccess(slot: ServiceInstance, maxAttempts: number = 60, waitSeconds: number = 5): Promise<boolean> {
        let attempts = 0;

        while (attempts < maxAttempts) {

            let services = await this.ecsClient.send(new DescribeServicesCommand({ services: [slot.service_arn], cluster: slot.cluster_arn }));
            let service = services.services[0];
            let deployment = service.deployments[0];

            if (deployment.rolloutState == 'COMPLETED') {
                return true;
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000 * waitSeconds));
        }

        return false;
    }



    getMatchingTaskDefs = async (version: string, maxDepth: number) => {


        let taskDefinitions = await this.ecsClient.send(new ecs.ListTaskDefinitionsCommand({ familyPrefix: this.config.service_name, sort: 'DESC', maxResults: maxDepth }));
        let tasks: Array<ecs.TaskDefinition> = [];

        for (const task_arn of taskDefinitions.taskDefinitionArns) {
            let task = await this.ecsClient.send(new ecs.DescribeTaskDefinitionCommand({ taskDefinition: task_arn }));

            if (task.taskDefinition.containerDefinitions[0].image.split(':')[1] == version) {
                return task_arn;
            }
        }

        return null;
    }

    swap = async (service: Service) => {

        this.logRule(service.staging);
        this.logRule(service.production);

        await this.updateRule(service.staging.rule_arn, service.production.url, service.staging.target_arn);
        await this.updateRule(service.production.rule_arn, service.staging.url, service.production.target_arn);
    }

    logRule = (instance: ServiceInstance) => {

        let rule = instance.rule_arn.split('/').reverse()[0];
        let target = instance.target_arn.split('/').reverse()[1];

        console.log(`Rule '${rule}' uses HostCondition '${instance.url}' and points to target ${target}`);
    }

    updateRule = async (rule_arn: string, host: string, target_arn: string) => {

        let rule = rule_arn.split('/').reverse()[0];
        let target = target_arn.split('/').reverse()[1];

        console.log(`... updating conditions on listener '${rule}' to use HostCondition '${host}' and point to target ${target}`);

        await this.elbClient.send(new elb.ModifyRuleCommand({
            RuleArn: rule_arn,
            Conditions: [{
                Field: 'host-header',
                HostHeaderConfig: {
                    Values: [host]
                }
            }],
            Actions: [{
                Type: elb.ActionTypeEnum.FORWARD,
                TargetGroupArn: target_arn
            }]
        }));
    }
}