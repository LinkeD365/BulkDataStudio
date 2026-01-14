import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverseService";
import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  themeQuartz,
  ColDef,
  ValidationModule,
  SelectEditorModule,
  RowAutoHeightModule,
  RowSelectionModule,
  GridReadyEvent,
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { SetStatus, UpdateField } from "../model/update";
import { Combobox, Option } from "@fluentui/react-components";
import { runInAction } from "mobx";
import { UpdateValue } from "./UpdateValue";

ModuleRegistry.registerModules([
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  ValidationModule,
  RowAutoHeightModule,
  RowSelectionModule,
  SelectEditorModule,
]);
const agTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

interface UpdateListProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
  wrapText: true,
  width: 100,
};

console.log("raw", Object.keys(SetStatus));
export const UpdateList = observer((props: UpdateListProps): React.JSX.Element => {
  const { connection, dvSvc, vm, onLog } = props;

  const cols: ColDef<UpdateField>[] = [
    { field: "field.displayName", headerName: "Field Name", flex: 2 },
    {
      field: "newValue",
      headerName: "New Value",
      cellRenderer: (params: CustomCellRendererProps<UpdateField>) =>
        params.data ? (
          <UpdateValue field={params.data} connection={connection} dvSvc={dvSvc} vm={vm} onLog={onLog} />
        ) : null,
    },
    {
      field: "setStatus",
      headerName: "Action",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: SetStatus },
      editable: true,
      singleClickEdit: true,
    },
    { field: "onlyDifferent", headerName: "Only If Different", editable: true, cellEditor: "agCheckboxCellEditor" },
  ];

  return (
    <div style={{ width: "100%", height: "80vh", flexBasis: 0 }}>
      <AgGridReact<UpdateField>
        theme={agTheme}
        rowData={vm.updateFields || []}
        defaultColDef={defaultColDef}
        columnDefs={cols}
        debug={true}
      />
    </div>
  );
});
