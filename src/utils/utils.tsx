import { Column, ViewModel } from "../model/vm";
import { dvService } from "./dataverseService";

interface utilsProps {
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export class utilService {
  dvSvc: dvService;
  vm: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: utilsProps) {
    this.dvSvc = props.dvSvc;
    this.vm = props.vm;
    this.onLog = props.onLog;
  }

  async loadData(): Promise<void> {
    if (this.vm.selectedView) {
      this.onLog(`Loading data for view: ${this.vm.selectedView.label}`, "info");
      const data = await this.dvSvc.loadData(this.vm.selectedView.fetchXml);
      this.vm.data = data;
      this.onLog(`Loaded ${data.length} records from view: ${this.vm.selectedView.label}`, "success");
    } else if (this.vm.fetchXml) {
      const fetchXml = this.vm.fetchXml;
      const document = new DOMParser().parseFromString(fetchXml, "application/xml");
      const root = document.documentElement;
      const entities = Array.from(root.children).filter(
        (element) => element.tagName === "entity",
      );
      const entity = entities[0];
      const tableName = entity?.getAttribute("name");
      if (
        document.getElementsByTagName("parsererror").length > 0 ||
        root.tagName !== "fetch" ||
        entities.length !== 1 ||
        !tableName
      ) {
        throw new Error("Invalid FetchXML: expected a <fetch> root with one named <entity>.");
      }

      this.vm.selectedRows = [];
      if (this.vm.tables.length === 0) {
        this.vm.tables = await this.dvSvc.getTables();
      }
      const table = this.vm.tables.find((item) => item.logicalName === tableName);
      if (!table) {
        throw new Error(`Table "${tableName}" was not found in this environment.`);
      }
      if (this.vm.selectedTable?.logicalName !== tableName) {
        this.vm.updateCols = [];
        this.vm.data = [];
      }
      if (!table.fields || table.fields.length === 0) {
        table.fields = await this.dvSvc.getFields(tableName);
      }
      this.vm.selectedTable = table;
      this.vm.fetchFields = Array.from(entity.children).some(
        (element) => element.tagName === "all-attributes",
      )
        ? table.fields.map((field) => field.logicalName)
        : Array.from(entity.children)
            .filter((element) => element.tagName === "attribute")
            .map((element) => element.getAttribute("name"))
            .filter((name): name is string => !!name);

      this.onLog(`Loading data for custom FetchXML`, "info");
      const data = await this.dvSvc.loadData(fetchXml);
      this.vm.data = data;
      this.onLog(`Loaded ${data.length} records for custom FetchXML`, "success");
    }
  }

  ///  Delays for a specified time and then reloads the data.Just to prevent the appearance of stale data
  async delayLoadData(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        await this.loadData();
        resolve();
      }, ms);
    });
  }

  async getColumnAttributes(column: Column, tableLogicalName?: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      switch (column.type) {
        case "Picklist":
        case "MultiSelectPicklist":
        case "State":
        case "Status":
          if (!column.choiceValues || column.choiceValues.length === 0) {
            await this.dvSvc
              .getChoiceValues(tableLogicalName || this.vm.selectedTable?.logicalName || "", column)
              .then((values) => {
                column.choiceValues = values;
                resolve();
              })
              .catch((error) => {
                this.onLog(`Error loading choice values for field ${column.logicalName}: ${error.message}`, "error");
                reject(error);
              });
          } else {
            resolve();
          }
          break;
        case "Money":
        case "Double":
        case "Integer":
        case "BigInt":
        case "Decimal":
          if (column.minValue === undefined || column.maxValue === undefined) {
            await this.dvSvc
              .getNumericFieldLimits(column, tableLogicalName || this.vm.selectedTable?.logicalName || "")
              .then(() => {
                resolve();
              })
              .catch((error) => {
                this.onLog(`Error loading numeric limits for field ${column.logicalName}: ${error.message}`, "error");
                reject(error);
              });
          } else {
            resolve();
          }
          break;
        case "String":
        case "Memo":
          if (column.maxLength === undefined) {
            await this.dvSvc
              .getStringFieldLimits(column, tableLogicalName || this.vm.selectedTable?.logicalName || "")
              .then(() => {
                resolve();
              })
              .catch((error) => {
                this.onLog(`Error loading max length for field ${column.logicalName}: ${error.message}`, "error");
                reject(error);
              });
          } else {
            resolve();
          }
          break;
        case "DateTime":
          if (column.format === undefined) {
            await this.dvSvc
              .getDateColumnFormat(column, tableLogicalName || this.vm.selectedTable?.logicalName || "")
              .then(() => {
                resolve();
              })
              .catch((error) => {
                this.onLog(`Error loading date format for field ${column.logicalName}: ${error.message}`, "error");
                reject(error);
              });
          } else {
            resolve();
          }
          break;
        default:
          resolve();
      }
    });
  }
}
