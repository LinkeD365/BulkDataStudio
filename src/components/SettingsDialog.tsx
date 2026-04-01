import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  SpinButton,
  SpinButtonChangeEvent,
  SpinButtonOnChangeData,
} from "@fluentui/react-components";
import { dvService, DEFAULT_BATCH_SIZE, BATCH_SIZE_STORAGE_KEY } from "../utils/dataverseService";

interface SettingsDialogProps {
  dvSvc: dvService;
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog = (props: SettingsDialogProps): React.JSX.Element => {
  const { dvSvc, open, onClose } = props;
  const [batchSize, setBatchSize] = React.useState<number>(dvSvc?.batchSize ?? DEFAULT_BATCH_SIZE);

  React.useEffect(() => {
    if (open) {
      setBatchSize(dvSvc?.batchSize ?? DEFAULT_BATCH_SIZE);
    }
  }, [open, dvSvc]);

  const handleBatchSizeChange = (_ev: SpinButtonChangeEvent, data: SpinButtonOnChangeData) => {
    if (data.value !== undefined && data.value !== null) {
      setBatchSize(data.value);
    } else if (data.displayValue !== undefined) {
      const parsed = parseInt(data.displayValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setBatchSize(parsed);
      }
    }
  };

  const handleSave = () => {
    const validBatchSize = Math.max(1, Math.min(1000, batchSize));
    dvSvc.batchSize = validBatchSize;
    localStorage.setItem(BATCH_SIZE_STORAGE_KEY, String(validBatchSize));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_ev, data) => { if (!data.open) onClose(); }} modalType="non-modal">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Settings</DialogTitle>
          <DialogContent>
            <Field label="Batch Size" hint="Number of records processed per batch during update, touch and delete operations.">
              <SpinButton
                min={1}
                max={1000}
                step={1}
                value={batchSize}
                onChange={handleBatchSizeChange}
              />
            </Field>
          </DialogContent>
        </DialogBody>
        <DialogActions>
          <Button appearance="primary" onClick={handleSave}>
            Save
          </Button>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
          </DialogTrigger>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};
