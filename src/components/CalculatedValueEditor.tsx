import React from "react";
import { observer } from "mobx-react";
import { UpdateColumn } from "../model/UpdateColumn";
import { ViewModel } from "../model/vm";
import { dvService } from "../utils/dataverseService";
import { ExpressionEvaluator } from "../utils/expressionEvaluator";
import {
  Textarea,
  Button,
  Text,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Tooltip,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  tokens,
} from "@fluentui/react-components";
import { Info24Filled, CheckmarkCircle12Filled, ErrorCircle12Filled, Edit24Regular } from "@fluentui/react-icons";

interface CalculatedValueEditorProps {
  dvSvc: dvService;
  vm: ViewModel;
  updateColumn: UpdateColumn;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const CalculatedValueEditor = observer((props: CalculatedValueEditorProps): React.JSX.Element => {
  const { updateColumn, vm, onLog } = props;
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const savedStateRef = React.useRef<{ template: string; preview: any; error?: string }>({
    template: "",
    preview: "",
    error: undefined,
  });

  const openDialog = () => {
    savedStateRef.current = {
      template: updateColumn.expressionTemplate || "",
      preview: updateColumn.previewValue,
      error: updateColumn.calculationError,
    };
    setDialogOpen(true);
  };

  const cancelDialog = () => {
    updateColumn.expressionTemplate = savedStateRef.current.template;
    updateColumn.previewValue = savedStateRef.current.preview;
    updateColumn.calculationError = savedStateRef.current.error;
    setDialogOpen(false);
  };

  const getPreviewRecord = React.useCallback(() => {
    if (vm.selectedRows.length > 0 && vm.data && vm.selectedTable) {
      const idAttr = vm.selectedTable.primaryIdAttribute;
      const selectedId = vm.selectedRows[0].value;
      const match = vm.data.find((r) => r[idAttr] === selectedId);
      if (match) return match;
    }
    return vm.data && vm.data.length > 0 ? vm.data[0] : undefined;
  }, [vm.selectedRows, vm.data, vm.selectedTable]);

  React.useEffect(() => {
    const record = getPreviewRecord();
    if (vm.selectedTable?.logicalName && record) {
      const tokens = ExpressionEvaluator.getTokenSuggestions(record);
      setSuggestions(tokens);
    }
  }, [vm.selectedTable?.logicalName, vm.data, vm.selectedRows, getPreviewRecord]);

  const handleTemplateChange = (template: string) => {
    updateColumn.expressionTemplate = template;

    const record = getPreviewRecord();
    if (record) {
      try {
        const result = ExpressionEvaluator.evaluate(template, {
          record,
        });

        updateColumn.previewValue = result.value;
        updateColumn.calculationError = result.error;

        if (result.error) {
          onLog(`Calculation error: ${result.error}`, "warning");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateColumn.calculationError = errorMsg;
        onLog(`Expression evaluation error: ${errorMsg}`, "error");
      }
    }
  };

  const insertToken = (token: string) => {
    const textarea = document.getElementById(`expr-${updateColumn.column.logicalName}`) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = updateColumn.expressionTemplate?.substring(0, start) || "";
      const after = updateColumn.expressionTemplate?.substring(end) || "";
      const newTemplate = before + token + after;
      handleTemplateChange(newTemplate);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + token.length;
        textarea.focus();
      });
    }
  };

  const getStatusIcon = () => {
    if (!updateColumn.expressionTemplate) return null;
    if (updateColumn.calculationError) return <ErrorCircle12Filled style={{ color: "red" }} />;
    return <CheckmarkCircle12Filled style={{ color: "green" }} />;
  };

