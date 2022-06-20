# Shared .NET workflows

## Run .NET Core automated tests via XUnit

### Check branch coverage against Static Threshold

Default behaviour when setting `BRANCH_THRESHOLD` is to report test coverage and fail the workflow if it does not meet the threshold.

```yml
jobs:
  xunit:
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/xunit.yml@v1
    with:
      DOCKER_COMPOSE: Quartex.Sample.Service.IntegrationTests/docker-compose.yml
      BRANCH_THRESHOLD: 80
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
```

### Check branch coverage against historic data

Alternatively, when omitting `BRANCH_THRESHOLD` you can instead set the following parameters and secret values, to have the workflow check current test coverage against the last recorded test coverage for the same repository (test coverage values are stored in a CSV in S3 at the configured location). This is why we need to pass AWS authentication details to this workflow.

If coverage goes down, you see a failure; if it is maintained or improved, the new value will be persisted back to S3 as the new threshold for future runs.

```yml
jobs:
  xunit:
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/xunit.yml@v3
    with:
      DOCKER_COMPOSE: Quartex.Sample.Service.IntegrationTests/docker-compose.yml
      COVERAGE_S3_PATH: s3://my-s3-bucket/code-coverage-reporting/my-repo.csv # this path should be a unique CSV file for each repo
      AWS_REGION: us-west-2   # default is us-east-1
      NEVER_FAIL_AT: 99     # default is 95
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
      AWS_ROLE_ARN: ${{ secrets.PIPELINE_TESTS_ARN }}
```

## Create and push NuGet packages to private GitHub packages feed

```yml
jobs:
  nuget:
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/nuget.yml@v1
    with:
      PKG_SRC: https://nuget.pkg.github.com/amdigital-co-uk/index.json
      PROJECTS: "Quartex.Sample.Common Quartex.Sample.Interfaces"
      SKIP_DUPLICATE: false
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
```

## Package .NET Core application as Docker image and push to AWS ECR

Note this assumes our standard format of `Dockerfile`. This allows all our .NET applications to use an identical `Dockerfile` by passing through a number of parameters into the `docker build` command.

```yml
jobs:
  dotnet:
    if: ${{ github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch' }}
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/dotnet.yml@v3
    with:
      REF: ${{ github.ref }}
      PROJECT: Quartex.Sample.Service
      COMPONENT: sample-service
      DK_NAMESPACE: samples
      DK_IMAGE: sample-docker-image
      DK_TAG: latest
      ECR_REGION_1: us-east-1
      ECR_REGION_2: us-east-2
      CONFIGS: org/config-repo # Optional: specify a repo to checkout and retrieve JSON configs from
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
      SRC_TOKEN: ${{ github.token }} # Must be specified if CONFIGS is set; must be a token that has read access to the repo
      AWS_ROLE_ARN: ${{ secrets.PIPELINE_ECR_ARN }}
```