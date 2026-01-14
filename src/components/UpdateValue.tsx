import React from "react";
import { observer } from "mobx-react";

import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverseService";
import { UpdateField } from "../model/update";
import {
  Combobox,
  Option,
  List,
  ListItem,
  SelectionItemId,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Label,
} from "@fluentui/react-components";
import { SearchFilled } from "@fluentui/react-icons";
import { LookupDialog } from "./LookupDialog";

interface UpdateValueProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  field: UpdateField;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const UpdateValue = observer((props: UpdateValueProps): React.JSX.Element => {
  const { connection, field, dvSvc, vm, onLog } = props;
  const [selectValues, setPicklistValues] = React.useState<string[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>([]);
  const [lookupPopupOpen, setLookupPopupOpen] = React.useState<boolean>(false);
  React.useEffect(() => {
    console.log("Field changed:", field);
    const loadPicklistValues = async () => {
      if (field.field?.type === "Picklist") {
        console.log("Loading picklist values for field:", field.field.logicalName);
        const values = await dvSvc.getChoiceValues(vm.selectedTable?.logicalName || "", field.field.logicalName);
        field.field.choiceValues = values;
        setPicklistValues(values.map((cv) => cv.label));
        // Initialize selected items from field.selectedValues if available
        if (field.selectedValues && field.selectedValues.length > 0) {
          setSelectedItems(field.selectedValues);
        }
      }
    };
    loadPicklistValues();
  }, [field.field, dvSvc, vm.selectedTable?.logicalName]);

  const pickList = (
    <Combobox
      style={{ minWidth: "unset", width: "100%" }}
      placeholder="Select Option"
      value={field.selectedValues?.[0] || ""}
      onOptionSelect={(_, data) => {
        setSelectedItems(data.selectedOptions);
        field.selectedValues = data.selectedOptions;
      }}
    >
      {selectValues.map((value, index) => (
        <Option key={index} value={value}>
          {value}
        </Option>
      ))}
    </Combobox>
    // <List
    //   aria-label="Picklist Values"
    //   selectionMode="single"
    //   style={{ maxHeight: "200px", overflowY: "auto" }}
    //   selectedItems={selectedItems}
    //   onSelectionChange={(_e, data) => setSelectedItems(data.selectedItems)}
    // >
    //   {selectValues.map((value, index) => (
    //     <ListItem key={index} value={value}>
    //       {value}
    //     </ListItem>
    //   ))}
    // </List>
  );

  const lookupSelection = (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Label>{field.selectionValues?.[0]?.label}</Label>
      <div style={{ marginLeft: "auto" }}>
        <Button icon={<SearchFilled />} onClick={() => setLookupPopupOpen(true)}></Button>{" "}
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      {field.field.type === "Picklist" && pickList}
      {field.field.type === "String" && <div>String Editor</div>}
      {field.field.type === "Boolean" && <div>Boolean Editor</div>}
      {field.field.type === "Lookup" && lookupSelection}
      <LookupDialog
        connection={connection}
        dvSvc={dvSvc}
        vm={vm}
        updateField={field}
        dialogOpen={lookupPopupOpen}
        onLog={onLog}
        onDialogClose={() => setLookupPopupOpen(false)}
      />
    </div>
  );
});
