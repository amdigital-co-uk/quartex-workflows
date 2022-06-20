# Shared NodeJS and TypeScript related workflows

## Build a Docker application and push to ECR

This is very similar to the [equivalent .NET workflow](./DOTNET.md#package-net-core-application-as-docker-image-and-push-to-aws-ecr) but wihtout the additional templated parameters that make our .NET applications able to use identical `Dockerfile`s.

This currently assumes a branching strategy of `stage/{name}` >> tagname `{name}`, with anything else mapping to the default `DK_TAG` input.

```yml
jobs:
  build:
    if: ${{ github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch' }}
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/docker.yml@v8
    with:
      REF: ${{ github.ref }}
      DK_NAMESPACE: samples
      DK_IMAGE: sample-docker-image
      DK_TAG: live # default tag to use when there
      WORKDIR: api # working directory (if not the root of the repo), which should contain the Dockerfile
      BUILD_NPMRC: true
      ECR_REGION_1: us-east-1
      ECR_REGION_2: us-east-2
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
      AWS_ROLE_ARN: ${{ secrets.PIPELINE_ADMIN_ARN }}
```

## Deploy a NodeJS Lambda function using Docker & Serverless

```yml
jobs:
  build:
    if: ${{ github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch' }}
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/node-lambda.yml@v4
    with:
      REF: ${{ github.ref }}
      DK_NAMESPACE: qtfn
      DK_IMAGE: sample-docker-image
      STAGE: live
      ECR_REGION_1: us-east-1
      ECR_REGION_2: us-east-2
    secrets:
      AWS_ROLE_ARN: ${{ secrets.PIPELINE_ADMIN_ARN }}
```

## Run unit tests for a NodeJS application

```yml
jobs:
  mocha:
    if: ${{ github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch' }}
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/node-tests.yml@v8
    with:
      COVERAGE_S3_PATH: s3://my-s3-bucket/code-coverage-reporting/my-repo.csv # this path should be a unique CSV file for each repo
      DEBUG: TRUE
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
      AWS_ROLE_ARN: ${{ secrets.PIPELINE_TESTS_ARN }}
```