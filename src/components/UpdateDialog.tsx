import React from "react";

import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverseService";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTrigger,
} from "@fluentui/react-components";
import { utilService } from "../utils/utils";

interface UpdateDialogProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  utils: utilService;
  updateOpen: boolean;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  onDialogClose: () => void;
}

export const UpdateDialog = observer((props: UpdateDialogProps): React.JSX.Element => {
  const { dvSvc, vm, onLog, updateOpen, onDialogClose, utils } = props;
  const [updatingData, setUpdatingData] = React.useState(false);

  const updateData = async () => {
    setUpdatingData(true);
    await dvSvc
      .updateData(vm.selectedTable!, vm.selectedRows, vm.updateFields)
      .then(async () => {
        onLog("Records updated successfully", "success");
        window.toolboxAPI.utils.showNotification({
          title: "Bulk Data Studio",
          body: `${vm.selectedRows.length} records updated successfully`,
          type: "success",
        });
        await utils.delayLoadData(1000);
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Failed to update records";
        onLog(errorMessage, "error");
        window.toolboxAPI.utils.showNotification({
          title: "Bulk Data Studio",
          body: errorMessage,
          type: "error",
        });
      })
      .finally(() => {
        setUpdatingData(false);
        onDialogClose();
      });
  };
  return (
    <div>
      <Dialog
        open={updateOpen}
        onOpenChange={(_) => {
          onDialogClose();
        }}
        modalType="alert"
      >
        <DialogSurface>
          <DialogBody>
            <DialogContent>
              <p>
                {`${vm.selectedRows.length} records on the ${vm.selectedTable?.displayName} table 
              will unconditionally be updated.`}
              </p>
              <p>UI defined rules will NOT be enforced.</p>
              <p>Confirm update!</p>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button style={{ marginLeft: "auto" }} disabled={updatingData} appearance="primary" onClick={updateData}>
              Update Records
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={updatingData}>
                Cancel
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </div>
  );
});

export const TouchDialog = observer((props: UpdateDialogProps): React.JSX.Element => {
  const { dvSvc, vm, onLog, updateOpen, onDialogClose, utils } = props;
  const [touchingData, setTouchingData] = React.useState(false);

  const touchData = async () => {
    setTouchingData(true);
    await dvSvc
      .touchData(vm.selectedTable!, vm.selectedRows)
      .then(async () => {
        onLog("Records touched successfully", "success");
        window.toolboxAPI.utils.showNotification({
          title: "Bulk Data Studio",
          body: `${vm.selectedRows.length} records touched successfully`,
          type: "success",
        });
        await utils.delayLoadData(1000);
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Failed to update records";
        onLog(errorMessage, "error");
        window.toolboxAPI.utils.showNotification({
          title: "Bulk Data Studio",
          body: errorMessage,
          type: "error",
          duration: 2000,
        });
      })
      .finally(() => {
        setTouchingData(false);
        onDialogClose();
      });
  };
  return (
    <div>
      <Dialog
        open={updateOpen}
        onOpenChange={(_) => {
          onDialogClose();
        }}
        modalType="alert"
      >
        <DialogSurface>
          <DialogBody>
            <DialogContent>
              <p>
                {`${vm.selectedRows.length} records on the ${vm.selectedTable?.displayName} table 
              will "touched".`}
              </p>
              <p>UI defined rules will NOT be enforced.</p>
              <p>Confirm update!</p>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button style={{ marginLeft: "auto" }} disabled={touchingData} appearance="primary" onClick={touchData}>
              Touch Records
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={touchingData}>
                Cancel
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </div>
  );
});
