import React from "react";
import { observer } from "mobx-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  Dropdown,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  SelectTabData,
  SelectTabEvent,
  Spinner,
  Tab,
  TabList,
  Text,
} from "@fluentui/react-components";
import { Add24Regular, Delete24Regular } from "@fluentui/react-icons";
import { CloneChildConfig, Column, Table, ViewModel } from "../model/vm";
import { ChildTableRelationship, dvService } from "../utils/dataverseService";
import { utilService } from "../utils/utils";

interface ClonePanelProps {
  vm: ViewModel;
  dvSvc: dvService;
  utils: utilService;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const ClonePanel = observer((props: ClonePanelProps): React.JSX.Element => {
  const { vm, dvSvc, utils, onLog } = props;
  const [loadingPanelData, setLoadingPanelData] = React.useState(false);
  const [cloning, setCloning] = React.useState(false);
  const [lookupFieldOptions, setLookupFieldOptions] = React.useState<Record<number, Column[]>>({});
  const [activeTab, setActiveTab] = React.useState<"exclude" | "children">("exclude");
  const [parentFieldQuery, setParentFieldQuery] = React.useState("");
  const [childTables, setChildTables] = React.useState<Table[]>([]);
  const [childRelationshipsByTable, setChildRelationshipsByTable] = React.useState<Record<string, string[]>>({});
  const [parentFieldsCache, setParentFieldsCache] = React.useState<Record<string, Column[]>>({});
  const [keyFieldsByTable, setKeyFieldsByTable] = React.useState<Record<string, string[]>>({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (!vm.clonePanelOpen || !vm.selectedTable) return;
    const selectedTable = vm.selectedTable;
    let isDisposed = false;

    (async () => {
      setLoadingPanelData(true);
      try {
        if (vm.tables.length === 0) {
          vm.tables = await dvSvc.getTables();
        }

        if (!selectedTable.fields || selectedTable.fields.length === 0) {
          selectedTable.fields = await dvSvc.getFields(selectedTable.logicalName);
        }
        setParentFieldsCache((prev) => ({ ...prev, [selectedTable.logicalName]: selectedTable.fields }));

        const parentKeyFields = await dvSvc.getAlternateKeyFieldNames(selectedTable.logicalName);
        setKeyFieldsByTable((prev) => ({ ...prev, [selectedTable.logicalName]: Array.from(parentKeyFields) }));

        const availableParentFieldNames = new Set(selectedTable.fields.map((f) => f.logicalName));
        vm.cloneSkippedFields = vm.cloneSkippedFields.filter(
          (f) => availableParentFieldNames.has(f) && !parentKeyFields.has(f),
        );

        const childRelationships = await dvSvc.getChildTableRelationships(selectedTable.logicalName);
        const relationshipMap = childRelationships.reduce(
          (acc, relationship: ChildTableRelationship) => {
            if (!acc[relationship.referencingEntity]) {
              acc[relationship.referencingEntity] = [];
            }
            if (!acc[relationship.referencingEntity].includes(relationship.referencingAttribute)) {
              acc[relationship.referencingEntity].push(relationship.referencingAttribute);
            }
            return acc;
          },
          {} as Record<string, string[]>,
        );
        if (!isDisposed) {
          setChildRelationshipsByTable(relationshipMap);
        }
        const childLogicalNames = Object.keys(relationshipMap);

        const resolvedChildTables = vm.tables.filter((t) => childLogicalNames.includes(t.logicalName));
        if (!isDisposed) {
          setChildTables(resolvedChildTables);
        }

        // Warm child table metadata in the background so dropdowns/field lists are ready when selected.
        void Promise.allSettled(
          resolvedChildTables.map(async (table) => {
            if (!table.fields || table.fields.length === 0) {
              table.fields = await dvSvc.getFields(table.logicalName);
            }
            const childKeyFields = await dvSvc.getAlternateKeyFieldNames(table.logicalName);
            if (!isDisposed) {
              setKeyFieldsByTable((prev) => ({ ...prev, [table.logicalName]: Array.from(childKeyFields) }));
            }
          }),
        );
      } catch (error: any) {
        const message = error && typeof error.message === "string" ? error.message : String(error);
        onLog(`Error preparing clone panel: ${message}`, "error");
      } finally {
        if (!isDisposed) {
          setLoadingPanelData(false);
        }
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [vm.clonePanelOpen, vm.selectedTable]);

  const parentFields = React.useMemo(() => {
    if (!vm.selectedTable) return [];
    const cachedParentFields = parentFieldsCache[vm.selectedTable.logicalName] || vm.selectedTable.fields || [];
    const parentKeySet = new Set(keyFieldsByTable[vm.selectedTable.logicalName] || []);
    return cachedParentFields.filter(
      (f) => f.logicalName !== vm.selectedTable?.primaryIdAttribute && !parentKeySet.has(f.logicalName),
    );
  }, [vm.selectedTable, vm.selectedTable?.fields, keyFieldsByTable, parentFieldsCache]);

  const filteredParentFields = React.useMemo(() => {
    const query = parentFieldQuery.trim().toLowerCase();
    if (!query) {
      return parentFields;
    }

    return parentFields.filter((field) => {
      const display = field.displayName.toLowerCase();
      const logical = field.logicalName.toLowerCase();
      return display.includes(query) || logical.includes(query);
    });
  }, [parentFields, parentFieldQuery]);

  const loadLookupFieldOptions = async (config: CloneChildConfig, index: number): Promise<void> => {
    if (!config.childTableLogicalName || !vm.selectedTable) {
      setLookupFieldOptions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    const childTable =
      childTables.find((t) => t.logicalName === config.childTableLogicalName) ||
      vm.tables.find((t) => t.logicalName === config.childTableLogicalName);
    if (!childTable) {
      setLookupFieldOptions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    if (!childTable.fields || childTable.fields.length === 0) {
      childTable.fields = await dvSvc.getFields(childTable.logicalName);
    }

    const childKeyFields = await dvSvc.getAlternateKeyFieldNames(childTable.logicalName);
    setKeyFieldsByTable((prev) => ({ ...prev, [childTable.logicalName]: Array.from(childKeyFields) }));

    const relationshipLookupNames = new Set(childRelationshipsByTable[childTable.logicalName] || []);
    let matchingLookups: Column[] = [];

    if (relationshipLookupNames.size > 0) {
      matchingLookups = childTable.fields.filter(
        (field) =>
          relationshipLookupNames.has(field.logicalName) &&
          (field.type === "Lookup" || field.type === "Owner" || field.type === "Customer"),
      );
    } else {
      const lookupCandidates = childTable.fields.filter((f) => f.type === "Lookup" || f.type === "Owner");

      for (const field of lookupCandidates) {
        try {
          if (!field.lookupTargetTable) {
            const targetLogicalName = await dvSvc.getLookupTargetTable(childTable.logicalName, field.logicalName);
            field.lookupTargetTable = vm.tables.find((t) => t.logicalName === targetLogicalName);
          }
          if (field.lookupTargetTable?.logicalName === vm.selectedTable.logicalName) {
            matchingLookups.push(field);
          }
        } catch (error: any) {
          onLog(
            `Unable to resolve lookup target for ${childTable.logicalName}.${field.logicalName}: ${error}`,
            "warning",
          );
        }
      }
    }

    setLookupFieldOptions((prev) => ({ ...prev, [index]: matchingLookups }));

    if (matchingLookups.length === 1) {
      config.setLookupField(matchingLookups[0].logicalName, matchingLookups[0].schemaName);
    } else if (
      config.parentLookupFieldLogicalName &&
      !matchingLookups.some((f) => f.logicalName === config.parentLookupFieldLogicalName)
    ) {
      config.setLookupField("");
    }
  };

  const addChildConfig = () => {
    vm.cloneChildConfigs.push(new CloneChildConfig());
  };

  const removeChildConfig = (index: number) => {
    vm.cloneChildConfigs.splice(index, 1);
    setLookupFieldOptions((prev) => {
      const updated: Record<number, Column[]> = {};
      Object.keys(prev)
        .map((k) => Number(k))
        .filter((k) => k !== index)
        .forEach((k) => {
          updated[k > index ? k - 1 : k] = prev[k];
        });
      return updated;
    });
  };

  const toggleParentSkip = (fieldLogicalName: string, checked: boolean) => {
    if (checked) {
      if (!vm.cloneSkippedFields.includes(fieldLogicalName)) {
        vm.cloneSkippedFields = [...vm.cloneSkippedFields, fieldLogicalName];
      }
      return;
    }
    vm.cloneSkippedFields = vm.cloneSkippedFields.filter((f) => f !== fieldLogicalName);
  };

  const toggleChildSkip = (config: CloneChildConfig, fieldLogicalName: string, checked: boolean) => {
    if (checked) {
      if (!config.excludedFields.includes(fieldLogicalName)) {
        config.setExcludedFields([...config.excludedFields, fieldLogicalName]);
      }
      return;
    }
    config.setExcludedFields(config.excludedFields.filter((f) => f !== fieldLogicalName));
  };

  const handleRunCloneClick = () => {
    setConfirmOpen(true);
  };

  const runClone = async () => {
    setConfirmOpen(false);
    if (!vm.selectedTable || vm.selectedRows.length === 0) {
      return;
    }

    setCloning(true);
    try {
      const result = await dvSvc.cloneData(
        vm.selectedTable,
        vm.selectedRows,
        vm.cloneSkippedFields,
        vm.cloneChildConfigs,
        vm.tables,
      );

      onLog(`Clone completed. Parent records: ${result.parentCloned}, Child records: ${result.childCloned}`, "success");

      await window.toolboxAPI.utils.showNotification({
        title: "Clone Completed",
        body: `Parent records cloned: ${result.parentCloned}. Child records cloned: ${result.childCloned}.`,
        type: "success",
      });

      vm.clonePanelOpen = false;
      await utils.delayLoadData(1000);
    } catch (error: any) {
      const message = error && typeof error.message === "string" ? error.message : String(error);
      onLog(`Clone failed: ${message}`, "error");
      await window.toolboxAPI.utils.showNotification({
        title: "Clone Failed",
        body: message,
        type: "error",
      });
    } finally {
      setCloning(false);
    }
  };

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value as "exclude" | "children");
  };

  return (
    <>
      <Drawer
        open={vm.clonePanelOpen}
        onOpenChange={(_, data) => (vm.clonePanelOpen = data.open)}
        size="medium"
        position="end"
      >
        <DrawerHeader style={{ paddingBottom: "8px" }}>
          <DrawerHeaderTitle>Clone Settings</DrawerHeaderTitle>
          <TabList selectedValue={activeTab} onTabSelect={onTabSelect} style={{ marginTop: "8px", width: "100%" }}>
            <Tab value="exclude">Exclude Fields</Tab>
            <Tab value="children">Child Tables</Tab>
          </TabList>
        </DrawerHeader>

        <DrawerBody>
          <div
            style={{
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {loadingPanelData ? (
              <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Spinner label="Loading clone configuration..." />
              </div>
            ) : (
              <>
                {activeTab === "exclude" && (
                  <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
                    <Text weight="semibold">Search Parent Fields</Text>
                    <Input
                      value={parentFieldQuery}
                      onChange={(_, data) => setParentFieldQuery(data.value)}
                      placeholder="Search by display or logical name"
                      style={{ marginTop: "8px" }}
                    />
                    <Text size={200} style={{ marginTop: "8px" }}>
                      {`${filteredParentFields.length} field(s) shown`}
                    </Text>
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        overflowY: "auto",
                        minHeight: 0,
                        flex: 1,
                      }}
                    >
                      {filteredParentFields.map((field) => {
                        const checked = vm.cloneSkippedFields.includes(field.logicalName);
                        return (
                          <div
                            key={field.logicalName}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              background: checked ? "rgba(255, 99, 71, 0.15)" : "transparent",
                            }}
                          >
                            <Checkbox
                              checked={checked}
                              onChange={(_, data) => toggleParentSkip(field.logicalName, !!data.checked)}
                              label={`${field.displayName} (${field.logicalName})`}
                            />
                          </div>
                        );
                      })}
                      {filteredParentFields.length === 0 && <Text size={200}>No fields match your search.</Text>}
                    </div>
                  </div>
                )}

                {activeTab === "children" && (
                  <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text weight="semibold">Child Tables</Text>
                      <Button icon={<Add24Regular />} onClick={addChildConfig}>
                        Add Child Table
                      </Button>
                    </div>

                    {vm.cloneChildConfigs.length === 0 ? (
                      <Text size={200}>No child tables added.</Text>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          overflowY: "auto",
                          minHeight: 0,
                        }}
                      >
                        {vm.cloneChildConfigs.map((config, index) => {
                          const selectedChildTable = vm.tables.find(
                            (t) => t.logicalName === config.childTableLogicalName,
                          );
                          const childFields = selectedChildTable?.fields || [];
                          const childKeySet = new Set(
                            selectedChildTable ? keyFieldsByTable[selectedChildTable.logicalName] || [] : [],
                          );
                          const lookupOptions = lookupFieldOptions[index] || [];
                          const selectedLookup = lookupOptions.find(
                            (f) => f.logicalName === config.parentLookupFieldLogicalName,
                          );
                          const selectedChildTableText = selectedChildTable
                            ? `${selectedChildTable.displayName || selectedChildTable.logicalName} (${selectedChildTable.logicalName})`
                            : config.childTableLogicalName || undefined;
                          const selectedLookupText = selectedLookup
                            ? `${selectedLookup.displayName || selectedLookup.logicalName} (${selectedLookup.logicalName})`
                            : config.parentLookupFieldLogicalName || undefined;
                          const visibleChildFields = childFields.filter(
                            (f) =>
                              f.logicalName !== selectedChildTable?.primaryIdAttribute &&
                              !childKeySet.has(f.logicalName),
                          );

                          return (
                            <div
                              key={`child-${index}`}
                              style={{
                                border: "1px solid var(--colorNeutralStroke2)",
                                borderRadius: "8px",
                                padding: "10px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Text weight="semibold">Child Table #{index + 1}</Text>
                                <Button
                                  appearance="subtle"
                                  icon={<Delete24Regular />}
                                  onClick={() => removeChildConfig(index)}
                                />
                              </div>

                              <Dropdown
                                placeholder="Select child table"
                                selectedOptions={config.childTableLogicalName ? [config.childTableLogicalName] : []}
                                button={<span>{selectedChildTableText || "Select child table"}</span>}
                                onOptionSelect={async (_, data) => {
                                  console.log("table:", childTables, "selected:", data.optionValue);
                                  const nextChildTable = data.optionValue || "";
                                  if (!nextChildTable || nextChildTable === config.childTableLogicalName) {
                                    return;
                                  }
                                  config.setChildTable(nextChildTable);
                                  config.setLookupField("");
                                  config.setExcludedFields([]);
                                  await loadLookupFieldOptions(config, index);
                                }}
                              >
                                {childTables.map((table) => (
                                  <Option
                                    key={table.logicalName}
                                    value={table.logicalName}
                                    text={`${table.displayName || table.logicalName} (${table.logicalName})`}
                                  >
                                    {table.displayName || table.logicalName}{" "}
                                    <Text size={100} style={{ color: "var(--colorNeutralForeground3)" }}>
                                      ({table.logicalName})
                                    </Text>
                                  </Option>
                                ))}
                                {childTables.length === 0 && (
                                  <Option disabled value="__no-child-tables">
                                    No related child tables available
                                  </Option>
                                )}
                              </Dropdown>

                              <Dropdown
                                placeholder="Select parent lookup field"
                                selectedOptions={
                                  config.parentLookupFieldLogicalName ? [config.parentLookupFieldLogicalName] : []
                                }
                                button={<span>{selectedLookupText || "Select parent lookup field"}</span>}
                                onOptionSelect={(_, data) => {
                                  const nextLookupField = data.optionValue || "";
                                  if (!nextLookupField) {
                                    return;
                                  }
                                  const selectedField = lookupOptions.find((f) => f.logicalName === nextLookupField);
                                  config.setLookupField(nextLookupField, selectedField?.schemaName);
                                }}
                                disabled={!config.childTableLogicalName}
                              >
                                {lookupOptions.map((field) => (
                                  <Option
                                    key={field.logicalName}
                                    value={field.logicalName}
                                    text={`${field.displayName || field.logicalName} (${field.logicalName})`}
                                  >
                                    {field.displayName || field.logicalName}
                                    <Text size={100} style={{ color: "var(--colorNeutralForeground3)" }}>
                                      ({field.logicalName})
                                    </Text>
                                  </Option>
                                ))}
                                {config.childTableLogicalName && lookupOptions.length === 0 && (
                                  <Option disabled value="__no-parent-lookups">
                                    No lookup field references the selected parent table
                                  </Option>
                                )}
                              </Dropdown>

                              <div>
                                <Text size={200} weight="semibold">
                                  Exclude Child Fields
                                </Text>
                                <div
                                  style={{
                                    marginTop: "6px",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "5px",
                                  }}
                                >
                                  {visibleChildFields.map((field) => {
                                    const checked = config.excludedFields.includes(field.logicalName);
                                    return (
                                      <div
                                        key={`${index}-${field.logicalName}`}
                                        style={{
                                          padding: "5px 6px",
                                          borderRadius: "6px",
                                          background: checked ? "rgba(255, 99, 71, 0.15)" : "transparent",
                                        }}
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onChange={(_, data) =>
                                            toggleChildSkip(config, field.logicalName, !!data.checked)
                                          }
                                          label={`${field.displayName || field.logicalName} (${field.logicalName})`}
                                        />
                                      </div>
                                    );
                                  })}
                                  {selectedChildTable && visibleChildFields.length === 0 && (
                                    <Text size={200}>
                                      No eligible child fields to exclude (primary and key fields are hidden).
                                    </Text>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerBody>

        <DrawerFooter style={{ display: "flex", flexDirection: "column", width: "100%", gap: "8px" }}>
          {vm.cloneSkippedFields.length === 0 && (
            <MessageBar intent="warning">
              <MessageBarBody>
                No fields are excluded - cloned records will be identical to the originals.
              </MessageBarBody>
            </MessageBar>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", width: "100%" }}>
            <Button appearance="secondary" onClick={() => (vm.clonePanelOpen = false)} disabled={cloning}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleRunCloneClick}
              disabled={
                cloning ||
                !vm.selectedTable ||
                vm.selectedRows.length === 0 ||
                loadingPanelData ||
                vm.cloneChildConfigs.some((cfg) => !!cfg.childTableLogicalName && !cfg.parentLookupFieldLogicalName)
              }
            >
              {cloning ? "Cloning..." : "Run Clone"}
            </Button>
          </div>
        </DrawerFooter>
      </Drawer>

      <Dialog
        open={confirmOpen}
        onOpenChange={(_, data) => {
          if (!data.open) setConfirmOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Clone</DialogTitle>
            <DialogContent>
              <Text block>
                Cloning will create new records in Dataverse.
                {vm.cloneSkippedFields.length === 0 && (
                  <Text block style={{ marginTop: "8px", fontWeight: "600" }}>
                    No fields are excluded - cloned records will be identical to the originals.
                  </Text>
                )}
              </Text>
              <Text block style={{ marginTop: "12px", color: "var(--colorStatusWarningForeground1)" }}>
                Warning: This operation may trigger any active Power Automate flows, plugins, or business rules
                configured on these tables.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={runClone}>
                Proceed
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
});
