import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/vm";
import { dvService } from "../utils/dataverseService";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  Text,
} from "@fluentui/react-components";
import { utilService } from "../utils/utils";

interface UpdateDialogProps {
  dvSvc: dvService;
  vm: ViewModel;
  utils: utilService;
  updateOpen: boolean;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  onDialogClose: () => void;
}

interface ConfirmationDetailsProps {
  dvSvc: dvService;
  vm: ViewModel;
  operation: string;
  irreversible?: boolean;
}

function ConfirmationDetails({
  dvSvc,
  vm,
  operation,
  irreversible = false,
}: ConfirmationDetailsProps): React.JSX.Element {
  const connection = dvSvc.connection;
  const isProduction = connection?.environment === "Production";

  return (
    <>
      {isProduction && (
        <MessageBar intent="error">
          <MessageBarBody>
            Production environment: verify the target and maintain a suitable backup before proceeding.
          </MessageBarBody>
        </MessageBar>
      )}
      <Text block>
        <strong>Operation:</strong> {operation}
      </Text>
      <Text block>
        <strong>Environment:</strong> {connection?.name ?? "Unknown"} ({connection?.environment ?? "Unknown"})
      </Text>
      <Text block>
        <strong>URL:</strong> {connection?.url ?? "Unknown"}
      </Text>
      <Text block>
        <strong>Scope:</strong> {vm.selectedRows.length} {vm.selectedTable?.displayName ?? "unknown table"} record
        {vm.selectedRows.length === 1 ? "" : "s"}
      </Text>
      <MessageBar intent="warning">
        <MessageBarBody>
          {irreversible
            ? "Deletion is permanent and cannot be undone by Bulk Data Studio."
            : "Bulk Data Studio does not create an automatic rollback. Export or back up important records before proceeding."}
          {" "}This operation may trigger plug-ins, Power Automate flows, auditing, and business rules.
        </MessageBarBody>
      </MessageBar>
    </>
  );
}

