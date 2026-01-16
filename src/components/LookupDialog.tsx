import React from "react";

import { observer } from "mobx-react";
import { SelectionValue, View, ViewModel } from "../model/vm";
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
import { UpdateColumn } from "../model/UpdateColumn";

interface LookupDialogProps {
  dvSvc: dvService;
  vm: ViewModel;
  updateField: UpdateColumn;
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
  const { dvSvc, vm, updateField, dialogOpen, onLog, onDialogClose } = props;
  const [localSelectedView, setLocalSelectedView] = React.useState<View>();
  const [localSelectionValue, setLocalSelectionValue] = React.useState<SelectionValue>();
  const [data, setData] = React.useState<Array<any>>([]);

  React.useEffect(() => {
    const loadViews = async () => {
      if (updateField.column.type === "Lookup" && !updateField.column.lookupTargetTable) {
        await dvSvc
          .getLookupTargetTable(vm.selectedTable!.logicalName, updateField.column.logicalName)
          .then(async (lookupTable) => {
            updateField.column.lookupTargetTable = vm.tables.find((t) => t.logicalName === lookupTable); // Assign the found table to the

            if (updateField.column.lookupTargetTable && !updateField.column.lookupTargetTable.views) {
              await dvSvc.getViews(updateField.column.lookupTargetTable!).then((views) => {
                updateField.column.lookupTargetTable!.views = views;
              });
            }
            if (updateField.column.lookupTargetTable && !updateField.column.lookupTargetTable.fields) {
              await dvSvc.getFields(updateField.column.lookupTargetTable.logicalName).then((fields) => {
                updateField.column.lookupTargetTable!.fields = fields;
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

  const viewsList = (updateField.column.lookupTargetTable?.views ?? []).map((view) => (
    <Option key={view.id} value={view.id}>
      {view.label}
    </Option>
  ));

  const onViewSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    setLocalSelectedView(
      updateField.column.lookupTargetTable!.views!.find((view) => view.id === (data.optionValue as string))!,
    );
  };

  const cols = React.useMemo(() => {
    return (
      localSelectedView?.fieldNames?.map((fieldName) => {
        const field = updateField.column.lookupTargetTable!.fields.find((f) => f.logicalName === fieldName);

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
      setLocalSelectionValue({
        label: selectedRows[0][updateField.column.lookupTargetTable?.primaryNameAttribute!],
        value: selectedRows[0][updateField.column.lookupTargetTable?.primaryIdAttribute!],
      });
    } else setLocalSelectionValue(undefined);
  }
  async function selectRecord(_: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    if (localSelectionValue) {
      updateField.selectedSelections = [localSelectionValue];

      onDialogClose();
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(_) => onDialogClose()}>
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
