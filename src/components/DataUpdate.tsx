import React from "react";
import { observer } from "mobx-react";

import { TabList, Tab, SelectTabData, SelectTabEvent, TabValue, Button } from "@fluentui/react-components";
import { AddSquareFilled } from "@fluentui/react-icons";

import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverseService";
import { UpdateList } from "./UpdateList";
import { UpdateAddField } from "./UpdateAddField";
interface DataUpdateProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const DataUpdate = observer((props: DataUpdateProps): React.JSX.Element => {
  const { connection, dvSvc, vm, onLog } = props;
  const [selectedValue, setSelectedValue] = React.useState<TabValue>("update");
  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };
  return (
    <div>
      <TabList selectedValue={selectedValue} onTabSelect={onTabSelect} size="small">
        <Tab id="update" value="update">
          Update
        </Tab>
        <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
          <div style={{ marginLeft: "auto", padding: "0 10px" }}>
            <Button
              icon={<AddSquareFilled />}
              onClick={() => (vm.updateFieldAddOpen = true)}
              disabled={!vm.selectedTable}
            />
          </div>
        </div>
      </TabList>
      {selectedValue === "update" && <UpdateList connection={connection} dvSvc={dvSvc} vm={vm} onLog={onLog} />}
      {vm.updateFieldAddOpen && <UpdateAddField connection={connection} dvSvc={dvSvc} vm={vm} onLog={onLog} />}
    </div>
  );
});
