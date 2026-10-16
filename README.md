# Bulk Data Studio

Bulk Data Studio is an independent Power Platform ToolBox implementation inspired by Jonas Rapp's
[Bulk Data Updater](https://jonasr.app/bdu/) for XrmToolBox. It reproduces the familiar bulk-update
workflow without adapting or translating the original source code.

![Main Screenshot](https://github.com/LinkeD365/BulkDataStudio/blob/main/public/mainscreenshot.png?raw=true)

This tool allows users to perform bulk data operations efficiently within Microsoft Dataverse environments.

> [!NOTE]
> AI-assisted development tools were used during implementation and documentation. The maintainer
> reviewed and tested the resulting changes and remains responsible for the tool's behavior,
> security, accuracy, maintenance, and destructive data operations.

## Features

- ✅ Find records to update via view
- ✅ Select one or more fields to update to static values
- ✅ Touch Records to trigger workflows
- ✅ Includes Status and Ownership updates
- ✅ Bulk delete selected records
- ✅ Save/Load Job
- ✅ Allow Edit of FetchXml
- ✅ Accept FetchXML from other Power Platform ToolBox tools
- ✅ Touch per field
- ✅ Some XrmTokens for calculated fields
- 📘 Calculated fields reference: [All calculated field options](CALCULATED_COLUMNS.md)
- ✅ Clone record with child tables

## How this tool differs

Bulk Data Studio is built specifically for Power Platform ToolBox and its Dataverse and invocation
APIs. In addition to bulk updates and record touching, it supports editing FetchXML, calculated
field expressions, multi-select choices, cloning selected records with configured child-table
hierarchies, saving and loading update or clone jobs, and receiving FetchXML when launched by
another PPTB tool.

## What this tool changes

Bulk Data Studio can make the following changes after explicit user confirmation:

- Update selected Dataverse records with fixed, null, calculated, status, ownership, lookup, and
  other supported field values.
- Touch selected records by writing their existing values. This can trigger Dataverse plug-ins,
  Power Automate flows, auditing, and business rules.
- Permanently delete selected Dataverse records.
- Create cloned parent records and, when configured, related child records. Creation can trigger
  plug-ins, flows, duplicate-detection rules, and other server-side automation.
- Save update-job and clone-job configuration files to a location explicitly selected by the user.

Bulk Data Studio never performs a Dataverse write on load. Before each write it verifies that the
active connection is the same connection on which the operation was prepared and that selected
records still exist. Changing connections clears loaded records and pending operations.

Bulk Data Studio does not automatically create a rollback package. Export or back up important
records before updating, touching, deleting, or cloning them. Deletions are permanent, and updates
or creates may not be recoverable through this tool. Operations are processed with limited
concurrency and can be cancelled between batches; batches already completed or in progress may
still take effect.

Production environments are identified prominently in confirmation dialogs. Every confirmation
shows the environment name, classification, URL, table, record count, operation, and recovery
warning.

## Installation
- Download and install from PPTB Marketplace
- Select tool from installed tools and choose appropriate dataverse connection.

Developer and maintainer documentation is available in
[IMPLEMENTATION.md](IMPLEMENTATION.md).

## Usage
- Select Fetch Data, this will display a list of tables in your environment.
- Choose a view to use. You can also use any FetchXML to return data
- Select Add Config to choose a column to update.
- Actions to take on each column are defined by column type.
- Select one or more rows in the datagrid and then select update rows. This will take the actions you suggested on all the rows.

## Privacy and network use

Dataverse data is sent only through the Power Platform ToolBox Dataverse API to the selected
environment. Bulk Data Studio does not send environment data, record data, or usage telemetry to
publisher-controlled services. Saved job files remain in the location selected by the user.

## Credits

Bulk Data Studio is an independent reimplementation inspired by
[Bulk Data Updater](https://github.com/rappen/BulkDataUpdater), created by
[Jonas Rapp](https://github.com/rappen). The original Bulk Data Updater is licensed under
[GPL-3.0](https://github.com/rappen/BulkDataUpdater/blob/master/LICENSE). Jonas Rapp has consented
to being listed as a contributor to this project.

## Updates

16/10/26
- Added environment, URL, table, record-count, production, automation, and rollback warnings to all destructive-operation confirmations.
- Added active-connection locking and fresh selected-record validation before Dataverse writes.
- Clear loaded data and pending operations when the active connection changes.
- Isolated each connection in a fresh view model and remounted connection-specific UI to prevent stale asynchronous results.
- Closed cancellation and connection-change race windows immediately before clone record creation.
- Added bounded batch concurrency and cancellation between update, touch, delete, and clone batches.
- Removed Dataverse record payloads from diagnostic logging.
- Added marketplace documentation for tool differences, data changes, privacy, attribution, and recovery limitations.
- Added an AI-assistance disclosure confirming human review and accountability.
- Added maintainer implementation documentation and included linked documentation in the npm package.
- Included the PPTB invocation manifest in the npm package so installed tools retain FetchXML launch support.
- Updated the PPTB API type definitions and validation tooling to version 1.2.7.
- Replaced the publisher-branded marketplace icon with a tool-oriented, theme-aware bulk-data icon.

08/10/26
- Reordered controls in the update rows (#51)
- Data grid cell values no longer wrap (#50)
- Added horizontal scrolling to data grids (#54)
- Vertically aligned controls in the Fields to update list (#53)
- Selected view and FetchXML are cleared when changing table (#55)
- Field definitions are cleared when changing the data query (#52)
- Table selection is kept when reopening the load view dialog (#49)
- Refactored data grid, FetchXML editor, update list and view selector components

22/06/26
- Added clone record with child tables functionality
- Added option to be called from other tools that provide fetchxml
- Added support for multi choice lists.

30/03/26
- Fixed [#33 Does not load active stage](https://github.com/LinkeD365/BulkDataStudio/issues/33)

19/02/26

- Added [#17 Calculated field support](https://github.com/LinkeD365/BulkDataStudio/issues/17)

13/02/26

- Added [#14 FetchXml Edit Support](https://github.com/LinkeD365/BulkDataStudio/issues/14)

25-Jan-26

- Fixed bug with logging
- [#20](https://github.com/LinkeD365/BulkDataStudio/issues/20) Thanks @Ghitafjorback

23-Jan-26

- Added bulk delete & save config functionality

19-Jan-26

- Added Status and Ownership updates and fixed bugs around view selection

## Releases and branch protection

Releases use the same release-please and npm trusted-publishing tooling as
[PPTB-EnvManager](https://github.com/LinkeD365/PPTB-EnvManager). Version changes
are reviewed in a pull request; automation no longer pushes version bumps
directly to `main`.

### One-time administrator setup

These settings must be applied in GitHub and npm; committing the workflows does
not enable branch protection.

1. In GitHub **Settings → Actions → General**, enable **Allow GitHub Actions to
   create and approve pull requests**. The release workflow grants its release
   job the write permissions needed to create PRs and releases.
2. In **Settings → Environments**, create the `npm` environment and allow the
   `main` branch to deploy. Deployment rules use the workflow's branch (`main`),
   not the release tag checked out by the publishing job. Optionally require an
   approval before publishing.
3. In the npm settings for `@linked365/pptb-bulk-data-studio`, configure a
   **GitHub Actions trusted publisher** with owner `LinkeD365`, repository
   `BulkDataStudio`, workflow filename `release.yml`, and environment `npm`.
   Publishing uses OIDC and provenance, not an npm token.
4. After CI has run once, create an active branch ruleset in **Settings → Rules
   → Rulesets** targeting `main`:
   - Require a pull request before merging and at least one approving review.
   - Dismiss stale approvals when new commits are pushed.
   - Require the **Build** status check from GitHub Actions and require branches
     to be up to date before merging.
   - Require conversation resolution, block force pushes, and restrict deletions.
   - Do not give the release bot a bypass: release PRs follow the same rules.
   - For a solo-maintained repository, use zero required approvals if there is
     no other reviewer; authors cannot approve their own PRs.

CI runs for every PR to `main`, including documentation and release PRs, so the
required check is never skipped by path filters. The publishing job builds the
release tag again before publishing.

### Release process

- Use Conventional Commit titles when squash-merging PRs: `fix:` produces a
  patch release, `feat:` a minor release, and `feat!:` or a `BREAKING CHANGE:`
  footer a major release. Ensure the final squash commit retains that title.
- After a qualifying commit reaches `main`, release-please opens or updates a
  release PR containing `package.json`, `npm-shrinkwrap.json`, the release
  manifest, and a generated `CHANGELOG.md`. The initial baseline is `1.0.1`.
- PRs created or updated with `GITHUB_TOKEN` do not automatically trigger other
  Actions workflows. Close and reopen the release PR as a maintainer to trigger
  CI after each bot update, or manually run **CI** with the release PR's branch
  selected. Do not merge until **Build** passes.
- Review and merge the release PR. The subsequent `main` push creates the GitHub
  release and version tag, then publishes that tagged build to npm.
- The **Release** workflow can also be run manually on `main` to reconcile
  release PRs. It publishes only when release-please reports a newly created
  release; it does not republish an existing version.

## License

MIT
