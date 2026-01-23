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
import { AddSquareFilled, ArrowClockwiseFilled, HandPointFilled } from "@fluentui/react-icons";
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
