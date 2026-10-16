# Bulk Data Studio implementation

[Back to the user guide](./README.md)

## Overview

Bulk Data Studio is a React and TypeScript tool hosted by Power Platform ToolBox (PPTB). It uses
Fluent UI for application controls, AG Grid for record selection, MobX for observable state, and
the PPTB host APIs for connections, Dataverse access, notifications, file access, theme changes,
and inter-tool invocation.

The application is built as a single IIFE bundle because PPTB loads tools in an isolated Electron
view rather than as a conventional web application.

## Project structure

```text
src/
  App.tsx                         Composition root, theme, connection lifecycle, invocation
  components/
    BulkDataStudio.tsx            Main layout and toolbar
    DataGrid.tsx                  Record grid and row selection
    DataUpdate.tsx                Update configuration and operation dialogs
    UpdateDialog.tsx              Update, touch, and delete confirmations
    ClonePanel.tsx                Parent and child-record clone configuration
    ViewSelector.tsx              Table and Dataverse view selection
    FetchXmlEditorDialog.tsx      Custom FetchXML editing
    CalculatedValueEditor.tsx     Calculated-value editor and preview
  hooks/
    useToolboxAPI.ts              Active connection, PPTB events, and bounded log state
  model/
    vm.tsx                        Observable application and metadata state
    UpdateColumn.tsx              Per-column update configuration and Dataverse values
  utils/
    dataverseService.tsx          Dataverse queries, metadata, writes, and safety controls
    expressionEvaluator.ts        Token-based calculated-value evaluation
    utils.tsx                     Data loading and metadata helpers
```

## Composition and state

`App.tsx` obtains the active PPTB connection and theme and creates a connection-scoped
`ViewModel`, Dataverse service, and utility service. The main tool component is keyed by connection
ID so drawers, dialogs, and component-local selections are remounted with each environment.

The `ViewModel` owns:

- table, field, view, and loaded-record state;
- selected records;
- update-column configuration;
- dialog and panel visibility;
- FetchXML state;
- clone exclusions and child relationship configuration.

When the active connection changes, React synchronously creates a fresh model and remounts the
connection-dependent UI. Requests started for the previous environment retain only the discarded
old model, so late responses cannot repopulate the current environment's state. Services are
reconstructed with the new connection.

## PPTB and Dataverse APIs

The tool uses these PPTB surfaces:

| API | Use |
| --- | --- |
| `toolboxAPI.connections.getActiveConnection()` | Load and verify the active connection |
| `toolboxAPI.events.on()` | Respond to connection and theme events |
| `toolboxAPI.utils.getCurrentTheme()` | Apply the PPTB light or dark theme |
| `toolboxAPI.utils.showNotification()` | Surface success, warning, and failure states |
| `toolboxAPI.fileSystem.selectPath()` | Select saved update or clone configuration files |
| `toolboxAPI.fileSystem.readText()` | Read selected configuration files |
| `toolboxAPI.fileSystem.saveFile()` | Save update or clone configurations |
| `toolboxAPI.invocation.getLaunchContext()` | Accept FetchXML from another PPTB tool |
| `toolboxAPI.invocation.returnData()` | Return invocation failures to the caller |

The Dataverse service uses:

- `getAllEntitiesMetadata()` and `getEntityRelatedMetadata()` for tables and relationships;
- `queryData()` for attribute, alternate-key, choice, lookup, and limit metadata;
- `fetchXmlQuery()` for views, selected records, calculated inputs, and clone source data;
- `updateMultiple()` for update and touch batches;
- `create()` for parent and child clones;
- `delete()` for selected records.

The tool does not request access tokens or call Dataverse with a separate HTTP client.

## Read and write flows

### Loading records

1. The user selects a Dataverse table and view or supplies FetchXML.
2. Metadata and view information are loaded through `dataverseAPI`.
3. Records are returned to the view model and displayed in AG Grid.
4. Grid selection is converted to record IDs and labels in `selectedRows`.

### Updating records

1. The user configures one or more fields as fixed, calculated, touched, or null.
2. The confirmation dialog identifies the environment, URL, table, record count, and recovery
   limitations.
