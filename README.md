# Quartex Workflows

## Overview

This repository contains workflows used by the software team behind the [Quartex](https://www.quartexcollections.com/) platform, and form part of our CI/CD pipeline. This repository is public (as it is the only way Workflows can be be shared between repositories), although most of our other repositories are not.

## Built with

- [GitHub Actions](https://docs.github.com/en/actions)
- [bash](https://www.gnu.org/software/bash/)

# Usage

Note that our secrets are defined at organisation level. So whilst shouldn't need defining within the repository, they do need to be explicitly passed in to the called workflow.

* [Shared .NET workflows](./DOTNET.md)
* [Generic Docker build and push to ECR](./OTHER.md#build-a-docker-application-and-push-to-ecr)
* [Publish an AWS Lambda using Serverless](./OTHER.md#deploy-a-nodejs-lambda-function-using-docker--serverless)
* [Run NodeJS unit tests](./OTHER.md#run-unit-tests-for-a-nodejs-application)

# Contributing

See further details on [contributing](./CONTRIBUTING.md)
