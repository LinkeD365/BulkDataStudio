import { UpdateColumn } from "../model/UpdateColumn";
import { Column, SelectionValue, Table, View } from "../model/vm";
import { ExpressionEvaluator } from "./expressionEvaluator";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  batchSize = 2;
  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  async getTables(): Promise<Table[]> {
    if (!this.connection) {
      throw new Error("No connection available");
    }

    this.onLog(`Loading tables for connection: ${this.connection.name}`, "info");

    try {
      const tables = await this.dvApi
        .getAllEntitiesMetadata([
          "LogicalName",
          "ObjectTypeCode",
          "DisplayName",
          "PrimaryIdAttribute",
          "PrimaryNameAttribute",
          "EntitySetName",
        ])
        .then((entities) => {
          const entitiesWithPrimaryName = entities.value.filter((entity: any) => entity.PrimaryNameAttribute);

          return entitiesWithPrimaryName
            .map(
              (entity: any) =>
                ({
                  logicalName: entity.LogicalName,
                  displayName: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName,
                  id: entity.MetadataId,
                  typeCode: entity.ObjectTypeCode,
                  primaryIdAttribute: entity.PrimaryIdAttribute,
                  primaryNameAttribute: entity.PrimaryNameAttribute,
                  setName: entity.EntitySetName,
                }) as Table,
            )
            .sort((a: Table, b: Table) => a.displayName.localeCompare(b.displayName));
        });

      return tables;
    } catch (error: any) {
      this.onLog(`Error loading tables: ${error.message}`, "error");
      throw error;
    }
  }

  async getViews(table: Table): Promise<View[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }

    try {
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
          }) as View,
      );
      this.onLog(`Loaded ${views.length} views for table ${table.displayName}`, "success");

      return views;
    } catch (error) {
      this.onLog(`Error loading views for table ${table.displayName}: ${error}`, "error");
      console.error("Error loading views:", error);
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

  async getFields(tableLogicalName: string): Promise<any[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }

    try {
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsPrimaryId&$filter=IsValidForUpdate eq true`;
      const metadataAlt: any = await this.dvApi.queryData(url);
      const fields = (Array.isArray(metadataAlt?.value) ? metadataAlt.value : [])
        .map(
          (attr: any) =>
            new Column(
              attr.LogicalName,
              attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
              attr.AttributeType,
              attr.IsPrimaryId,
            ),
        )
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
      this.onLog(`Loaded ${fields.length} fields for table ${tableLogicalName}`, "success");
      return fields;
    } catch (error) {
      this.onLog(`Error loading fields for table ${tableLogicalName}: ${error}`, "error");
      console.error(`Error loading fields for table ${tableLogicalName}:`, error);
      throw error;
    }
  }

  async getChoiceValues(tableLogicalName: string, column: Column): Promise<SelectionValue[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Loading picklist values for field: ${column.logicalName}`, "info");
      let attributeMeta: string;
      switch (column.type) {
        case "Picklist":
          attributeMeta = "PicklistAttributeMetadata";
          break;
        case "State":
          attributeMeta = "StateAttributeMetadata";
          break;
        case "Status":
          attributeMeta = "StatusAttributeMetadata";
          break;
        default:
          throw new Error(`Field type ${column.type} is not supported for choice values retrieval`);
      }

      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${column.logicalName}')/Microsoft.Dynamics.CRM.${attributeMeta}?$select=LogicalName&$expand=OptionSet`;

      const picklistMeta: any = await this.dvApi.queryData(url);

      const options = picklistMeta.OptionSet?.Options || [];
      const values: SelectionValue[] = options.map((opt: any) => ({
        label: opt.Label?.UserLocalizedLabel?.Label || "",
        value: opt.Value.toString(),
        defaultStatus: opt.DefaultStatus,
        parentState: opt.State,
      }));
      return values;
    } catch (error) {
      this.onLog(`Error loading picklist values: ${error}`, "error");
      console.error("Error loading picklist values:", error);
      throw error;
    }
  }

  // async getLookupValues(tableLogicalName: string, fieldLogicalName: string): Promise<SelectionValue[]> {
  //   if (!this.connection) {
  //     this.onLog("No connection available", "error");
  //     throw new Error("No connection available");
  //   }
  //   try {
  //     this.onLog(`Loading lookup values for field: ${fieldLogicalName}`, "info");
  //     const lookupMeta =
  //       // Implementation to retrieve lookup values goes here
  //       this.onLog(`Lookup values loaded for field: ${fieldLogicalName}`, "success");
  //     return [];
  //   } catch (error) {
  //     this.onLog(`Error loading lookup values: ${error}`, "error");
  //     console.error("Error loading lookup values:", error);
  //     throw error;
  //   }
  // }
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

  async updateData(table: Table, rows: SelectionValue[], updates: UpdateColumn[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(new Error("No connection available"));
      }
      if (!table || !rows || rows.length === 0) {
        this.onLog("No table  or rows selected for data update", "error");
        reject(new Error("No table  or rows selected for data update"));
      }

      if (!updates || updates.length === 0) {
        this.onLog("No fields selected for data update", "error");
        reject(new Error("No fields selected for data update"));
      }

      // Evaluate calculated columns before update
      const evaluatedUpdates = await this.evaluateCalculatedColumns(table, rows, updates);

      const touchUpdates = evaluatedUpdates.filter((u) => u.setStatus === "Touch");
      const hasCalculatedUpdates = evaluatedUpdates.some((u) => u.setStatus === "Calculated");
      const needsRecordFetch = evaluatedUpdates.some((u) => u.onlyDifferent) || touchUpdates.length > 0;

      let data: any[] = [];
      if (needsRecordFetch || hasCalculatedUpdates) {
        // Determine fields to fetch: touch columns + onlyDifferent columns
        const fieldsToFetch = new Set<string>();
        touchUpdates.forEach((u) => fieldsToFetch.add(u.column.logicalName));
        evaluatedUpdates.filter((u) => u.onlyDifferent).forEach((u) => fieldsToFetch.add(u.column.logicalName));

        const recordMap = new Map<string, any>();
        const batches: SelectionValue[][] = [];
        for (let i = 0; i < rows.length; i += this.batchSize) {
          batches.push(rows.slice(i, i + this.batchSize));
        }
        if (fieldsToFetch.size > 0) {
          await Promise.all(
            batches.map(async (batch) => {
              const rowsString = batch.map((row) => `<value>${row.value}</value>`).join("");
              const attributeString = Array.from(fieldsToFetch)
                .map((f) => `<attribute name='${f}'/>`)
                .join("");
              const fetchXML = `<fetch>
    <entity name="${table.logicalName}">
    ${attributeString}
    <filter type="and">
      <condition attribute="${table.primaryIdAttribute}" operator="in">${rowsString}
      </condition>
    </filter>
    </entity>
  </fetch>`;
              const checkData = await this.dvApi.fetchXmlQuery(fetchXML);
              this.onLog(`Fetched records for update evaluation: ${JSON.stringify(checkData)}`, "info");
              const records = Array.isArray(checkData?.value) ? checkData.value : [];
              records.forEach((r: any) => recordMap.set(r[table.primaryIdAttribute], r));
            }),
          );
        }

        // Build per-record payloads combining touch values with other updates
        data = rows.map((row) => {
          const record = recordMap.get(row.value);
          const payload: any = {
            [table.primaryIdAttribute]: row.value,
            "@odata.type": `Microsoft.Dynamics.CRM.${table.logicalName}`,
          };

          evaluatedUpdates.forEach((upd) => {
            if (upd.setStatus === "Touch") {
              if (record) {
                const val = this.getTouchValue(upd, record);
                if (val !== undefined) {
                  payload[upd.dbField] = val;
                }
              }
            } else if (upd.setStatus === "Calculated") {
              const rowAny = row as any;
              if (rowAny.updatePayload && rowAny.updatePayload[upd.dbField] !== undefined) {
                payload[upd.dbField] = rowAny.updatePayload[upd.dbField];
              }
            } else if (upd.onlyDifferent) {
              if (!record || record[upd.column.logicalName] !== upd.dbValue) {
                payload[upd.dbField] = upd.dbValue;
              }
            } else {
              payload[upd.dbField] = upd.dbValue;
            }
          });

          return payload;
        });
      } else {
        data = rows.map((row) => {
          return {
            [table.primaryIdAttribute]: row.value,
            "@odata.type": `Microsoft.Dynamics.CRM.${table.logicalName}`,
            ...evaluatedUpdates.reduce((acc, curr) => {
              acc[curr.dbField] = curr.dbValue;
              return acc;
            }, {} as any),
          };
        });
      }

      const batches: any[] = [];
      for (let i = 0; i < data.length; i += this.batchSize) {
        batches.push(data.slice(i, i + this.batchSize));
      }
      this.onLog(`Updating ${data.length} records in table: ${table.displayName}`, "info");
      window.toolboxAPI.utils
        .executeParallel(() => Promise.all(batches.map((batch) => this.dvApi.updateMultiple(table.logicalName, batch))))
        .then(() => {
          this.onLog(`Successfully updated ${data.length} records`, "success");
          resolve();
        })
        .catch((error) => {
          this.onLog(`Error creating data: ${error}`, "error");
          console.error("Error creating data:", error);

          reject(error);
        });
    });
  }

  /**
   * Get the current record value for a Touch column in the format needed for update
   */
  private getTouchValue(upd: UpdateColumn, record: any): any {
    switch (upd.column.type) {
      case "Lookup":
      case "Owner": {
        const guid = record[`_${upd.column.logicalName}_value`];
        if (!guid) return null;
        const setName = upd.column.lookupTargetTable?.setName;
        if (setName) {
          return `/${setName}(${guid})`;
        }
        return undefined; // Can't construct bind without target table info
      }
      default:
        return record[upd.column.logicalName];
    }
  }

  /**
   * Evaluate calculated column expressions for all records
   * Returns modified updates with calculated values
   */
  private async evaluateCalculatedColumns(
    table: Table,
    rows: SelectionValue[],
    updates: UpdateColumn[],
  ): Promise<UpdateColumn[]> {
    const calculatedUpdates = updates.filter((u) => u.setStatus === "Calculated");
    if (calculatedUpdates.length === 0) {
      return updates;
    }

    // Get required fields for calculated columns and evaluation
    const fieldsNeeded = new Set<string>();
    calculatedUpdates.forEach((upd) => {
      // Extract field names from expression template
      const fieldMatches = upd.expressionTemplate?.match(/\{[^}]+\}/g) || [];
      fieldMatches.forEach((match) => {
        const inner = match.slice(1, -1);
        const [fieldPart] = inner.split("|", 1);
        if (fieldPart.includes(".")) {
          this.onLog(
            `Calculated expression contains navigation field "${fieldPart}". Related entity fields are not auto-fetched; ensure required data is pre-loaded.`,
            "warning",
          );
          return;
        }
        const fieldName = fieldPart.trim();
        if (fieldName) {
          fieldsNeeded.add(fieldName);
        }
      });
    });

    // Fetch records with required fields for calculation
    if (fieldsNeeded.size > 0) {
      const fieldsArray = Array.from(fieldsNeeded);
      const batches: SelectionValue[][] = [];
      for (let i = 0; i < rows.length; i += this.batchSize) {
        batches.push(rows.slice(i, i + this.batchSize));
      }

      const recordMap = new Map<string, any>();

      await Promise.all(
        batches.map(async (batch) => {
          const rowsString = batch.map((row) => `<value>${row.value}</value>`).join("");
          const attributeString = fieldsArray.map((f) => `<attribute name='${f}'/>`).join("");

          const fetchXML = `<fetch>
    <entity name="${table.logicalName}">
    ${attributeString}
    <filter type="and">
      <condition attribute="${table.primaryIdAttribute}" operator="in">${rowsString}
      </condition>
    </filter>
    </entity>
  </fetch>`;

          try {
            const data = await this.dvApi.fetchXmlQuery(fetchXML);
            const records = Array.isArray(data?.value) ? data.value : [];
            records.forEach((record: any) => {
              recordMap.set(record[table.primaryIdAttribute], record);
            });
          } catch (error) {
            this.onLog(`Error fetching records for calculated columns: ${error}`, "warning");
          }
        }),
      );

      // Evaluate expressions for each record and update calculated columns
      const updatedUpdates = updates.map((upd) => {
        if (upd.setStatus === "Calculated" && upd.expressionTemplate) {
          let firstSuccessfulValue: any = undefined;
          rows.forEach((row) => {
            const record = recordMap.get(row.value);
            if (record) {
              const result = ExpressionEvaluator.evaluate(upd.expressionTemplate!, { record });
              if (!result.error && result.value !== undefined) {
                const rowAny = row as any;
                rowAny.updatePayload = rowAny.updatePayload || {};
                rowAny.updatePayload[upd.dbField] = result.value;

                if (firstSuccessfulValue === undefined) {
                  firstSuccessfulValue = result.value;
                }
                upd.calculationError = undefined;
              } else if (result.error) {
                upd.calculationError = result.error;
              }
            }
          });

          if (firstSuccessfulValue !== undefined) {
            upd.previewValue = firstSuccessfulValue;
          }
        }
        return upd;
      });

      return updatedUpdates;
    }

    return updates;
  }
  async getNumericFieldLimits(column: Column, tableLogicalName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        throw new Error("No connection available");
      }
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${column.logicalName}')`;

      this.dvApi
        .queryData(url)
        .then((attrMeta: any) => {
          if (attrMeta) {
            column.minValue = attrMeta.MinValue;
            column.maxValue = attrMeta.MaxValue;
            column.precision = attrMeta.Precision;

            resolve();
          } else {
            reject(new Error(`No metadata found for field: ${column.logicalName}`));
            this.onLog(`No metadata found for field: ${column.logicalName}`, "warning");
          }
        })
        .catch((error) => {
          this.onLog(`Error retrieving numeric field limits: ${error}`, "error");
          reject(error);
        });
    });
  }

  async getStringFieldLimits(column: Column, tableLogicalName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(Error("No connection available"));
      }
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${column.logicalName}')`;
      this.dvApi
        .queryData(url)
        .then((attrMeta: any) => {
          if (attrMeta) {
            column.maxLength = attrMeta.MaxLength;
            resolve();
          } else {
            reject(new Error(`No metadata found for field: ${column.logicalName}`));
            this.onLog(`No metadata found for field: ${column.logicalName}`, "warning");
          }
        })
        .catch((error) => {
          this.onLog(`Error retrieving string field limits: ${error}`, "error");
          reject(error);
        });
    });
  }

  async getDateColumnFormat(column: Column, tableLogicalName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(Error("No connection available"));
      }
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${column.logicalName}')`;

      this.dvApi
        .queryData(url)
        .then((attrMeta: any) => {
          if (attrMeta) {
            column.format = attrMeta.Format; // e.g., DateOnly, DateTime

            resolve();
          } else {
            reject(new Error(`No metadata found for field: ${column.logicalName}`));
            this.onLog(`No metadata found for field: ${column.logicalName}`, "warning");
          }
        })
        .catch((error) => {
          this.onLog(`Error retrieving date column format: ${error}`, "error");
          reject(error);
        });
    });
  }

  async touchData(table: Table, rows: SelectionValue[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(new Error("No connection available"));
        return;
      }
      if (!table || !rows || rows.length === 0) {
        this.onLog("No table  or rows selected for data touch", "error");
        reject(new Error("No table  or rows selected for data touch"));
        return;
      }

      const batches: SelectionValue[][] = [];
      for (let i = 0; i < rows.length; i += this.batchSize) {
        batches.push(rows.slice(i, i + this.batchSize));
      }

      try {
        await Promise.all(
          batches.map(async (batch) => {
            const rowsString = batch.map((row) => `<value>${row.value}</value>`).join("");

            const fetchXML = `<fetch>
    <entity name="${table.logicalName}">
    <attribute name="${table.primaryNameAttribute}" />
    <filter type="and">
      <condition attribute="${table.primaryIdAttribute}" operator="in">${rowsString}
      </condition>
    </filter>
    </entity>
  </fetch>`;

            const data = await this.dvApi.fetchXmlQuery(fetchXML);

            const touchData = data.value.map((row) => {
              return {
                [table.primaryIdAttribute]: row[table.primaryIdAttribute],
                [table.primaryNameAttribute]: row[table.primaryNameAttribute],
                "@odata.type": `Microsoft.Dynamics.CRM.${table.logicalName}`,
              };
            });

            await this.dvApi.updateMultiple(table.logicalName, touchData);
          }),
        );

        this.onLog(`Successfully touched ${rows.length} records`, "success");
        resolve();
      } catch (error) {
        this.onLog(`Error touching data: ${error}`, "error");
        reject(error);
      }
    });
  }

  async deleteData(table: Table, rows: SelectionValue[]): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(new Error("No connection available"));
        return;
      }
      if (!table || !rows || rows.length === 0) {
        this.onLog("No table or rows selected for deletion", "error");
        reject(new Error("No table or rows selected for deletion"));
        return;
      }

      const batches: SelectionValue[][] = [];
      for (let i = 0; i < rows.length; i += this.batchSize) {
        batches.push(rows.slice(i, i + this.batchSize));
      }

      this.onLog(`Deleting ${rows.length} records from table: ${table.displayName}`, "info");

      try {
        await Promise.all(
          batches.map(async (batch) => {
            await Promise.all(
              batch.map(async (row) => {
                await this.dvApi.delete(table.logicalName, row.value);
              }),
            );
          }),
        );

        this.onLog(`Successfully deleted ${rows.length} records`, "success");
        resolve();
      } catch (error) {
        this.onLog(`Error deleting data: ${error}`, "error");
        reject(error);
      }
    });
  }
}
