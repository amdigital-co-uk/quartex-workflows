# Quartex Workflows

This repository contains [GitHub Actions](https://docs.github.com/en/actions) workflows used by the software team behind the [Quartex](https://www.quartexcollections.com/) platform, and form part of our CI/CD pipeline. This repository is public (as it is the only way Workflows can be be shared between repositories), although most of our other repositories are not.

# Calling standard workflows for .NET code

Note that the secrets are defined at organisation level, so shouldn't need defining within the repository, but they do need to be passed in to the called workflow.

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

Alternatively, when omitting `BRANCH_THRESHOLD` you can instead set the following parameters and secret values, to have the workflow check current test coverage against the last recorded test coverage for the same repository (test coverage values are stored in a CSV in S3 at the configured location).

If coverage goes down, you see a failure; if it is maintained or improved, the new value will be persisted back to S3 as the new threshold for future runs.

```yml
jobs:
  xunit:
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/xunit.yml@v2
    with:
      DOCKER_COMPOSE: Quartex.Sample.Service.IntegrationTests/docker-compose.yml
      COVERAGE_S3_PATH: s3://my-s3-bucket/code-coverage-reporting/repos.csv
      AWS_REGION: us-west-2   # default is us-east-1
      NEVER_FAIL_AT: 99     # default is 95
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
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

Note this assumes our standard format of `Dockerfile`.

```yml
jobs:
  dotnet:
    if: ${{ github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch' }}
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/dotnet.yml@v1
    with:
      REF: ${{ github.ref }}
      PROJECT: Quartex.Sample.Service
      COMPONENT: sample-service
      DK_NAMESPACE: samples
      DK_IMAGE: sample-docker-image
      DK_TAG: latest
      ECR_REGION_1: us-east-1
      ECR_REGION_2: us-east-2
    secrets:
      PKG_TOKEN: ${{ secrets.PKG_TOKEN }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```
