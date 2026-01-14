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

import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverseService";
const agTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

interface DataGridProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const DataGrid = observer((props: DataGridProps): React.JSX.Element => {
  const { connection, dvSvc, vm, onLog } = props;
  const [data, setData] = React.useState<Array<any>>([]);

  React.useEffect(() => {
    const loadData = async () => {
      if (vm.selectedView) {
        onLog(`Loading data for view: ${vm.selectedView.label}`, "info");
        try {
          const data = await dvSvc.loadData(vm.selectedView.fetchXml);
          setData(data);
          onLog(`Loaded ${data.length} records from view: ${vm.selectedView.label}`, "success");
          console.log("Data loaded:", data);
        } catch (error: any) {
          onLog(`Error loading data: ${error.message}`, "error");
        }
      }
    };
    loadData();
  }, [connection, vm.selectedView]);

  const cols = React.useMemo(() => {
    return (
      vm.selectedView?.fieldNames?.map((fieldName) => {
        const field = vm.selectedTable?.fields.find((f) => f.logicalName === fieldName);
        return {
          headerName: field?.displayName || fieldName,
          field: fieldName,
        };
      }) || []
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
        rowData={data}
        columnDefs={cols}
        theme={agTheme}
        domLayout="normal"
        defaultColDef={defaultColDef}
        rowSelection={rowSelection}
      />
    </div>
  );
});
