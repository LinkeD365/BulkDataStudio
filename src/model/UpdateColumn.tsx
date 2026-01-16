import { makeAutoObservable } from "mobx";
import { Column, SelectionValue } from "./vm";

export class UpdateColumn {
  column: Column;
  newValue?: any;
  oldSelValues?: string[] = [];
  setStatus: string = "Fixed";
  onlyDifferent: boolean = false;
  selectedSelections?: SelectionValue[] = [];

  constructor(column: Column) {
    this.column = column;
    makeAutoObservable(this);
  }

  get formattedNewValue(): string {
    if (this.column.type === "Picklist" || this.column.type === "State" || this.column.type === "Status") {
      return this.oldSelValues ? this.oldSelValues.join(", ") : "";
    }
    return this.newValue !== undefined && this.newValue !== null ? String(this.newValue) : "";
  }

  get isValid(): boolean {
    if (this.setStatus === "Fixed") {
      if (
        this.column.type === "Picklist" ||
        this.column.type === "State" ||
        this.column.type === "Status" ||
        this.column.type === "Lookup" ||
        this.column.type === "Owner"
      ) {
        return this.selectedSelections !== undefined && this.selectedSelections.length > 0;
      } else {
        return this.newValue !== undefined && this.newValue !== null && this.newValue !== "";
      }
    }
    return true;
  }

  get dbValue(): any {
    if (this.setStatus === "Fixed") {
      switch (this.column.type) {
        case "Lookup":
        case "Owner":
          return `/${this.column.lookupTargetTable?.setName}(${this.selectedSelections?.[0].value})`;
        case "Picklist":
        case "State":
        case "Status":
          return this.selectedSelections?.[0].value;
        default:
          return this.newValue;
      }
    } else {
      return null;
    }
  }

  get dbField(): string {
    switch (this.column.type) {
      case "Lookup":
      case "Owner":
        return this.setStatus === "Fixed" ? this.column.logicalName + "@odata.bind" : this.column.logicalName;
      default:
        return this.column.logicalName;
    }
  }
}

export const SetStatus: string[] = ["Fixed", "Set Null"];
