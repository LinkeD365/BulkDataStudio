import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/vm";
import { dvService } from "../utils/dataverseService";
import { UpdateList } from "./UpdateList";
import { UpdateAddField } from "./UpdateAddField";
import { TouchDialog, UpdateDialog, DeleteDialog } from "./UpdateDialog";
import { utilService } from "../utils/utils";
interface DataUpdateProps {
  dvSvc: dvService;
  vm: ViewModel;
  utils: utilService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const DataUpdate = observer((props: DataUpdateProps): React.JSX.Element => {
  const { dvSvc, vm, utils, onLog } = props;

  return (
    <div>
      <UpdateList dvSvc={dvSvc} vm={vm} onLog={onLog} />
      {vm.updateFieldAddOpen && <UpdateAddField vm={vm} utils={utils} />}
      {vm.updateDialogOpen && (
        <UpdateDialog
          dvSvc={dvSvc}
          vm={vm}
          utils={utils}
          onLog={onLog}
          updateOpen={vm.updateDialogOpen}
          onDialogClose={() => (vm.updateDialogOpen = false)}
        />
      )}
      {vm.touchDialogOpen && (
        <TouchDialog
          dvSvc={dvSvc}
          vm={vm}
          utils={utils}
          onLog={onLog}
          updateOpen={vm.touchDialogOpen}
          onDialogClose={() => (vm.touchDialogOpen = false)}
        />
      )}
      {vm.deleteDialogOpen && (
        <DeleteDialog
          dvSvc={dvSvc}
          vm={vm}
          utils={utils}
          onLog={onLog}
          updateOpen={vm.deleteDialogOpen}
          onDialogClose={() => (vm.deleteDialogOpen = false)}
        />
      )}
    </div>
  );
});
