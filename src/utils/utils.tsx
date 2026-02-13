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
    return new Promise<void>(async (resolve, reject) => {
      try {
        if (this.vm.selectedView) {
          this.onLog(`Loading data for view: ${this.vm.selectedView.label}`, "info");
          try {
            const data = await this.dvSvc.loadData(this.vm.selectedView.fetchXml);
            this.vm.data = data;
            this.onLog(`Loaded ${data.length} records from view: ${this.vm.selectedView.label}`, "success");
          } catch (error: any) {
            reject(error);
          }
        } else if (this.vm.fetchXml) {
          this.onLog(`Loading data for custom FetchXML`, "info");
          try {
            const data = await this.dvSvc.loadData(this.vm.fetchXml);
            this.vm.data = data;
            this.onLog(`Loaded ${data.length} records for custom FetchXML`, "success");
            resolve();
          } catch (error: any) {
            reject(error);
          }
        }
      } catch (error: any) {
        reject(error);
      }
    });
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
