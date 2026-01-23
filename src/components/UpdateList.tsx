import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/vm";
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
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { SetStatus, UpdateColumn } from "../model/UpdateColumn";

import { UpdateValue } from "./UpdateValue";
import { Combobox, Option } from "@fluentui/react-components";

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

export const UpdateList = observer((props: UpdateListProps): React.JSX.Element => {
  const { dvSvc, vm, onLog } = props;

  const cols: ColDef<UpdateColumn>[] = [
    { field: "column.displayName", headerName: "Field Name", flex: 2 },
    {
      field: "newValue",
      headerName: "New Value",
      cellRenderer: (params: CustomCellRendererProps<UpdateColumn>) =>
        params.data ? <UpdateValue updateColumn={params.data} dvSvc={dvSvc} vm={vm} onLog={onLog} /> : null,
    },
    {
      field: "setStatus",
      headerName: "Action",
      cellRenderer: (params: CustomCellRendererProps<UpdateColumn>) => {
        const updateCol = params.data;
        if (!updateCol) return null;
        return (
          <Combobox
            value={updateCol.setStatus}
            onOptionSelect={(_, data) => {
              updateCol.setStatus = data.optionValue as string;
            }}
            disabled={updateCol.column.type === "Status" || updateCol.column.type === "State"}
          >
            {SetStatus.map((option, index) => (
              <Option key={index} value={option}>
                {option}
              </Option>
            ))}
          </Combobox>
        );
      },

      singleClickEdit: true,
    },
    { field: "onlyDifferent", headerName: "Only If Different", editable: true, cellEditor: "agCheckboxCellEditor" },
  ];

  return (
    <>
      {vm.updateCols.length > 0 ? (
        <div style={{ width: "100%", height: "94vh", flexBasis: 0 }}>
          <AgGridReact<UpdateColumn>
            theme={agTheme}
            rowData={vm.updateCols || []}
            defaultColDef={defaultColDef}
            columnDefs={cols}
            debug={true}
          />
        </div>
      ) : (
        <div style={{ padding: "20px" }}>No columns added for update. Please add columns to update.</div>
      )}
    </>
  );
});
