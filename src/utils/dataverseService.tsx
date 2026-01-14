import { SelectionValue, Table, View } from "../model/viewModel";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  async loadTables(): Promise<Table[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }

    this.onLog(`Loading tables for connection: ${this.connection.name}`, "info");

    try {
      const tables = await this.dvApi
        .getAllEntitiesMetadata(["LogicalName", "ObjectTypeCode", "DisplayName", "PrimaryIdAttribute", "PrimaryNameAttribute" ])
        .then((entities) => {
          return entities.value.map(
            (entity: any) =>
              ({
                logicalName: entity.LogicalName,
                displayName: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName,
                id: entity.MetadataId,
                typeCode: entity.ObjectTypeCode,
                primaryIdAttribute: entity.PrimaryIdAttribute,
                primaryNameAttribute: entity.PrimaryNameAttribute,
              } as Table)
          );
        });

      return tables;
    } catch (error: any) {
      this.onLog(`Error loading tables: ${error.message}`, "error");
      throw error;
    }
  }

  async loadViews(table: Table): Promise<View[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    console.log("Loading User Views from Dataverse...");
    try {
      this.onLog("Loading tables from Dataverse...", "info");
      const fetchXml = [
        "<fetch>",
        "  <entity name='savedquery'>",
        "    <attribute name='name'/>",
        "    <attribute name='fetchxml'/>",
        "    <filter>",
        `      <condition attribute='returnedtypecode' operator='eq' value='${table.typeCode}'/>`,
        "      <condition attribute='statecode' operator='eq' value='0'/>",
        "      <condition attribute='querytype' operator='eq' value='0  '/>",
        "      <condition attribute='fetchxml' operator='not-null' />",
        "    </filter>",
        "  </entity>",
        "</fetch>",
      ].join("");
      const viewData = await this.dvApi.fetchXmlQuery(fetchXml);
      const records = Array.isArray(viewData?.value) ? viewData.value : Array.isArray(viewData) ? viewData : [];
      const views: View[] = records.map(
        (rec: any) =>
          ({
            id: rec.savedqueryid ?? rec.id ?? "",
            label: rec.name ?? "",
            fetchXml: rec.fetchxml ?? rec.fetchXml ?? "",
          } as View)
      );
      this.onLog(`Loaded ${views.length} user views`, "success");

      return views;
    } catch (error) {
      this.onLog(`Error loading tables: ${error}`, "error");
      console.error("Error loading tables:", error);
      throw error;
    }
  }

  async loadData(fetchXml: string): Promise<any[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    this.onLog("Loading data from Dataverse...", "info");
    try {
      const data = await this.dvApi.fetchXmlQuery(fetchXml);
      const records = Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : [];
      this.onLog(`Loaded ${records.length} records from Dataverse`, "success");
      return records;
    } catch (error) {
      this.onLog(`Error loading data: ${error}`, "error");
      console.error("Error loading data:", error);
      throw error;
    }
  }

  async loadFields(tableLogicalName: string): Promise<any[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    console.log(`Loading fields for table: ${tableLogicalName}`);
    try {
      const metadata = await this.dvApi.getEntityRelatedMetadata(tableLogicalName, "Attributes", [
        "LogicalName",
        "DisplayName",
        "AttributeType",
        "IsPrimaryId",
      ]);
      console.log(`Fetched fields metadata for table ${tableLogicalName}:`, metadata);
      const fields = (Array.isArray(metadata?.value) ? metadata.value : []).map((attr: any) => ({
        logicalName: attr.LogicalName,
        displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
        type: attr.AttributeType,
        primaryKey: attr.IsPrimaryId,
      }));
      this.onLog(`Loaded ${fields.length} fields for table ${tableLogicalName}`, "success");
      return fields;
    } catch (error) {
      this.onLog(`Error loading fields for table ${tableLogicalName}: ${error}`, "error");
      console.error(`Error loading fields for table ${tableLogicalName}:`, error);
      throw error;
    }
  }

  async getChoiceValues(tableLogicalName: string, fieldLogicalName: string): Promise<SelectionValue[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Loading picklist values for field: ${fieldLogicalName}`, "info");
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${fieldLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet`;
      console.log("Picklist URL:", url);
      const picklistMeta: any = await this.dvApi.queryData(url);

      const options = picklistMeta.OptionSet?.Options || [];
      const values: SelectionValue[] = options.map(
        (opt: any) => new SelectionValue(opt.Label?.UserLocalizedLabel?.Label || "", opt.Value.toString())
      );
      this.onLog(`Picklist values loaded for field: ${fieldLogicalName}`, "success");
      return values;
    } catch (error) {
      this.onLog(`Error loading picklist values: ${error}`, "error");
      console.error("Error loading picklist values:", error);
      throw error;
    }
  }

  async getLookupValues(tableLogicalName: string, fieldLogicalName: string): Promise<SelectionValue[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Loading lookup values for field: ${fieldLogicalName}`, "info");
      const lookupMeta =
        // Implementation to retrieve lookup values goes here
        this.onLog(`Lookup values loaded for field: ${fieldLogicalName}`, "success");
      return [];
    } catch (error) {
      this.onLog(`Error loading lookup values: ${error}`, "error");
      console.error("Error loading lookup values:", error);
      throw error;
    }
  }
  async getLookupTargetTable(table: string, field: string) {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Retrieving lookup target table for field: ${field}`, "info");
      const url = `EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${field}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=Targets`;
      const lookupMeta: any = await this.dvApi.queryData(url);
      const targets = lookupMeta.Targets || [];
      const targetTable = targets.length > 0 ? targets[0] : null;
      return targetTable;
    } catch (error) {
      this.onLog(`Error retrieving lookup target table: ${error}`, "error");
      console.error("Error retrieving lookup target table:", error);
      throw error;
    }
  }
}
