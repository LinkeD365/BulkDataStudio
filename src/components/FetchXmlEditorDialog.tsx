import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/vm";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  Field,
} from "@fluentui/react-components";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";

interface FetchXmlEditorDialogProps {
  vm: ViewModel;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
  onLoad?: () => void;
}

export const FetchXmlEditorDialog = observer(
  (props: FetchXmlEditorDialogProps): React.JSX.Element => {
    const { vm, onLoad } = props;
    const [localFetchXml, setLocalFetchXml] = React.useState<string>(
      vm.fetchXml || vm.selectedView?.fetchXml || "",
    );

    React.useEffect(() => {
      if (vm.fetchXmlEditorOpen) {
        setLocalFetchXml(vm.fetchXml || vm.selectedView?.fetchXml || "");
      }
    }, [vm.fetchXmlEditorOpen, vm.fetchXml, vm.selectedView]);

    const handleSave = () => {
      const currentFetchXml = vm.selectedView?.fetchXml || vm.fetchXml || "";
      if (
        currentFetchXml !== localFetchXml &&
        vm.updateCols.length > 0 &&
        !window.confirm(
          "Changing the data query will clear the fields in the Fields to update list. Continue?",
        )
      ) {
        return;
      }
      if (currentFetchXml !== localFetchXml) {
        vm.updateCols = [];
      }
      vm.selectedView = undefined;
      vm.fetchXml = localFetchXml;
      vm.fetchFields = [];
      vm.fetchXmlEditorOpen = false;
      onLoad?.();
    };

    const handleCancel = () => {
      vm.fetchXmlEditorOpen = false;
    };

    return (
      <Dialog
        open={vm.fetchXmlEditorOpen}
        onOpenChange={(_, data) => (vm.fetchXmlEditorOpen = data.open)}
      >
        <DialogSurface style={{ maxWidth: "800px" }}>
          <DialogBody>
            <DialogContent>
              <div
                style={{
                  minHeight: "400px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Field
                  label="FetchXML"
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <Editor
                    value={localFetchXml}
                    onValueChange={setLocalFetchXml}
                    highlight={(code) =>
                      Prism.highlight(code, Prism.languages.markup, "markup")
                    }
                    padding={12}
                    className="fetchxml-editor"
                    preClassName="fetchxml-editor__pre"
                    textareaClassName="fetchxml-editor__textarea"
                    style={{ flex: 1 }}
                  />
                </Field>
              </div>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSave}>
              Load Data
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    );
  },
);
