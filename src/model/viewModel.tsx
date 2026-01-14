import { makeAutoObservable } from "mobx";
import { UpdateField } from "./update";

export class ViewModel {
  viewSelectorOpen: boolean = false;
  tables: Table[] = [];
  selectedTable?: Table;
  selectedView?: View;
  updateFieldAddOpen: boolean = false;

  updateFields: UpdateField[] = [];
  constructor() {
    makeAutoObservable(this);
  }
}

export class Table {
  logicalName: string;
  displayName: string;
  id: string;
  typeCode: number;
  fields: Field[] = [];
  views: View[] = [];
  primaryIdAttribute: string;
  primaryNameAttribute: string;

  constructor(
    logicalName: string,
    displayName: string,
    id: string,
    typeCode: number,
    primaryIdAttribute?: string,
    primaryNameAttribute?: string
  ) {
    this.logicalName = logicalName;
    this.displayName = displayName;
    this.id = id;
    this.typeCode = typeCode;
    this.primaryIdAttribute = primaryIdAttribute!;
    this.primaryNameAttribute = primaryNameAttribute!;
  }
}

export class View {
  id: string;
  label: string;
  fetchXml: string;
  fieldNames: string[] = [];

  constructor(id: string, label: string, fetchXml: string) {
    this.id = id;
    this.label = label;
    this.fetchXml = fetchXml;
  }
}

export class Field {
  logicalName: string;
  displayName: string;
  type: string;
  primaryKey: boolean = false;
  choiceValues: SelectionValue[] = [];
  lookupTargetTable?: Table;

  constructor(logicalName: string, displayName: string, type: string) {
    this.logicalName = logicalName;
    this.displayName = displayName;
    this.type = type;
  }
}

export class SelectionValue {
  label: string;
  value: string;
  constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }
}
