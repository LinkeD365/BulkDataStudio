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
} from "@fluentui/react-icons";
import React from "react";
import { ViewSelector } from "./ViewSelector";
import { DataGrid } from "./DataGrid";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { DataUpdate } from "./DataUpdate";
import { utilService } from "../utils/utils";

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
    

    try {
      const config = {
        table: {
          logicalName: vm.selectedTable.logicalName,
        },
        updateColumns: vm.updateCols.map((col) => ({
          columnName: col.column.logicalName,
          columnDisplayName: col.column.displayName,
          columnType: col.column.type,
          setStatus: col.setStatus,
          onlyDifferent: col.onlyDifferent,
          newValue: col.newValue,
          selectedSelections: col.selectedSelections,
        })),
      };
      console.log("Saving configuration:", config);

      await window.toolboxAPI.fileSystem
        .saveFile(`${vm.selectedTable.logicalName}-BulkConfig.json`, JSON.stringify(config, null, 2))
        .then(() => {
          onLog("Configuration saved successfully", "success");
          window.toolboxAPI.utils.showNotification({
            title: "Configuration Saved",
            body: "Configuration has been saved successfully.",
            type: "success",
          });
        })
        .catch((error) => {
          onLog(`Error saving configuration: ${error}`, "error");
          window.toolboxAPI.utils.showNotification({
            title: "Error Saving Configuration",
            body: `An error occurred while saving the configuration: ${error}`,
            type: "error",
          });
        });
    } catch (error) {
      onLog(`Error saving configuration: ${error}`, "error");
    }
  }

  const toolbar = (
    <div>
      <Toolbar style={{ justifyContent: "space-between" }}>
        <ToolbarGroup>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton>Fetch Data</MenuButton>
            </MenuTrigger>

            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => (vm.viewSelectorOpen = true)}>Open View</MenuItem>
                <MenuItem>Edit FetchXML (coming)</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </ToolbarGroup>
        <ToolbarGroup>
          <Tooltip content="Touch Records Only" relationship="label">
            <Button
              icon={<HandPointFilled />}
              onClick={() => {
                vm.touchDialogOpen = true;
              }}
              disabled={vm.updateCols.length !== 0 || vm.selectedRows.length === 0}
            />
          </Tooltip>
          <Tooltip content="Update Data" relationship="label">
            <Button
              icon={<ArrowClockwiseFilled />}
              onClick={updateData}
              disabled={vm.updateCols.length === 0 || vm.selectedRows.length === 0}
            />
          </Tooltip>
          <Tooltip content="Managed Fields to Update" relationship="label">
            <Button
              icon={<AddSquareFilled />}
              onClick={() => {
                vm.updateFieldAddOpen = true;
              }}
              disabled={!vm.selectedTable}
            />
          </Tooltip>
          <Tooltip content="Save Configuration" relationship="label">
            <Button icon={<SaveFilled />} onClick={saveConfiguration} disabled={!vm.selectedTable} />
          </Tooltip>
          <Tooltip content="Delete Records" relationship="label">
            <Button
              icon={<DeleteFilled />}
              onClick={() => {
                vm.deleteDialogOpen = !vm.deleteDialogOpen;
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
      <div style={{ height: "90vh" }}>
        <Allotment defaultSizes={[100, 200]}>
          <Allotment.Pane minSize={200}>
            <div>
              <DataGrid connection={connection} vm={vm} utils={utils} />
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
