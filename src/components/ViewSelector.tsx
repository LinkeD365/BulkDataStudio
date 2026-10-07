import { observer } from "mobx-react";
import { View, ViewModel } from "../model/vm";
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
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";

interface BulkDataStudioProps {
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

export const ViewSelector = observer(
  (props: BulkDataStudioProps): React.JSX.Element => {
    const { dvSvc, vm, onLog } = props;
    const [views, setViews] = React.useState<Array<View>>([]);
    const [localSelectedView, setLocalSelectedView] = React.useState<
      View | undefined
    >();
    const [localFetchXml, setLocalFetchXml] = React.useState<string>("");
    const [query, setQuery] = React.useState<string>(
      vm.selectedTable
        ? `${vm.selectedTable.displayName} (${vm.selectedTable.logicalName})`
        : "",
    );

    const formatXml = (xml: string): string | null => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        const parseError = doc.getElementsByTagName("parsererror")[0];
        if (parseError) {
          return null;
        }

        const serialized = new XMLSerializer().serializeToString(doc);
        const withBreaks = serialized.replace(/(>)(<)(\/*)/g, "$1\n$2$3");
        let pad = 0;

        return withBreaks
          .split("\n")
          .map((line) => {
            const isClosingTag = /^<\/.+>/.test(line);
            const isOpeningTag =
              /^<[^!?].*[^/]>$/.test(line) && !/^<[^!?].*\/>$/.test(line);

            if (isClosingTag) {
              pad = Math.max(pad - 1, 0);
            }

            const indent = "  ".repeat(pad);

            if (isOpeningTag) {
              pad += 1;
            }

            return `${indent}${line}`;
          })
          .join("\n");
      } catch {
        return null;
      }
    };

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
          if (
            !vm.selectedTable.fields ||
            vm.selectedTable.fields.length === 0
          ) {
            const fields = await dvSvc.getFields(vm.selectedTable.logicalName);
            vm.selectedTable.fields = fields;
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
            localFetchXml
              .match(/attribute\s+name\s*=\s*["']([^"']+)["']/g)
              ?.map((attr) => attr.match(/["']([^"']+)["']/)?.[1])
              .filter((x): x is string => x !== undefined) || [];
        }
      };
      loadViewMeta();
    }, [localSelectedView, localFetchXml]);

    React.useEffect(() => {
      if (localSelectedView) {
        const nextXml = localSelectedView.fetchXml || "";
        const formatted = formatXml(nextXml);
        setLocalFetchXml(formatted || nextXml);
      } else {
        setLocalFetchXml("");
      }
    }, [localSelectedView]);

    const onTableSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
      if (!data.optionValue) {
        if (
          vm.updateCols.length > 0 &&
          !window.confirm(
            "Changing the table will clear the fields in the Fields to update list. Continue?",
          )
        ) {
          setQuery(
            vm.selectedTable
              ? `${vm.selectedTable.displayName} (${vm.selectedTable.logicalName})`
              : "",
          );
          return;
        }

        vm.updateCols = [];
        vm.selectedTable = undefined;
        vm.selectedView = undefined;
        vm.fetchXml = "";
        vm.fetchFields = [];
        vm.selectedRows = [];
        vm.data = [];
        setViews([]);
        setLocalSelectedView(undefined);
        setLocalFetchXml("");
        setQuery("");
        return;
      }

      const selectedTable = vm.tables.find(
        (table) => table.logicalName === data.optionValue,
      );
      if (!selectedTable || selectedTable === vm.selectedTable) return;
      if (
        vm.updateCols.length > 0 &&
        !window.confirm(
          "Changing the table will clear the fields in the Fields to update list. Continue?",
        )
      ) {
        setQuery(
          vm.selectedTable
            ? `${vm.selectedTable.displayName} (${vm.selectedTable.logicalName})`
            : "",
        );
        return;
      }
      vm.updateCols = [];
      vm.selectedTable = selectedTable;
      vm.selectedView = undefined;
      vm.fetchXml = "";
      vm.fetchFields = [];
      vm.selectedRows = [];
      vm.data = [];
      setLocalSelectedView(undefined);
      setLocalFetchXml("");
      setQuery(`${selectedTable.displayName} (${selectedTable.logicalName})`);
    };

    const onViewSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
      setLocalSelectedView(
        views.find((view) => view.id === (data.optionValue as string))!,
      );
    };

    const openSelectedView = () => {
      if (localSelectedView) {
        const queryChanged =
          vm.selectedView?.id !== localSelectedView.id ||
          vm.selectedView.fetchXml !== localFetchXml ||
          !!vm.fetchXml;
        if (
          queryChanged &&
          vm.updateCols.length > 0 &&
          !window.confirm(
            "Changing the data query will clear the fields in the Fields to update list. Continue?",
          )
        ) {
          return;
        }
        if (queryChanged) {
          vm.updateCols = [];
        }
        localSelectedView.fetchXml = localFetchXml;
        vm.selectedView = localSelectedView;
        vm.fetchXml = "";
        vm.fetchFields = [];
        vm.viewSelectorOpen = false;
        onLog(`Selected view: ${localSelectedView.label}`, "success");
      }
    };

    const tablesList = vm.tables.map((table) => ({
      children: `${table.displayName} (${table.logicalName})`,
      value: table.logicalName,
    }));
    const children = useComboboxFilter(query, tablesList, {
      noOptionsMessage: "No tables found",
    });
    return (
      <>
        <Drawer
          open={vm.viewSelectorOpen}
          onOpenChange={(_, data) => (vm.viewSelectorOpen = data.open)}
          size="medium"
        >
          <DrawerHeader>Select a View</DrawerHeader>
          <DrawerBody>
            <div>
              <Field label="Table">
                <Combobox
                  clearable
                  disabled={vm.tables.length === 0}
                  onOptionSelect={onTableSelect}
                  placeholder="Select a table"
                  value={query}
                  selectedOptions={
                    vm.selectedTable ? [vm.selectedTable.logicalName] : []
                  }
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
              <Field label="FetchXML">
                <Editor
                  value={localFetchXml}
                  onValueChange={(value) => {
                    if (localSelectedView) {
                      setLocalFetchXml(value);
                    }
                  }}
                  highlight={(code) =>
                    Prism.highlight(code, Prism.languages.markup, "markup")
                  }
                  padding={12}
                  className={`fetchxml-editor${!localSelectedView ? " fetchxml-editor--disabled" : ""}`}
                  preClassName="fetchxml-editor__pre"
                  textareaClassName="fetchxml-editor__textarea"
                />
              </Field>
            </div>
          </DrawerBody>
          <DrawerFooter style={{ display: "flex", width: "100%" }}>
            <Button
              style={{ marginLeft: "auto" }}
              appearance="primary"
              onClick={openSelectedView}
            >
              Select
            </Button>
          </DrawerFooter>
        </Drawer>
      </>
    );
  },
);
