import React from "react";
import { observer } from "mobx-react";
import { Column, ViewModel } from "../model/vm";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderNavigation,
  DrawerHeaderTitle,
  InputOnChangeData,
  Label,
  List,
  ListItem,
  SearchBox,
  SearchBoxChangeEvent,
  SelectionItemId,
  Switch,
} from "@fluentui/react-components";
import {
  BorderTopBottomThickRegular,
  CalendarLtrRegular,
  CheckmarkSquareRegular,
  CurrencyDollarEuroFilled,
  NumberSymbolSquareRegular,
  SlideSearchRegular,
  TextBaselineFilled,
  TextBulletListSquareSearchRegular,
} from "@fluentui/react-icons";
import { UpdateColumn } from "../model/UpdateColumn";
import { utilService } from "../utils/utils";

interface UpdateAddFieldProps {
  vm: ViewModel;
  utils: utilService;
}

function renderIcon(type: string = ""): React.JSX.Element {
  let icon: React.JSX.Element;
  switch (type) {
    case "Datetime":
      icon = <CalendarLtrRegular style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    case "String":
    case "Memo":
      icon = <TextBaselineFilled style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    case "Integer":
    case "Decimal":
      icon = <NumberSymbolSquareRegular style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    case "Money":
      icon = <CurrencyDollarEuroFilled style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    case "Lookup":
    case "Owner":
      icon = <SlideSearchRegular style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    case "Picklist":
    case "State":
    case "Status":
      icon = <TextBulletListSquareSearchRegular style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    case "Boolean":
      icon = <CheckmarkSquareRegular style={{ fontSize: "24px", verticalAlign: "Center" }} />;
      break;
    default:
      icon = <BorderTopBottomThickRegular style={{ fontSize: "24px", verticalAlign: "Center" }} />;
  }

  return icon;
}
export const UpdateAddField = observer((props: UpdateAddFieldProps): React.JSX.Element => {
  const { vm, utils } = props;
  const [onlyViewColumns, setOnlyViewColumns] = React.useState<boolean>(true);
  const [filteredColumns, setFilteredColumns] = React.useState<Array<Column>>(
    vm.selectedTable?.fields.filter((field) => !field.primaryKey) || [],
  );
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>(
    vm.updateCols.map((uf) => uf.column.logicalName),
  );

  React.useEffect(() => {
    selectedItems.forEach((itemId) => {
      const field = vm.selectedTable?.fields.find((f) => f.logicalName === itemId);
      if (field) {
        utils.getColumnAttributes(field);
      }
    });
  }, [selectedItems]);
  function selectFields(): void {
    const updateItems: UpdateColumn[] = [];
    selectedItems.forEach((itemId) => {
      const field = vm.selectedTable?.fields.find((f) => f.logicalName === itemId);
      if (field && !vm.updateCols.some((f) => f.column.logicalName === field.logicalName)) {
        utils.getColumnAttributes(field);
        updateItems.push(new UpdateColumn(field));
        if (
          field.type === "State" &&
          !updateItems.some((f) => f.column.logicalName === "statuscode") &&
          !vm.updateCols.some((f) => f.column.logicalName === "statuscode")
        ) {
          const statusField = vm.selectedTable?.fields.find((f) => f.logicalName === "statuscode");
          if (statusField) {
            updateItems.push(new UpdateColumn(statusField));
          }
        }
        if (
          field.type === "Status" &&
          !updateItems.some((f) => f.column.logicalName === "statecode") &&
          !vm.updateCols.some((f) => f.column.logicalName === "statecode")
        ) {
          const statusField = vm.selectedTable?.fields.find((f) => f.logicalName === "statecode");
          if (statusField) {
            updateItems.push(new UpdateColumn(statusField));
          }
        }
      } else updateItems.push(vm.updateCols.find((f) => f.column.logicalName === itemId)!);
    });
    vm.updateCols = updateItems;
    vm.updateFieldAddOpen = false;
  }

  React.useEffect(() => {
    if (vm.selectedTable?.fields.length != 0) {
      if (onlyViewColumns) {
        const onlyView =
          vm.selectedTable?.fields.filter(
            (field) => vm.selectedView?.fieldNames.includes(field.logicalName) && !field.primaryKey,
          ) || [];
        if (searchQuery && searchQuery.trim() !== "") {
          setFilteredColumns(
            onlyView.filter(
              (field) =>
                field.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                field.logicalName.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
          );
        } else {
          setFilteredColumns(onlyView);
        }
      } else {
        if (searchQuery && searchQuery.trim() !== "") {
          setFilteredColumns(
            (vm.selectedTable?.fields || []).filter(
              (field) =>
                !field.primaryKey &&
                (field.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  field.logicalName.toLowerCase().includes(searchQuery.toLowerCase())),
            ),
          );
        } else {
          setFilteredColumns(vm.selectedTable?.fields.filter((field) => !field.primaryKey) || []);
        }
      }
    }
  }, [onlyViewColumns, searchQuery]);

  function onSearchFields(_: SearchBoxChangeEvent, data: InputOnChangeData): void {
    setSearchQuery(data.value || "");
  }

  return (
    <>
      <Drawer
        open={vm.updateFieldAddOpen}
        onOpenChange={(_, data) => (vm.updateFieldAddOpen = data.open)}
        size="medium"
        position="end"
      >
        <DrawerHeader>
          <DrawerHeaderTitle>Add Field to Update</DrawerHeaderTitle>
          <DrawerHeaderNavigation>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Switch
                checked={onlyViewColumns}
                label={onlyViewColumns ? "View Columns Only" : "All Columns"}
                onChange={(_, data) => setOnlyViewColumns(data.checked ?? true)}
                labelPosition="after"
                style={{ marginLeft: "10px" }}
              />
              <SearchBox
                placeholder="Search Fields"
                onChange={onSearchFields}
                style={{ marginLeft: "auto", marginRight: "10px" }}
              />
            </div>
          </DrawerHeaderNavigation>
        </DrawerHeader>
        <DrawerBody>
          <List
            selectionMode="multiselect"
            onSelectionChange={(_, data) => setSelectedItems(data.selectedItems)}
            selectedItems={selectedItems}
          >
            {filteredColumns.map((field) => (
              <ListItem key={field.logicalName} value={field.logicalName}>
                {" "}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    border: "1px solid black",
                    padding: "4px",
                    margin: "4px",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  {renderIcon(field.type ?? "")}
                  <Label>{field.displayName}</Label>{" "}
                  <Label size="small" style={{ marginLeft: "4px" }}>
                    ({field.logicalName})
                  </Label>
                </div>
              </ListItem>
            ))}
          </List>
        </DrawerBody>
        <DrawerFooter>
          <Button style={{ marginLeft: "auto" }} appearance="primary" onClick={selectFields}>
            Select Fields
          </Button>
          <Button onClick={() => (vm.updateFieldAddOpen = false)}>Cancel</Button>
        </DrawerFooter>
      </Drawer>
    </>
  );
});
