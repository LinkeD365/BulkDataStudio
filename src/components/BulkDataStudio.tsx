import { observer } from "mobx-react";
import { dvService } from "../utils/dataverseService";
import { ViewModel } from "../model/ViewModel";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Toolbar,
  ToolbarGroup,
} from "@fluentui/react-components";
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
  const toolbar = (
    <div>
      <Toolbar>
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
            <DataUpdate connection={connection} dvSvc={dvSvc} vm={vm} utils={utils} onLog={onLog} />
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
});
