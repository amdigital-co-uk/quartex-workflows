# Contributing

This repository does not use our standard branching practices; instead, tags and refs are more important, since that is how calling workflows will reference specific versions of the workflows in this repository.

The `main` branch is protected with a branch protection rule, so all work must be done in a temporary branch. Create a succinct branch name, as that will allow you to reference the WIP workflows via that git ref. E.g. if working on improvements to the performance of a workflow, you could create a branch called `vPerf`, and you would then be able to reference this WIP version of the workflow by branch name from another repo, e.g:

```yml
jobs:
  xunit:
    uses: amdigital-co-uk/quartex-workflows/.github/workflows/xunit.yml@vPerf
    # etc
```

You can then issue a PR to merge your temp branch into `main`.

# Tagging

Once a branch has been thoroughly tested from external repositories (using the `vNext` style branch name/refs as above), and merged into main, you should then create a new tag. All external workflows would then need to use this new tag to reference this newly created version of the workflow.

Tags should follow [SEMVER](https://semver.org/), except that trailing `.0`s can be ommitted (as this is cleaner). Typically, most version updates would be MAJOR version updates anyway, so in practice _most_ new tags will be a simple `v3` >> `v4` type update anyway.

## Create tag

> Note: You can find the current available tags [here](https://github.com/amdigital-co-uk/quartex-workflows/tags).

```sh
git tag v3
git push origin v3
```

## Remove tag

```sh
git tag --delete v2.1.0-alpha
git push --delete origin v2.1.0-alpha
```

# Future work & improvements

The lengthy bash script to perform historical code coverage checking needs to be refactored somehow, likely as a [re-usable composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action). Used by:

* `node-tests.yml`
* `xunit.yml`

Likewise, the (slightly shorter) bash script to parse current GitHub branch/ref/head and determine the current feature branch/tag name needs to be refactored. Ideally it would accept an input detailing which branching strategy is in-use (or a map of branch name formats to tag formats). Used by:

* `docker.yml`
* `dotnet.yml`
* `serverless.yml`