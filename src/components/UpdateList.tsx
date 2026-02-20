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
import { Button, Dropdown, Option } from "@fluentui/react-components";
import {
  Pin20Regular,
  Calculator20Regular,
  DismissCircle20Regular,
  HandPoint20Regular,
  Delete20Regular,
} from "@fluentui/react-icons";

const statusIcons: Record<string, React.JSX.Element> = {
  Fixed: <Pin20Regular />,
  Calculated: <Calculator20Regular />,
  Touch: <HandPoint20Regular />,
  "Set Null": <DismissCircle20Regular />,
};

const ActionDropdown = observer(({ updateCol }: { updateCol: UpdateColumn }): React.JSX.Element => {
  return (
    <div style={{ width: "100%" }}>
      <Dropdown
        style={{ width: "100%" }}
        value={updateCol.setStatus}
        selectedOptions={[updateCol.setStatus]}
        button={
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {statusIcons[updateCol.setStatus]}
            {updateCol.setStatus}
          </span>
        }
        onOptionSelect={(_, data) => {
          updateCol.setStatus = data.optionValue as string;
        }}
        disabled={updateCol.column.type === "Status" || updateCol.column.type === "State"}
      >
        {SetStatus.map((option, index) => (
          <Option key={index} value={option} text={option}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {statusIcons[option]}
              {option}
            </span>
          </Option>
        ))}
      </Dropdown>
    </div>
  );
});

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
  autoHeight: true,
  width: 100,
};

export const UpdateList = observer((props: UpdateListProps): React.JSX.Element => {
  const { dvSvc, vm, onLog } = props;

  const cols: ColDef<UpdateColumn>[] = [
    { field: "column.displayName", headerName: "Field Name", flex: 2 },
    {
      field: "newValue",
      headerName: "New Value",
      flex: 2,
      cellRenderer: (params: CustomCellRendererProps<UpdateColumn>) =>
        params.data ? <UpdateValue updateColumn={params.data} dvSvc={dvSvc} vm={vm} onLog={onLog} /> : null,
    },
    {
      field: "setStatus",
      headerName: "Action",
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: CustomCellRendererProps<UpdateColumn>) => {
        const updateCol = params.data;
        if (!updateCol) return null;
        return <ActionDropdown updateCol={updateCol} />;
      },

      singleClickEdit: true,
    },
    {
      field: "onlyDifferent",
      headerName: "Only If Different",
      editable: true,
      cellEditor: "agCheckboxCellEditor",
      flex: 1,
    },
    {
      headerName: "",
      width: 50,
      maxWidth: 50,
      flex: 0,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: CustomCellRendererProps<UpdateColumn>) => {
        if (!params.data) return null;
        return (
          <Button
            appearance="subtle"
            icon={<Delete20Regular />}
            size="small"
            onClick={() => {
              vm.updateCols = vm.updateCols.filter((c) => c !== params.data);
            }}
          />
        );
      },
    },
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