  const feedbackColor = updateColumn.calculationError
    ? tokens.colorPaletteRedForeground1
    : updateColumn.previewValue !== undefined
      ? tokens.colorNeutralForeground1
      : tokens.colorNeutralForeground4;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%", minWidth: 0 }}>
      <Text
        size={200}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: "monospace",
          wordBreak: "break-word",
          color: updateColumn.expressionTemplate ? feedbackColor : tokens.colorNeutralForeground4,
        }}
      >
        {updateColumn.expressionTemplate || "Click edit to set expression..."}
      </Text>
      <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
        {getStatusIcon()}
        <Dialog
          open={dialogOpen}
          onOpenChange={(_, data) => {
            if (!data.open) cancelDialog();
          }}
        >
          <DialogTrigger disableButtonEnhancement>
            <Button icon={<Edit24Regular />} appearance="subtle" size="small" onClick={openDialog} />
          </DialogTrigger>
          <DialogSurface style={{ maxWidth: "640px", width: "90vw" }}>
            <DialogBody>
              <DialogTitle>Expression Editor - {updateColumn.column.displayName}</DialogTitle>
              <DialogContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Help reference */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                    {getStatusIcon()}
                    <Popover positioning="below-start">
                      <PopoverTrigger disableButtonEnhancement>
                        <Button icon={<Info24Filled />} appearance="subtle" size="small" />
                      </PopoverTrigger>
                      <PopoverSurface>
                        <div style={{ padding: "12px", maxWidth: "400px", fontSize: "12px" }}>
                          <Text weight="semibold">Token & Function Reference</Text>
                          <div style={{ marginTop: "8px", lineHeight: "1.5" }}>
                            <p>
                              <strong>{"{column}"}</strong> - Get field value (e.g. {"{firstname}"})
                            </p>
                            <p>
                              <strong>{"<iif|value|op|comp|then|else>"}</strong> - Conditional
                            </p>
                            <p>
                              <strong>{"<Upper>, <Lower>"}</strong> - Case conversion
                            </p>
                            <p>
                              <strong>{"<Trim>, <Left|n>, <Right|n>"}</strong> - String formatting
                            </p>
                            <p>
                              <strong>{"<Replace|old|new>"}</strong> - Replace text
                            </p>
                            <p>
                              <strong>{"<system|now|>, <system|today|>"}</strong> - System values
                            </p>
                          </div>
                        </div>
                      </PopoverSurface>
                    </Popover>
                  </div>

                  {/* Textarea */}
                  <Textarea
                    id={`expr-${updateColumn.column.logicalName}`}
                    placeholder="Enter expression template. Use {fieldname} for tokens."
                    value={updateColumn.expressionTemplate || ""}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    style={{
                      minHeight: "120px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      borderColor: updateColumn.calculationError ? tokens.colorPaletteRedForeground1 : undefined,
                      resize: "vertical",
                    }}
                  />

                  {/* Quick Token Insert Buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {suggestions.slice(0, 5).map((token) => (
                      <Tooltip key={token} content={`Insert ${token}`} relationship="description">
                        <Button size="small" onClick={() => insertToken(token)}>
                          {token}
                        </Button>
                      </Tooltip>
                    ))}
                    {suggestions.length > 5 && (
                      <Popover positioning="below-start">
                        <PopoverTrigger disableButtonEnhancement>
                          <Button size="small">More fields...</Button>
                        </PopoverTrigger>
                        <PopoverSurface>
                          <div style={{ padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {suggestions.map((token) => (
                              <Button key={token} size="small" onClick={() => insertToken(token)}>
                                {token}
                              </Button>
                            ))}
                          </div>
                        </PopoverSurface>
                      </Popover>
                    )}
                  </div>

                  {/* Preview */}
                  {updateColumn.previewValue !== undefined && !updateColumn.calculationError && (
                    <div
                      style={{
                        padding: "8px",
                        backgroundColor: tokens.colorPaletteGreenBackground1,
                        borderRadius: "4px",
                        borderLeft: `3px solid ${tokens.colorPaletteGreenForeground1}`,
                      }}
                    >
                      <Text size={200} style={{ color: tokens.colorPaletteGreenForeground1, fontWeight: "600" }}>
                        Preview: {updateColumn.previewValue}
                      </Text>
                    </div>
                  )}

                  {/* Error */}
                  {updateColumn.calculationError && (
                    <div
                      style={{
                        padding: "8px",
                        backgroundColor: tokens.colorPaletteRedBackground1,
                        borderRadius: "4px",
                        borderLeft: `3px solid ${tokens.colorPaletteRedForeground1}`,
                      }}
                    >
                      <Text size={200} style={{ color: tokens.colorPaletteRedForeground1, fontWeight: "600" }}>
                        Error: {updateColumn.calculationError}
                      </Text>
                    </div>
                  )}
                </div>
              </DialogContent>
              <DialogActions>
                <Button appearance="primary" onClick={() => setDialogOpen(false)}>
                  Save
                </Button>
                <Button appearance="secondary" onClick={cancelDialog}>
                  Cancel
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>
    </div>
  );
});