function getOperationError(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export const UpdateDialog = observer((props: UpdateDialogProps): React.JSX.Element => {
  const { dvSvc, vm, onLog, updateOpen, onDialogClose, utils } = props;
  const [updatingData, setUpdatingData] = React.useState(false);
  const abortController = React.useRef<AbortController | null>(null);

  const updateData = async (): Promise<void> => {
    const controller = new AbortController();
    abortController.current = controller;
    setUpdatingData(true);
    try {
      await dvSvc.updateData(vm.selectedTable!, vm.selectedRows, vm.updateCols, controller.signal);
      onLog("Records updated successfully", "success");
      await window.toolboxAPI.utils.showNotification({
        title: "Bulk Data Studio",
        body: `${vm.selectedRows.length} records updated successfully`,
        type: "success",
      });
      onDialogClose();
      await utils.delayLoadData(1000);
    } catch (error) {
      const errorMessage = getOperationError(error, "Failed to update records");
      onLog(errorMessage, error instanceof DOMException && error.name === "AbortError" ? "warning" : "error");
      await window.toolboxAPI.utils.showNotification({
        title: "Update Not Completed",
        body: errorMessage,
        type: error instanceof DOMException && error.name === "AbortError" ? "warning" : "error",
      });
      onDialogClose();
    } finally {
      abortController.current = null;
      setUpdatingData(false);
    }
  };

  return (
    <Dialog open={updateOpen} onOpenChange={(_, data) => !data.open && !updatingData && onDialogClose()} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Confirm Record Update</DialogTitle>
          <DialogContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ConfirmationDetails dvSvc={dvSvc} vm={vm} operation="Update selected records" />
            <Text>Configured field values will be applied without enforcing model-driven app form rules.</Text>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" disabled={updatingData} onClick={() => void updateData()}>
              Update Records
            </Button>
            <Button
              appearance="secondary"
              onClick={() => {
                if (updatingData) {
                  abortController.current?.abort();
                } else {
                  onDialogClose();
                }
              }}
            >
              {updatingData ? "Cancel Operation" : "Cancel"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
});

export const TouchDialog = observer((props: UpdateDialogProps): React.JSX.Element => {
  const { dvSvc, vm, onLog, updateOpen, onDialogClose, utils } = props;
  const [touchingData, setTouchingData] = React.useState(false);
  const abortController = React.useRef<AbortController | null>(null);

  const touchData = async (): Promise<void> => {
    const controller = new AbortController();
    abortController.current = controller;
    setTouchingData(true);
    try {
      await dvSvc.touchData(vm.selectedTable!, vm.selectedRows, controller.signal);
      onLog("Records touched successfully", "success");
      await window.toolboxAPI.utils.showNotification({
        title: "Bulk Data Studio",
        body: `${vm.selectedRows.length} records touched successfully`,
        type: "success",
      });
      onDialogClose();
      await utils.delayLoadData(1000);
    } catch (error) {
      const errorMessage = getOperationError(error, "Failed to touch records");
      onLog(errorMessage, error instanceof DOMException && error.name === "AbortError" ? "warning" : "error");
      await window.toolboxAPI.utils.showNotification({
        title: "Touch Not Completed",
        body: errorMessage,
        type: error instanceof DOMException && error.name === "AbortError" ? "warning" : "error",
      });
      onDialogClose();
    } finally {
      abortController.current = null;
      setTouchingData(false);
    }
  };

  return (
    <Dialog open={updateOpen} onOpenChange={(_, data) => !data.open && !touchingData && onDialogClose()} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Confirm Record Touch</DialogTitle>
          <DialogContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ConfirmationDetails dvSvc={dvSvc} vm={vm} operation="Touch selected records" />
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" disabled={touchingData} onClick={() => void touchData()}>
              Touch Records
            </Button>
            <Button
              appearance="secondary"
              onClick={() => {
                if (touchingData) {
                  abortController.current?.abort();
                } else {
                  onDialogClose();
                }
              }}
            >
              {touchingData ? "Cancel Operation" : "Cancel"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
});

export const DeleteDialog = observer((props: UpdateDialogProps): React.JSX.Element => {
  const { dvSvc, vm, onLog, updateOpen, onDialogClose, utils } = props;
  const [deletingData, setDeletingData] = React.useState(false);
  const abortController = React.useRef<AbortController | null>(null);

  const deleteData = async (): Promise<void> => {
    const controller = new AbortController();
    abortController.current = controller;
    setDeletingData(true);
    try {
      await dvSvc.deleteData(vm.selectedTable!, vm.selectedRows, controller.signal);
      onLog("Records deleted successfully", "success");
      await window.toolboxAPI.utils.showNotification({
        title: "Bulk Data Studio",
        body: `${vm.selectedRows.length} records deleted successfully`,
        type: "success",
      });
      onDialogClose();
      await utils.delayLoadData(1000);
    } catch (error) {
      const errorMessage = getOperationError(error, "Failed to delete records");
      onLog(errorMessage, error instanceof DOMException && error.name === "AbortError" ? "warning" : "error");
      await window.toolboxAPI.utils.showNotification({
        title: "Delete Not Completed",
        body: errorMessage,
        type: error instanceof DOMException && error.name === "AbortError" ? "warning" : "error",
      });
      onDialogClose();
    } finally {
      abortController.current = null;
      setDeletingData(false);
    }
  };

  return (
    <Dialog open={updateOpen} onOpenChange={(_, data) => !data.open && !deletingData && onDialogClose()} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Confirm Permanent Deletion</DialogTitle>
          <DialogContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ConfirmationDetails dvSvc={dvSvc} vm={vm} operation="Permanently delete selected records" irreversible />
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" disabled={deletingData} onClick={() => void deleteData()}>
              Delete Records
            </Button>
            <Button
              appearance="secondary"
              onClick={() => {
                if (deletingData) {
                  abortController.current?.abort();
                } else {
                  onDialogClose();
                }
              }}
            >
              {deletingData ? "Cancel Operation" : "Cancel"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
});
