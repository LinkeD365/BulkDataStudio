import { observer } from "mobx-react";
import { View, ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverseService";
import {
  Combobox,
  ComboboxProps,
  Drawer,
  DrawerBody,
  DrawerHeader,
  Option,
  DrawerFooter,
  Button,
  Field,
  useComboboxFilter,
} from "@fluentui/react-components";
import React from "react";

interface BulkDataStudioProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const ViewSelector = observer((props: BulkDataStudioProps): React.JSX.Element => {
  const { dvSvc, vm, onLog } = props;
  const [views, setViews] = React.useState<Array<View>>([]);
  const [localSelectedView, setLocalSelectedView] = React.useState<View>(vm.selectedView!);
  const [query, setQuery] = React.useState<string>("");

  React.useEffect(() => {
    const loadTables = async () => {
      if (vm.viewSelectorOpen && vm.tables.length === 0) {
        await dvSvc
          .getTables()
          .then((tables) => {
            vm.tables = tables;
            onLog(`Loaded ${tables.length} tables`, "success");
          })
          .catch((error) => {
            onLog(`Error loading tables: ${error.message}`, "error");
          });
      }
    };
    loadTables();
  }, [vm.viewSelectorOpen, onLog]);

  React.useEffect(() => {
    const loadViews = async () => {
      if (vm.selectedTable) {
        setViews([]);

        setViews(await dvSvc.getViews(vm.selectedTable));
      }
    };
    loadViews();
  }, [vm.selectedTable]);

  React.useEffect(() => {
    const loadTableMeta = async () => {
      if (vm.selectedTable) {
        onLog(`Loading metadata for table: ${vm.selectedTable.displayName}`, "info");
        if (!vm.selectedTable.fields || vm.selectedTable.fields.length === 0) {
          const fields = await dvSvc.getFields(vm.selectedTable.logicalName);
          vm.selectedTable.fields = fields;
          onLog(`Loaded ${fields.length} fields for table: ${vm.selectedTable.displayName}`, "success");
        }
      }
    };
    loadTableMeta();
  }, [vm.selectedTable]);

  React.useEffect(() => {
    // Load view fieldNames from the xml when localSelectedView changes
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

  const onTableSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    vm.selectedTable = vm.tables.find((table) => table.logicalName === (data.optionValue as string));
    setQuery(vm.selectedTable?.displayName || "");
  };

  const onViewSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    setLocalSelectedView(views.find((view) => view.id === (data.optionValue as string))!);
  };

  const openSelectedView = () => {
    vm.selectedView = localSelectedView;
    vm.viewSelectorOpen = false;
    onLog(`Selected view: ${localSelectedView.label}`, "success");
  };

  const tablesList = vm.tables.map((table) => ({
    children: table.displayName,
    value: table.logicalName,
  }));
  const children = useComboboxFilter(query, tablesList, { noOptionsMessage: "No tables found" });
  return (
    <>
      <Drawer open={vm.viewSelectorOpen} onOpenChange={(_, data) => (vm.viewSelectorOpen = data.open)} size="medium">
        <DrawerHeader>Select a View</DrawerHeader>
        <DrawerBody>
          <div>
            <Field label="Table">
              <Combobox
                disabled={vm.tables.length === 0}
                onOptionSelect={onTableSelect}
                placeholder="Select a table"
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
              >
                {children}
              </Combobox>
            </Field>
            <Field label="View">
              <Combobox
                disabled={views.length === 0}
                onOptionSelect={onViewSelect}
                placeholder="Select a view"
                value={localSelectedView?.label || ""}
              >
                {views.map((view) => (
                  <Option key={view.id} text={view.label} value={view.id}>
                    {view.label}
                  </Option>
                ))}
              </Combobox>
            </Field>
            <div>{vm.selectedView?.fetchXml}</div>
          </div>
        </DrawerBody>
        <DrawerFooter style={{ display: "flex", width: "100%" }}>
          <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={openSelectedView}>
            Select
          </Button>
        </DrawerFooter>
      </Drawer>
    </>
  );
});
