import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverseService";
import { Drawer, DrawerBody, DrawerHeader, List, ListItem } from "@fluentui/react-components";
import { SetStatus } from "../model/update";

interface UpdateAddFieldProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const UpdateAddField = observer((props: UpdateAddFieldProps): React.JSX.Element => {
  const { connection, dvSvc, vm, onLog } = props;
  return (
    <>
      <Drawer
        open={vm.updateFieldAddOpen}
        onOpenChange={(_, data) => (vm.updateFieldAddOpen = data.open)}
        size="medium"
        position="end"
      >
        <DrawerHeader>Add Field to Update</DrawerHeader>
        <DrawerBody>
          <List>
            {vm.selectedTable?.fields.map((field) => (
              <ListItem
                key={field.logicalName}
                value={field.logicalName}
                onClick={() => {
                    
                  const fieldExists = vm.updateFields.some((f) => f.field.logicalName === field.logicalName);
                  if (!fieldExists) {
                    vm.updateFields = [
                      ...vm.updateFields,
                      {
                        field: field,
                        setStatus: "Fixed",
                        onlyDifferent: false,
                      },
                    ];
                  }
                }}
              >
                {field.displayName} ({field.logicalName})
              </ListItem>
            ))}
          </List>
        </DrawerBody>
      </Drawer>
    </>
  );
});
