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
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const DataGrid = observer((props: DataGridProps): React.JSX.Element => {
  const { connection, vm, utils, onLog } = props;

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
    console.log("useEffect for loadData with selectedView");
    if (utils && vm.selectedView && connection) utils.loadData();
  }, [connection, utils, vm.selectedView]);

  React.useEffect(() => {
    (async () => {
      vm.isDataLoading = true;
      if (utils && vm.fetchXml) {
        if (vm.tables.length === 0) {
          await utils.dvSvc
            .getTables()
            .then((tables) => {
              vm.tables = tables;
              onLog(`Loaded ${tables.length} tables`, "success");
            })
            .catch((error) => {
              onLog(`Error loading tables: ${error.message}`, "error");
            });
        }
        // Extract table name from fetchXml
        const tableMatch = vm.fetchXml.match(/<entity\s+name=['"]([^'"]+)['"]/);
        if (tableMatch && tableMatch[1]) {
          const tableName = tableMatch[1];
          const selectedTable = vm.tables?.find((t) => t.logicalName === tableName);
          if (selectedTable) {
            vm.selectedTable = selectedTable;
            if (!vm.selectedTable.fields || vm.selectedTable.fields.length === 0) {
              await utils.dvSvc
                .getFields(vm.selectedTable.logicalName)
                .then((fields) => {
                  vm.selectedTable!.fields = fields;
                  onLog(`Loaded ${fields.length} fields for table: ${tableName}`, "success");
                })
                .catch((error) => {
                  onLog(`Error loading fields for table ${tableName}: ${error.message}`, "error");
                });
            }
          }
        }
        // Extract attributes from fetchXml
        const attributeMatches = vm.fetchXml.match(/<attribute\s+name=['"]([^'"]+)['"]/g);
        if (attributeMatches) {
          vm.fetchFields = attributeMatches
            .map((attr) => {
              const nameMatch = attr.match(/name=['"]([^'"]+)['"]/);
              return nameMatch ? nameMatch[1] : "";
            })
            .filter((name) => name !== "");
        }

        await utils.loadData().catch(async (error: any) => {
          await window.toolboxAPI.utils.showNotification({
            title: "Error loading data",
            body: `Error loading data: ${error.message}`,
            type: "error",
          });
          onLog(`Error loading data: ${error.message}`, "error");
        });
      }
      vm.isDataLoading = false;
    })();
  }, [vm.fetchXml]);

  const cols = React.useMemo(() => {
    console.log(vm);
    if ((!vm.selectedView && !vm.fetchXml) || !vm.selectedTable || vm.selectedTable.fields === undefined) {
      console.log(!vm.selectedView, !vm.fetchXml, !vm.selectedTable, vm.selectedTable?.fields === undefined);
      return [];
    }

    if (vm.fetchXml) {
      console.log("Using fetchXml to determine columns");
      // If no fieldNames in the view, but we have FetchXML, extract fields from FetchXML
      return (
        vm.fetchFields
          .filter((fieldName) => fieldName !== vm.selectedTable?.primaryIdAttribute)
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
    }
    console.log("Using selectedView to determine columns", vm.selectedView?.fieldNames);
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
  }, [vm.selectedView, vm.selectedTable, vm.fetchXml, vm.fetchFields, vm.data]);

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    wrapText: true,
    autoHeight: true,
    width: 100,
  };

  const rowSelection = React.useMemo<RowSelectionOptions | "single" | "multiple">(() => {
    return {
      mode: "multiRow",
    };
  }, []);
  return (
    <>
      {vm.data && vm.data.length > 0 ? (
        <div style={{ width: "100%", height: "94vh" }}>
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
      ) : (
        <div style={{ padding: "20px" }}>No data to display. Please select "Fetch Data" to load data.</div>
      )}
    </>
  );
});