3. Selected records and the active connection are revalidated.
4. Calculated and conditional values are prepared.
5. Selected records are revalidated immediately before the write phase.
6. `updateMultiple()` applies batches of two records with at most four concurrent workers.

### Touching and deleting records

Touch operations read the current primary-name value and write it back with `updateMultiple()`.
Delete operations call `delete()` for each selected ID. Both operations revalidate the connection
and selected records and use the same bounded worker pool.

### Cloning records

Parent records are read in batches and recreated with `create()`. Optional child configurations
describe the relationship field, excluded fields, and nested child configurations. Alternate-key
and primary-ID fields are excluded from clone payloads. Newly created IDs are mapped to their
source IDs so cloned children can bind to the correct new parent.

## Destructive-operation safety

All Dataverse writes require explicit user action and confirmation.

Before and during a write operation:

- the current connection ID must match the connection used to prepare the operation;
- selected records must still exist and be accessible;
- production-classified connections receive an additional warning;
- confirmations state that no automatic rollback is created;
- plug-in, Power Automate, auditing, and business-rule effects are disclosed;
- no more than four batches run concurrently;
- cancellation prevents additional batches from starting;
- cancellation messages explain that completed or in-flight requests may still take effect;
- errors are logged and shown through PPTB notifications.

The service repeats the connection check before each batch and before individual clone or delete
writes. Changing the connection clears pending state in the view model.

## Calculated values

`ExpressionEvaluator` implements a token-based expression language without `eval` or dynamic code
execution. It supports:

- record-column tokens;
- conditional expressions;
- date and time system tokens;
- numeric operations;
- string formatting and replacement.

Fields referenced by an expression are fetched before evaluation. Results are attached to the
corresponding selected record and added to its update payload.

See [Calculated columns](./CALCULATED_COLUMNS.md) for the user-facing syntax.

## Configuration files

Update and clone configurations are JSON files selected explicitly by the user. The loaders
validate the top-level structure, table name, and configuration arrays before applying values to
the view model. Configuration files contain table and operation settings, not credentials or
Dataverse access tokens.

## Privacy and network behavior

Record and metadata traffic goes through the PPTB Dataverse API to the selected environment. The
tool has no external HTTP client, telemetry endpoint, analytics service, or CSP exception.

Application logs contain operation names, counts, metadata names, and errors. Dataverse record
payloads are not serialized into logs.

## Build output

`vite.config.ts` configures:

- `base: "./"` for local package loading;
- an IIFE output format;
- one inlined JavaScript bundle;
- a post-processing plugin that removes module-only script attributes and moves scripts to the end
  of the document body.

These settings are required for the PPTB Electron loading model.

## Build and validation

Install dependencies and create the production bundle:

```powershell
npm install
npm run build
```

Validate the PPTB manifests:

```powershell
npm run validate
```

Check dependency vulnerabilities and package contents:

```powershell
npm audit --audit-level=high
npm pack --dry-run
```

## Testing

The repository does not currently contain an automated test suite.

Manual acceptance testing must be performed inside PPTB rather than a standalone browser. Load the
project root as a local tool and test:

- light and dark themes;
- update, touch, delete, parent clone, and child clone operations;
- production and non-production connection confirmations;
- switching connections before and during an operation;
- cancellation after one or more batches;
- missing permissions, expired authentication, and inaccessible records;
- empty results and realistic data volumes;
- saved update and clone configuration round trips;
- launch context containing valid and invalid FetchXML.

Recommended future automated coverage includes expression evaluation, connection-change state
reset, selected-record revalidation, bounded concurrency, cancellation, and partial failures.

## Publishing

Before publishing:

1. Run the build, validation, audit, and package dry-run commands above.
2. Complete real-environment acceptance testing in PPTB.
3. Review the generated package contents.
4. Run `npm run finalize-package` when dependency versions are ready to be locked.
5. Publish the scoped package with `npm publish --access public`.

Publishing and marketplace submission should always be initiated and reviewed by a human
maintainer.
