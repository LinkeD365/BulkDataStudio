import React from "react";
import { observer } from "mobx-react";

import { TabList, Tab, SelectTabData, SelectTabEvent, TabValue, Button, Tooltip } from "@fluentui/react-components";
import { AddSquareFilled, ArrowClockwiseFilled, HandPointFilled } from "@fluentui/react-icons";

import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverseService";
import { UpdateList } from "./UpdateList";
import { UpdateAddField } from "./UpdateAddField";
import { UpdateValue } from "./UpdateValue";
import { TouchDialog, UpdateDialog } from "./UpdateDialog";
import { utilService } from "../utils/utils";
interface DataUpdateProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  utils: utilService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const DataUpdate = observer((props: DataUpdateProps): React.JSX.Element => {
  const { connection, dvSvc, vm, utils, onLog } = props;
  const [selectedValue, setSelectedValue] = React.useState<TabValue>("update");
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState<boolean>(false);
  const [touchDialogOpen, setTouchDialogOpen] = React.useState<boolean>(false);
  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };

  function updateData(): void {
    if (vm.updateFields.length === 0) {
      window.toolboxAPI.utils.showNotification({
        title: "Incomplete Field Values",
        body: "No fields have been added to update. Please add fields before updating data.",
        type: "warning",
      });
      return;
    }
    
    if (vm.updateFields.some((field) => field.isValid === false)) {
      window.toolboxAPI.utils.showNotification({
        title: "Incomplete Field Values",
        body: "Please provide values for all fields set to 'Fixed' before updating data.",
        type: "warning",
      });
      return;
    }
    setUpdateDialogOpen(true);
  }

  return (
    <div>
      <TabList selectedValue={selectedValue} onTabSelect={onTabSelect} size="small">
        <Tab id="update" value="update">
          Update
        </Tab>
        {selectedValue === "update" && (
          <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
            <div style={{ marginLeft: "auto", padding: "0 10px" }}>
              <Tooltip content="Touch Records Only" relationship="label">
                <Button
                  icon={<HandPointFilled />}
                  onClick={() => {
                    setTouchDialogOpen(true);
                  }}
                  disabled={vm.updateFields.length !== 0 || vm.selectedRows.length === 0}
                />
              </Tooltip>
              <Tooltip content="Update Data" relationship="label">
                <Button
                  icon={<ArrowClockwiseFilled />}
                  onClick={updateData}
                  disabled={vm.updateFields.length === 0 || vm.selectedRows.length === 0}
                />
              </Tooltip>

              <Tooltip content="Managed Fields to Update" relationship="label">
                <Button
                  style={{ marginLeft: "2px" }}
                  icon={<AddSquareFilled />}
                  onClick={() => (vm.updateFieldAddOpen = true)}
                  disabled={!vm.selectedTable}
                />
              </Tooltip>
            </div>
          </div>
        )}
      </TabList>
      {selectedValue === "update" && <UpdateList connection={connection} dvSvc={dvSvc} vm={vm} onLog={onLog} />}
      {vm.updateFieldAddOpen && <UpdateAddField vm={vm} utils={utils} />}
      {updateDialogOpen && (
        <UpdateDialog
          connection={connection}
          dvSvc={dvSvc}
          vm={vm}
          utils={utils}
          onLog={onLog}
          updateOpen={updateDialogOpen}
          onDialogClose={() => setUpdateDialogOpen(false)}
        />
      )}
      {touchDialogOpen && (
        <TouchDialog
          connection={connection}
          dvSvc={dvSvc}
          vm={vm}
          utils={utils}
          onLog={onLog}
          updateOpen={touchDialogOpen}
          onDialogClose={() => setTouchDialogOpen(false)}
        />
      )}
    </div>
  );
});
