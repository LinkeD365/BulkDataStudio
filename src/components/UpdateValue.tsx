import React from "react";
import { observer } from "mobx-react";

import { SelectionValue, ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverseService";
import { SetStatus, UpdateColumn } from "../model/UpdateColumn";
import { Combobox, Option, SelectionItemId, Button, Label, Input, Checkbox } from "@fluentui/react-components";
import { SearchFilled } from "@fluentui/react-icons";
import { LookupDialog } from "./LookupDialog";

interface UpdateValueProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  updateColumn: UpdateColumn;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const UpdateValue = observer((props: UpdateValueProps): React.JSX.Element => {
  const { connection, updateColumn, dvSvc, vm, onLog } = props;
  const [selectValues, setPicklistValues] = React.useState<SelectionValue[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>([]);
  const [lookupPopupOpen, setLookupPopupOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Get choices

    const getFieldParameters = async () => {
      switch (updateColumn.column?.type) {
        case "Picklist":
        case "State":
        case "Status":
          if (updateColumn.column.choiceValues && updateColumn.column.choiceValues.length > 0) {
            setPicklistValues(updateColumn.column.choiceValues);
            return;
          }
          const values = await dvSvc.getChoiceValues(
            vm.selectedTable?.logicalName || "",
            updateColumn.column.logicalName
          );
          updateColumn.column.choiceValues = values;
          setPicklistValues(values);
          // Initialize selected items from field.selectedValues if available
          if (updateColumn.selectedSelections && updateColumn.selectedSelections.length > 0) {
            setSelectedItems(updateColumn.selectedSelections.map((sel) => sel.value));
          }
          break;
        case "Money":
        case "Double":
        case "Integer":
        case "BigInt":
        case "Decimal":
          if (updateColumn.column.minValue === undefined || updateColumn.column.maxValue === undefined) {
            await dvSvc.getNumericFieldLimits(updateColumn.column, vm.selectedTable?.logicalName || "");
          }
          break;
        default:
          return;
      }
    };
    getFieldParameters();
  }, [updateColumn.column, dvSvc, vm.selectedTable?.logicalName]);

  const pickList = (
    <Combobox
      style={{ minWidth: "unset", width: "100%" }}
      placeholder="Select Option"
      value={updateColumn.selectedSelections?.[0]?.label || ""}
      onOptionSelect={(_, data) => {
        setSelectedItems(data.selectedOptions);
        updateColumn.selectedSelections =
          updateColumn.column.choiceValues?.filter((cv) => data.selectedOptions.includes(cv.value)) || [];
      }}
    >
      {selectValues.map((value, index) => (
        <Option key={index} value={value.value}>
          {value.label}
        </Option>
      ))}
    </Combobox>
  );

  const stringEditor = (
    <div style={{ width: "100%" }}>
      <Input
        value={updateColumn.newValue}
        maxLength={updateColumn.column.maxLength}
        onChange={(e) => (updateColumn.newValue = e.target.value)}
      ></Input>
    </div>
  );
  const booleanEditor = (
    <div style={{ width: "100%" }}>
      <Checkbox
        checked={updateColumn.newValue === true}
        onChange={(_, data) => (updateColumn.newValue = data.checked)}
      ></Checkbox>
    </div>
  );

  const lookupSelection = (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Label>{updateColumn.selectedSelections?.[0]?.label}</Label>
      <div style={{ marginLeft: "auto" }}>
        <Button icon={<SearchFilled />} onClick={() => setLookupPopupOpen(true)}></Button>{" "}
      </div>
    </div>
  );

  const numberEditor = (
    <div style={{ width: "100%" }}>
      <Input
        type="number"
        value={updateColumn.newValue}
        min={updateColumn.column.minValue}
        max={updateColumn.column.maxValue}
        step={updateColumn.column.precision ? 1 / Math.pow(10, updateColumn.column.precision) : 1}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          const min = updateColumn.column.minValue ?? -Infinity;
          const max = updateColumn.column.maxValue ?? Infinity;
          if (newVal >= min && newVal <= max) {
            updateColumn.newValue = e.target.value;
          }
        }}
      ></Input>
    </div>
  );

  const dateTimeEditor = (
    <div style={{ width: "100%" }}>
      <Input
        value={updateColumn.newValue}
        type={
          updateColumn.column.format === "DateOnly"
            ? "date"
            : updateColumn.column.format === "TimeOnly"
            ? "time"
            : "datetime-local"
        }
        onChange={(e) => (updateColumn.newValue = e.target.value)}
      ></Input>
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      {updateColumn.setStatus === "Fixed" && (
        <>
          {(updateColumn.column.type === "Picklist" ||
            updateColumn.column.type === "State" ||
            updateColumn.column.type === "Status") &&
            pickList}
          {(updateColumn.column.type === "String" || updateColumn.column.type === "Memo") && stringEditor}
          {updateColumn.column.type === "Boolean" && booleanEditor}
          {(updateColumn.column.type === "Money" ||
            updateColumn.column.type === "Double" ||
            updateColumn.column.type === "Integer" ||
            updateColumn.column.type === "BigInt" ||
            updateColumn.column.type === "Decimal") &&
            numberEditor}
          {updateColumn.column.type === "DateTime" && dateTimeEditor}
          {(updateColumn.column.type === "Lookup" ||
            updateColumn.column.type === "Customer" ||
            updateColumn.column.type === "Owner") &&
            lookupSelection}
          <LookupDialog
            connection={connection}
            dvSvc={dvSvc}
            vm={vm}
            updateField={updateColumn}
            dialogOpen={lookupPopupOpen}
            onLog={onLog}
            onDialogClose={() => setLookupPopupOpen(false)}
          />
        </>
      )}
    </div>
  );
});
