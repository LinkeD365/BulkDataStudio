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
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const FetchXmlEditorDialog = observer((props: FetchXmlEditorDialogProps): React.JSX.Element => {
  const { vm } = props;
  const [localFetchXml, setLocalFetchXml] = React.useState<string>(vm.fetchXml || "");

  React.useEffect(() => {
    if (vm.fetchXmlEditorOpen) {
      setLocalFetchXml(vm.fetchXml || "");
    }
  }, [vm.fetchXmlEditorOpen, vm.fetchXml]);

  const handleSave = () => {
    vm.fetchXml = localFetchXml;
    vm.fetchXmlEditorOpen = false;
  };

  const handleCancel = () => {
    vm.fetchXmlEditorOpen = false;
  };

  return (
    <Dialog open={vm.fetchXmlEditorOpen} onOpenChange={(_, data) => (vm.fetchXmlEditorOpen = data.open)}>
      <DialogSurface style={{ maxWidth: "800px" }}>
        <DialogBody>
          <DialogContent>
            <div style={{ minHeight: "400px", display: "flex", flexDirection: "column" }}>
              <Field label="FetchXML" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Editor
                  value={localFetchXml}
                  onValueChange={setLocalFetchXml}
                  highlight={(code) => Prism.highlight(code, Prism.languages.markup, "markup")}
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
            Save
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
});
