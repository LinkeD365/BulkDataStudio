import React from "react";
import { observer } from "mobx-react";

import { SelectionValue, ViewModel } from "../model/vm";
import { dvService } from "../utils/dataverseService";
import { UpdateColumn } from "../model/UpdateColumn";
import { Combobox, Option, Button, Label, Input, Checkbox } from "@fluentui/react-components";
import { SearchFilled } from "@fluentui/react-icons";
import { LookupDialog } from "./LookupDialog";
import { CalculatedValueEditor } from "./CalculatedValueEditor";

interface UpdateValueProps {
  dvSvc: dvService;
  vm: ViewModel;
  updateColumn: UpdateColumn;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const UpdateValue = observer((props: UpdateValueProps): React.JSX.Element => {
  const { updateColumn, dvSvc, vm, onLog } = props;
  const [selectValues, setPicklistValues] = React.useState<SelectionValue[]>([]);

  const [lookupPopupOpen, setLookupPopupOpen] = React.useState<boolean>(false);

  const onOptionSelected = (option: string) => {
    const selected = selectValues.find((v) => v.value === option);
    if (selected) {
      updateColumn.selectedSelections = [selected];
    }
    if (updateColumn.column.type === "State") {
      const status = vm.updateCols.find((col) => col.column.logicalName === "statuscode");
      const defaultStatusValue = selected?.defaultStatus?.toString();
      if (status && status.column && status.column.choiceValues && defaultStatusValue !== undefined) {
        const matchingStatus = status.column.choiceValues.find((cv) => cv.value === defaultStatusValue);
        if (matchingStatus) {
          status.selectedSelections = [matchingStatus];
        }
      }
    }
  };

  const setChoiceValues = () => {
    const choices = updateColumn.column.choiceValues || [];
    if (updateColumn.column.type === "Status") {
      const currentState = vm.updateCols.find((col) => col.column.logicalName === "statecode");
      if (currentState?.selectedSelections && currentState.selectedSelections.length > 0) {
        setPicklistValues(
          choices.filter((cv) => cv.parentState?.toString() === currentState!.selectedSelections![0]?.value),
        );
      } else {
        setPicklistValues([]);
      }
    } else {
      setPicklistValues(choices);
    }
  };

  React.useEffect(() => {
    // Get choices
    const getFieldParameters = async () => {
      switch (updateColumn.column?.type) {
        case "Picklist":
        case "State":
        case "Status":
          if (updateColumn.column.choiceValues && updateColumn.column.choiceValues.length > 0) {
            setChoiceValues();
            return;
          }
          const values = await dvSvc.getChoiceValues(vm.selectedTable?.logicalName || "", updateColumn.column);
          updateColumn.column.choiceValues = values;
          setChoiceValues();
          // Initialize selected items from field.selectedValues if available
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
      style={{ width: "100%" }}
      placeholder="Select Option"
      value={updateColumn.selectedSelections?.[0]?.label || ""}
      onOptionSelect={(_, data) => {
        onOptionSelected(data.optionValue || "");
      }}
      disabled={selectValues.length === 0}
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
            dvSvc={dvSvc}
            vm={vm}
            updateField={updateColumn}
            dialogOpen={lookupPopupOpen}
            onLog={onLog}
            onDialogClose={() => setLookupPopupOpen(false)}
          />
        </>
      )}
      {updateColumn.setStatus === "Calculated" && (
        <CalculatedValueEditor dvSvc={dvSvc} vm={vm} updateColumn={updateColumn} onLog={onLog} />
      )}
      {updateColumn.setStatus === "Touch" && (
        <Label style={{ fontStyle: "italic", opacity: 0.7 }}>Current value will be re-applied</Label>
      )}
    </div>
  );
});
