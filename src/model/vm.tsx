import { makeAutoObservable, makeObservable, observable, action } from "mobx";
import { UpdateColumn } from "./UpdateColumn";

let _cloneChildConfigCounter = 0;

export class ViewModel {
  viewSelectorOpen: boolean = false;
  tables: Table[] = [];
  selectedTable?: Table;
  selectedView?: View;
  updateFieldAddOpen: boolean = false;
  selectedRows: SelectionValue[] = [];
  updateCols: UpdateColumn[] = [];
  data?: Array<any>;
  isDataLoading: boolean = false;
  updateDialogOpen: boolean = false;
  touchDialogOpen: boolean = false;
  deleteDialogOpen: boolean = false;
  fetchXmlEditorOpen: boolean = false;
  fetchXml?: string;
  fetchFields: string[] = [];
  clonePanelOpen: boolean = false;
  cloneSkippedFields: string[] = [];
  cloneChildConfigs: CloneChildConfig[] = [];
  constructor() {
    makeAutoObservable(this);
  }
}

export class CloneChildConfig {
  readonly id: string = `clone-child-${++_cloneChildConfigCounter}`;
  childTableLogicalName: string = "";
  parentLookupFieldLogicalName: string = "";
  parentLookupFieldSchemaName: string = "";
  excludedFields: string[] = [];
  childConfigs: CloneChildConfig[] = [];

  constructor(init?: Partial<CloneChildConfig>) {
    makeObservable(this, {
      childTableLogicalName: observable,
      parentLookupFieldLogicalName: observable,
      parentLookupFieldSchemaName: observable,
      excludedFields: observable,
      childConfigs: observable,
      setChildTable: action,
      setLookupField: action,
      setExcludedFields: action,
      setChildConfigs: action,
      addChildConfig: action,
      removeChildConfig: action,
    });
    Object.assign(this, init);
  }

  setChildTable(value: string) {
    this.childTableLogicalName = value;
  }
  setLookupField(value: string, schemaName?: string) {
    this.parentLookupFieldLogicalName = value;
    this.parentLookupFieldSchemaName = schemaName || value;
  }
  setExcludedFields(value: string[]) {
    this.excludedFields = value;
  }

  setChildConfigs(value: CloneChildConfig[]) {
    this.childConfigs = value;
  }

  addChildConfig(config?: CloneChildConfig) {
    this.childConfigs.push(config || new CloneChildConfig());
  }

  removeChildConfig(config: CloneChildConfig) {
    this.childConfigs = this.childConfigs.filter((item) => item !== config);
  }
}

export class Table {
  logicalName: string;
  displayName: string;
  id: string;
  typeCode: number;
  fields: Column[] = [];
  views: View[] = [];
  primaryIdAttribute: string;
  primaryNameAttribute: string;
  setName: string;

  constructor(
    logicalName: string,
    displayName: string,
    id: string,
    typeCode: number,
    primaryIdAttribute: string,
    primaryNameAttribute: string,
    setName: string,
  ) {
    this.logicalName = logicalName;
    this.displayName = displayName;
    this.id = id;
    this.typeCode = typeCode;
    this.primaryIdAttribute = primaryIdAttribute;
    this.primaryNameAttribute = primaryNameAttribute;
    this.setName = setName;
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

export class Column {
  logicalName: string;
  schemaName: string;
  isCustom: boolean;
  displayName: string;
  type: string;
  primaryKey: boolean;
  isValidForCreate: boolean;
  choiceValues?: SelectionValue[];
  lookupTargetTable?: Table;
  minValue?: number;
  maxValue?: number;
  precision?: number;
  maxLength?: number;
  format?: string;

  constructor(
    logicalName: string,
    displayName: string,
    type: string,
    primaryKey: boolean = false,
    schemaName?: string,
    isCustom: boolean = false,
    isValidForCreate: boolean = true,
  ) {
    this.logicalName = logicalName;
    this.schemaName = schemaName || logicalName;
    this.isCustom = isCustom;
    this.displayName = displayName;
    this.type = type;
    this.primaryKey = primaryKey;
    this.isValidForCreate = isValidForCreate;
  }

  get dataName(): string {
    switch (this.type) {
      case "Lookup":
      case "Owner":
        return `_${this.logicalName}_value@OData.Community.Display.V1.FormattedValue`;
      case "Picklist":
      case "State":
      case "Status":
        return `${this.logicalName}@OData.Community.Display.V1.FormattedValue`;
      default:
        return this.logicalName;
    }
  }
}

export class SelectionValue {
  label: string;
  value: string;
  defaultStatus?: number;
  parentState?: number;
  ownerTable?: string;
  constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }
}
