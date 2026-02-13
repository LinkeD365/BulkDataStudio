import { observer } from "mobx-react";
import { dvService } from "../utils/dataverseService";
import { ViewModel } from "../model/vm";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Toolbar,
  ToolbarGroup,
  Button,
  Tooltip,
} from "@fluentui/react-components";
import {
  AddSquareFilled,
  ArrowClockwiseFilled,
  HandPointFilled,
  DeleteFilled,
  SaveFilled,
  FolderOpenFilled,
} from "@fluentui/react-icons";
import React from "react";
import { ViewSelector } from "./ViewSelector";
import { DataGrid } from "./DataGrid";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { DataUpdate } from "./DataUpdate";
import { utilService } from "../utils/utils";
import { UpdateColumn } from "../model/UpdateColumn";
import { FetchXmlEditorDialog } from "./FetchXmlEditorDialog";

interface BulkDataStudioProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  utils: utilService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const BulkDataStudio = observer((props: BulkDataStudioProps): React.JSX.Element => {
  const { connection, dvSvc, vm, utils, onLog } = props;

  function updateData(): void {
    if (vm.updateCols.length === 0) {
      window.toolboxAPI.utils.showNotification({
        title: "Incomplete Field Values",
        body: "No fields have been added to update. Please add fields before updating data.",
        type: "warning",
      });
      return;
    }

    if (vm.updateCols.some((field) => field.isValid === false)) {
      window.toolboxAPI.utils.showNotification({
        title: "Incomplete Field Values",
        body: "Please provide values for all fields set to 'Fixed' before updating data.",
        type: "warning",
      });
      return;
    }
    vm.updateDialogOpen = true;
  }

  async function saveConfiguration(): Promise<void> {
    if (!vm.selectedTable) {
      window.toolboxAPI.utils.showNotification({
        title: "No Table Selected",
        body: "Please select a table before saving the configuration.",
        type: "warning",
      });
      return;
    }

    const config = {
      table: {
        logicalName: vm.selectedTable.logicalName,
      },
      updateColumns: vm.updateCols.map((col) => ({
        columnName: col.column.logicalName,
        setStatus: col.setStatus,
        onlyDifferent: col.onlyDifferent,
        newValue: col.newValue,
        selectedSelections: col.selectedSelections,
      })),
    };
    onLog("Saving configuration...", "info");

    try {
      await window.toolboxAPI.fileSystem.saveFile(
        `${vm.selectedTable.logicalName}-BulkConfig.json`,
        JSON.stringify(config, null, 2),
      );

      onLog("Configuration saved successfully", "success");
      window.toolboxAPI.utils.showNotification({
        title: "Configuration Saved",
        body: "Configuration has been saved successfully.",
        type: "success",
      });
    } catch (error) {
      onLog(`Error saving configuration: ${error}`, "error");
      window.toolboxAPI.utils.showNotification({
        title: "Error Saving Configuration",
        body: `An error occurred while saving the configuration: ${error}`,
        type: "error",
      });
    }
  }

  async function loadConfiguration(): Promise<void> {
    try {
      const filePath = await window.toolboxAPI.fileSystem.selectPath({
        type: "file",
        title: "Select Configuration File",
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (filePath) {
        onLog(`Selected configuration file: ${filePath}`, "info");
        // Read the selected file
        const content = await window.toolboxAPI.fileSystem.readText(filePath);
        onLog("Reading configuration file...", "info");

        const config = JSON.parse(content);

        // Validate the configuration structure
        if (!config || typeof config !== "object") {
          throw new Error("Invalid configuration: Configuration must be an object");
        }
        if (!config.table || typeof config.table !== "object") {
          throw new Error("Invalid configuration: Missing or invalid 'table' property");
        }
        if (!config.table.logicalName || typeof config.table.logicalName !== "string") {
          throw new Error("Invalid configuration: Missing or invalid 'table.logicalName' property");
        }
        if (!config.updateColumns || !Array.isArray(config.updateColumns)) {
          throw new Error("Invalid configuration: Missing or invalid 'updateColumns' array");
        }

        onLog("Configuration structure validated", "info");

        // Find the table by logical name
        if (vm.tables.length === 0) {
          await dvSvc
            .getTables()
            .then((tables) => {
              vm.tables = tables;
            })
            .catch((error) => {
              onLog(`Error loading tables: ${error}`, "error");
              throw error;
            });
        }
        const table = vm.tables.find((t) => t.logicalName === config.table.logicalName);
        if (!table) {
          window.toolboxAPI.utils.showNotification({
            title: "Table Not Found",
            body: `The table "${config.table.logicalName}" was not found. Please ensure the table exists in your environment.`,
            type: "error",
          });
          return;
        }

        vm.selectedTable = table;
        if (!vm.selectedTable.fields || vm.selectedTable.fields.length === 0)
          await dvSvc
            .getFields(vm.selectedTable.logicalName)
            .then((fields) => (vm.selectedTable!.fields = fields))
            .catch((error) => {
              throw error;
            });

        const updateCols: UpdateColumn[] = [];
        // Recreate update columns from config
        for (const colConfig of config.updateColumns) {
          if (!colConfig.columnName || typeof colConfig.columnName !== "string") {
            onLog(`Skipping invalid column configuration: missing or invalid columnName`, "warning");
            continue;
          }

          const column = table.fields.find((f) => f.logicalName === colConfig.columnName);
          if (column) {
            const updateCol = new UpdateColumn(column);
            updateCol.setStatus = colConfig.setStatus || "Fixed";
            updateCol.onlyDifferent = colConfig.onlyDifferent || false;
            updateCol.newValue = colConfig.newValue;
            updateCol.selectedSelections = colConfig.selectedSelections;

            // Load metadata for lookup and choice fields
            if (column.type === "Lookup" && !column.lookupTargetTable) {
              try {
                const lookupTable = await dvSvc.getLookupTargetTable(vm.selectedTable.logicalName, column.logicalName);
                column.lookupTargetTable = vm.tables.find((t) => t.logicalName === lookupTable);

                if (column.lookupTargetTable && !column.lookupTargetTable.views) {
                  const views = await dvSvc.getViews(column.lookupTargetTable);
                  column.lookupTargetTable.views = views;
                }
                if (column.lookupTargetTable && !column.lookupTargetTable.fields) {
                  const fields = await dvSvc.getFields(column.lookupTargetTable.logicalName);
                  column.lookupTargetTable.fields = fields;
                }
              } catch (error) {
                onLog(`Error loading lookup metadata for field ${column.logicalName}: ${error}`, "warning");
              }
            } else if (
              (column.type === "Picklist" || column.type === "State" || column.type === "Status") &&
              (!column.choiceValues || column.choiceValues.length === 0)
            ) {
              try {
                const values = await dvSvc.getChoiceValues(vm.selectedTable.logicalName, column);
                column.choiceValues = values;
              } catch (error) {
                onLog(`Error loading choice values for field ${column.logicalName}: ${error}`, "warning");
              }
            }

            updateCols.push(updateCol);
          } else {
            onLog(`Field "${colConfig.columnName}" not found in table "${table.logicalName}"`, "warning");
          }
        }

        vm.updateCols = updateCols;
        onLog(`Configuration loaded successfully with ${updateCols.length} fields`, "success");
        window.toolboxAPI.utils.showNotification({
          title: "Configuration Loaded",
          body: "Configuration has been loaded successfully.",
          type: "success",
        });
      }
    } catch (error) {
      onLog(`Error loading configuration: ${error}`, "error");
      window.toolboxAPI.utils.showNotification({
        title: "Error Loading Configuration",
        body: `An error occurred while loading the configuration: ${error}`,
        type: "error",
      });
    }
  }

  const toolbar = (
    <div>
      <Toolbar style={{ justifyContent: "space-between" }}>
        <ToolbarGroup>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton disabled={vm.isDataLoading}>Fetch Data</MenuButton>
            </MenuTrigger>

            <MenuPopover>
              <MenuList>
                <MenuItem
                  onClick={() => {
                    vm.viewSelectorOpen = true;
                    vm.fetchXml = "";
                  }}
                >
                  Open View
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    vm.fetchXmlEditorOpen = true;
                    vm.selectedView = undefined;
                  }}
                >
                  Edit FetchXML
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Tooltip content="Open Configuration" relationship="label">
            <Button icon={<FolderOpenFilled />} onClick={loadConfiguration} disabled={!vm.selectedView}>
              Open Job
            </Button>
          </Tooltip>
          <Tooltip content="Save Configuration" relationship="label">
            <Button
              icon={<SaveFilled />}
              onClick={saveConfiguration}
              disabled={!vm.updateCols || vm.updateCols.length === 0}
            >
              Save Job
            </Button>
          </Tooltip>
        </ToolbarGroup>
        <ToolbarGroup>
          <Tooltip content="Managed Fields to Update" relationship="label">
            <Button
              icon={<AddSquareFilled />}
              onClick={() => {
                vm.updateFieldAddOpen = true;
              }}
              disabled={!vm.selectedTable}
            >
              Add Config
            </Button>
          </Tooltip>
          <Tooltip content="Update Selected rows with configured values" relationship="label">
            <Button
              icon={<ArrowClockwiseFilled />}
              onClick={updateData}
              disabled={vm.updateCols.length === 0 || vm.selectedRows.length === 0}
            >
              Update Rows
            </Button>
          </Tooltip>

          <Tooltip content="Touch Records Only" relationship="label">
            <Button
              icon={<HandPointFilled />}
              onClick={() => {
                vm.touchDialogOpen = true;
              }}
              disabled={vm.updateCols.length !== 0 || vm.selectedRows.length === 0}
            />
          </Tooltip>

          <Tooltip content="Delete Records" relationship="label">
            <Button
              icon={<DeleteFilled />}
              onClick={() => {
                vm.deleteDialogOpen = true;
              }}
              disabled={vm.selectedRows.length === 0}
            />
          </Tooltip>
        </ToolbarGroup>
      </Toolbar>
    </div>
  );
  return (
    <div>
      {toolbar}
      {vm.viewSelectorOpen && <ViewSelector dvSvc={dvSvc} vm={vm} onLog={onLog} />}
      {vm.fetchXmlEditorOpen && <FetchXmlEditorDialog vm={vm} onLog={onLog} />}
      <div style={{ height: "94vh" }}>
        <Allotment defaultSizes={[100, 200]}>
          <Allotment.Pane minSize={200}>
            <div>
              <DataGrid connection={connection} vm={vm} utils={utils} onLog={onLog} />
            </div>
          </Allotment.Pane>
          <Allotment.Pane minSize={300}>
            <DataUpdate dvSvc={dvSvc} vm={vm} utils={utils} onLog={onLog} />
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
});
