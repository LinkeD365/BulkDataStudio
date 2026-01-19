import React from "react";
import { observer } from "mobx-react";
import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  themeQuartz,
  ColDef,
  ValidationModule,
  RowAutoHeightModule,
  RowSelectionOptions,
  RowSelectionModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  ValidationModule,
  RowAutoHeightModule,
  RowSelectionModule,
]);

import { SelectionValue, ViewModel } from "../model/vm";
import { utilService } from "../utils/utils";
const agTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

interface DataGridProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  vm: ViewModel;
  utils: utilService;
}

export const DataGrid = observer((props: DataGridProps): React.JSX.Element => {
  const { connection, vm, utils } = props;

  function rowSelected(event: SelectionChangedEvent<any>): void {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows.length > 0) {
      const selectionValues: SelectionValue[] = selectedRows.map((row) => {
        return {
          label: row[vm.selectedTable?.primaryNameAttribute || ""],
          value: row[vm.selectedTable?.primaryIdAttribute || ""],
        };
      });
      vm.selectedRows = selectionValues;
    } else vm.selectedRows = [];
  }
  React.useEffect(() => {
    if (utils && vm.selectedView && connection) utils.loadData();
  }, [connection, utils, vm.selectedView]);

  const cols = React.useMemo(() => {
    if (!vm.selectedView || !vm.selectedTable || vm.selectedTable.fields === undefined) {
      return [];
    }
    return (
      vm.selectedView?.fieldNames
        ?.filter((fieldName) => fieldName !== vm.selectedTable?.primaryIdAttribute)
        .map((fieldName) => {
          const field = vm.selectedTable?.fields.find((f) => f.logicalName === fieldName);
          if (field) {
            return {
              headerName: field?.displayName || fieldName,
              field: field?.dataName || fieldName,
              flex: field?.logicalName === vm.selectedTable?.primaryNameAttribute ? 2 : 1,
            };
          }
        })
        .filter((col) => col !== undefined) || []
    );
  }, [vm.selectedView, vm.selectedTable]);

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    wrapText: true,
    width: 100,
  };

  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);
  return (
    <div style={{ width: "100%", height: "85vh" }}>
      <AgGridReact
        suppressFieldDotNotation
        rowData={vm.data}
        columnDefs={cols}
        theme={agTheme}
        domLayout="normal"
        defaultColDef={defaultColDef}
        rowSelection={rowSelection}
        onSelectionChanged={rowSelected}
      />
    </div>
  );
});
