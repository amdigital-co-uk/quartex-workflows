
import { DeploymentService, DeploymentConfig } from './deployments';
import { Env } from "@humanwhocodes/env";

const env = new Env();
let config: DeploymentConfig = {
    service_name: env.require("AC_SERVICE_NAME"),
    listener_port: parseInt(env.require("AC_LISTENER_PORT")),
    region: env.require("AC_REGION"),
    cluster: env.require("AC_CLUSTER"),
    production_url: env.require("AC_PRODUCTION_URL"),
    staging_url: env.require("AC_STAGING_URL"),
    productionHealthCheckUrl: env.require("AC_PRODUCTION_HEALTH_CHECK_URL")

}

main(process.argv);


/*
    npm run deploy-stage service-A v1.1
    npm run swap service-A
    npm run ensure-stage service-A v1.1
*/

async function main(argv: string[]) {

    let service = new DeploymentService(config);

    let cmd = argv[2];

    if (cmd == 'status') {
        let s = await service.status();

        console.log(JSON.stringify({
            production: s.production.getData(),
            staging: s.staging.getData()
        }, null, 2));
    }
    else if (cmd == 'version-search') {
        let v = argv[3];

        let task = await service.getMatchingTaskDefs(v, 3);

        if (task) {
            console.log(`Version ${v} exists in ${task}`);
        }
        else {
            console.log(`Cannot find version ${v}`);
        }
    }
    else if (cmd == 'stage-ensure') {
        let s = await service.status();
        let v = argv[3];

        if (s.production.version != v) {
            console.error(`Error: ${v} is not deployed to production, ${s.production.version} is instead`);
            process.exit(1);
        }
        else if (s.staging.version == v) {
            console.error(`StagingIsCurrent: ${s.staging.version} already deployed to staging: nothing to update`);
            process.exit(1);
        }
        else {
            console.log(`StagingOutdated: updating staging from ${s.staging.version} to ${v}...`);
            await service.deploy(s.staging, v, false);
        }
    }
    else if (cmd == 'stage-deploy') {
        let s = await service.status();
        let v = argv[3];

        if (s.staging.version == v) {
            console.error(`StagingIsCurrent: ${s.staging.version} already deployed to staging: nothing to update`);
            process.exit(1);
        }
        else {
            console.log(`Deploy: updating staging from ${s.staging.version} to ${v}...`);
            await service.deploy(s.staging, v);
        }
    }
    else if (cmd == 'prod-deploy') {
        let s = await service.status();
        let v = argv[3];

        if (s.production.version == v) {
            console.error(`ProdIsCurrent: ${s.production.version} already deployed to production: nothing to update`);
            process.exit(1);
        }
        else {
            console.warn("WARNING: do not use this in a real pipeline!");
            console.log(`Deploy: updating production from ${s.production.version} to ${v}...`);
            await service.deploy(s.production, v);
        }
    }
    else if (cmd == 'swap') {
        let s = await service.status();

        if (s.staging.version == s.production.version) {
            console.error(`SwapIsNoop: production and staging are both on ${s.production.version}: blue/green swap will not change anything`);
            process.exit(1);
        }
        else {
            console.error(`Swap: swapping slots: production will now be on ${s.staging.version}, staging on ${s.production.version}`);
            await service.swap(s);
        }
    }
    else if (cmd == 'rollback') {

        let s = await service.status();
        let v = argv[3];

        if (v == s.production.version) {
            console.error(`Matched: production already on ${s.production.version}: nothing to update`);
            process.exit(1);
        }
        else if (s.staging.version == s.production.version) {
            console.error(`RollbackIsNoop: production and staging are both on ${s.production.version}: rollback will not change anything`);
            process.exit(1);
        }
        else if (s.staging.version != v) {
            console.error(`Error: staging is not on ${v}: cannot rollback to desired version`);
            process.exit(1);
        }
        else {
            console.log(`Rollback: swapping slots: production will now be on ${s.staging.version}, staging on ${s.production.version}`);
            await service.swap(s);
        }
    }

}

