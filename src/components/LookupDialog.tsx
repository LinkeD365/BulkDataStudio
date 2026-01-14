import React from "react";

import { observer } from "mobx-react";
import { SelectionValue, View, ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverseService";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Combobox,
  Option,
  Field,
  ComboboxProps,
  Button,
  DialogTrigger,
} from "@fluentui/react-components";
import { UpdateField } from "../model/update";

interface LookupDialogProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  updateField: UpdateField;
  dialogOpen: boolean;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  onDialogClose: () => void;
}
import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  themeQuartz,
  ColDef,
  RowSelectionOptions,
  RowSelectionModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([TextFilterModule, ClientSideRowModelModule, RowSelectionModule]);
const agTheme = themeQuartz.withParams({
  headerHeight: "30px",
});
export const LookupDialog = observer((props: LookupDialogProps): React.JSX.Element => {
  const { connection, dvSvc, vm, updateField, dialogOpen, onLog, onDialogClose } = props;
  const [localSelectedView, setLocalSelectedView] = React.useState<View>();
  const [localSelectionValue, setLocalSelectionValue] = React.useState<SelectionValue>();
  const [data, setData] = React.useState<Array<any>>([]);

  React.useEffect(() => {
    const loadViews = async () => {
      if (updateField.field.type === "Lookup" && !updateField.field.lookupTargetTable) {
        await dvSvc
          .getLookupTargetTable(vm.selectedTable!.logicalName, updateField.field.logicalName)
          .then(async (lookupTable) => {
            updateField.field.lookupTargetTable = vm.tables.find((t) => t.logicalName === lookupTable); // Assign the found table to the
            console.log("Lookup target table logical name:", updateField.field.lookupTargetTable);
            if (updateField.field.lookupTargetTable && !updateField.field.lookupTargetTable.views) {
              await dvSvc.loadViews(updateField.field.lookupTargetTable!).then((views) => {
                updateField.field.lookupTargetTable!.views = views;
              });
            }
            if (updateField.field.lookupTargetTable && !updateField.field.lookupTargetTable.fields) {
              await dvSvc.loadFields(updateField.field.lookupTargetTable.logicalName).then((fields) => {
                updateField.field.lookupTargetTable!.fields = fields;
              });
            }
          })
          .catch((error) => {
            onLog(`Error loading lookup target table: ${error.message}`, "error");
          });
      }
    };
    loadViews();
  }, [dialogOpen]);

  React.useEffect(() => {
    const loadData = async () => {
      if (localSelectedView) {
        await dvSvc.loadData(localSelectedView.fetchXml).then((data) => {
          setData(data);
          onLog(`Loaded ${data.length} records from view: ${localSelectedView.label}`, "success");
        });
      }
    };
    loadData();
  }, [localSelectedView]);

  React.useEffect(() => {
    const loadViewMeta = async () => {
      if (localSelectedView) {
        localSelectedView.fieldNames =
          localSelectedView.fetchXml
            .match(/attribute\s+name\s*=\s*["']([^"']+)["']/g)
            ?.map((attr) => attr.match(/["']([^"']+)["']/)?.[1])
            .filter((x): x is string => x !== undefined) || [];
      }
    };
    loadViewMeta();
  }, [localSelectedView]);

  const viewsList = (updateField.field.lookupTargetTable?.views ?? []).map((view) => (
    <Option key={view.id} value={view.id}>
      {view.label}
    </Option>
  ));

  const onViewSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    console.log("Selected view ID:", data.optionValue);
    setLocalSelectedView(
      updateField.field.lookupTargetTable!.views!.find((view) => view.id === (data.optionValue as string))!
    );
  };

  const cols = React.useMemo(() => {
    console.log("Generating columns for view:", updateField.field.lookupTargetTable);
    return (
      localSelectedView?.fieldNames?.map((fieldName) => {
        const field = updateField.field.lookupTargetTable!.fields.find((f) => f.logicalName === fieldName);
        console.log("Column field:", fieldName, field);
        return {
          headerName: field?.displayName || fieldName,
          field: fieldName,
        };
      }) || []
    );
  }, [localSelectedView?.fieldNames]);
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    wrapText: true,
    width: 100,
  };

  const rowSelection = React.useMemo<RowSelectionOptions>(() => {
    return {
      mode: "singleRow",
    };
  }, []);

  function lookupSelected(event: SelectionChangedEvent): void {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows.length > 0) {
      const primaryKeyField = updateField.field.lookupTargetTable?.fields.find((f) => f.primaryKey);
      const primaryKeyLogicalName = primaryKeyField?.logicalName;
      if (primaryKeyLogicalName) {
        setLocalSelectionValue({
          label: selectedRows[0][updateField.field.lookupTargetTable?.primaryNameAttribute!],
          value: selectedRows[0][primaryKeyLogicalName],
        });
      }
    } else setLocalSelectionValue(undefined);
  }
  function selectRecord(event: React.MouseEvent<HTMLButtonElement>): void {
    if (localSelectionValue) {
      updateField.selectionValues = [localSelectionValue];
      onDialogClose();
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(_e, data) => onDialogClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Select a Lookup Value</DialogTitle>
          <DialogContent>
            <Field label="Select a view">
              <Combobox placeholder="Select a View" onOptionSelect={onViewSelect}>
                {viewsList}
              </Combobox>
            </Field>
            <div style={{ width: "100%", height: "60vh", marginTop: "10px" }}>
              <AgGridReact
                rowData={data}
                columnDefs={cols}
                theme={agTheme}
                domLayout="normal"
                defaultColDef={defaultColDef}
                rowSelection={rowSelection}
                onSelectionChanged={lookupSelected}
              />
            </div>
          </DialogContent>

          <DialogActions>
            <Button appearance="primary" disabled={!localSelectionValue} onClick={selectRecord}>
              Select Record
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
});
