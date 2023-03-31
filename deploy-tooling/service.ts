import * as ecs from '@aws-sdk/client-ecs';

export class ServiceInstance {

    public version?: string;
    public url?: string;
    
    // ALB Properties
    public alb_arn?: string;
    public rule_arn?: string;
    public target_arn?: string;

    // ECS Properties
    public cluster_arn?: string;
    public service_arn?: string;
    public task_arn?: string;
    public task?: ecs.TaskDefinition;
    public deploy_status: string;
    public rollout_status: string;

    public getData() {
        return {
            url: this.url,
            version: this.version,
            instance: this.service_arn.split('/').reverse()[0],
            revision: this.task_arn.split(':').reverse()[0]
        };
    }
}

export class Service {
    public production: ServiceInstance;
    public staging: ServiceInstance;
}