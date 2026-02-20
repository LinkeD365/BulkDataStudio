/**
 * Expression Evaluator - Handles token replacement and formula evaluation
 * Based on patterns from XRM Tokens and BulkDataUpdater
 */

export interface EvaluationContext {
  record: Record<string, any>;
  metadata?: any;
}

export interface EvaluationResult {
  value: any;
  error?: string;
  isCalculated: boolean;
}

export class ExpressionEvaluator {
  /**
   * Evaluate a template string with token replacements and formulas
   * Supports: {column}, {column|raw}, <iif|condition|then|else>, <system|value>, etc.
   */
  static evaluate(template: string, context: EvaluationContext): EvaluationResult {
    if (!template || template.trim() === "") {
      return { value: "", error: undefined, isCalculated: false };
    }

    try {
      let result = template;

      // Process {column} tokens first
      result = this.processColumnTokens(result, context);

      // Process <iif|...> conditional expressions
      result = this.processConditionals(result, context);

      // Process <system|...> system tokens
      result = this.processSystemTokens(result, context);

      // Process <math|operator|value> expressions
      result = this.processMathExpressions(result, context);

      // Process formatting functions: <Upper>, <Lower>, <Trim|chars>, etc.
      result = this.processFormattingFunctions(result, context);

      // Process string replacement: <Replace|old|new>
      result = this.processReplacements(result, context);

      return { value: result, isCalculated: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { value: undefined, error: errorMsg, isCalculated: false };
    }
  }

  /**
   * Get value from record by field logical name (supports dot notation for lookups)
   */
  private static getFieldValue(fieldPath: string, record: Record<string, any>): any {
    const parts = fieldPath.trim().split(".");
    let value = record[parts[0]];

    for (let i = 1; i < parts.length; i++) {
      if (value === null || value === undefined) return undefined;
      if (typeof value === "object" && "_Name" in value) {
        // Lookup reference
        value = value._Name;
      } else {
        value = value[parts[i]];
      }
    }

    return value;
  }

  /**
   * Process {column} and {column|raw} tokens
   * {fieldname} - returns label if lookup, otherwise value
   * {fieldname|raw} - returns raw value
   */
  private static processColumnTokens(template: string, context: EvaluationContext): string {
    const columnRegex = /\{([a-zA-Z_][a-zA-Z0-9_\.]*)\|?(raw)?\}/g;

    return template.replace(columnRegex, (_match, fieldName, rawFlag) => {
      const value = this.getFieldValue(fieldName, context.record);

      if (value === null || value === undefined) {
        return "";
      }

      // If it's a lookup and not raw, use the name
      if (typeof value === "object" && "_Name" in value && !rawFlag) {
        return value._Name || "";
      }

      return String(value);
    });
  }

  /**
   * Process <iif|condition|operator|value|then|else> conditionals
   * Example: <iif|{status}|eq|Active|Yes|No>
   */
  private static processConditionals(template: string, context: EvaluationContext): string {
    const iifRegex = /<iif\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^>]+)>/g;

    return template.replace(iifRegex, (_match, condValue, operator, compareValue, thenVal, elseVal) => {
      try {
        const actualValue = this.getFieldValue(condValue.trim(), context.record) ?? condValue.trim();
        const compValue = compareValue.trim();
        const thenResult = thenVal.trim();
        const elseResult = elseVal.trim();

        let condition = false;
        const strActual = String(actualValue).toLowerCase();
        const strComp = String(compValue).toLowerCase();

        switch (operator.toLowerCase().trim()) {
          case "eq":
          case "=":
            condition = strActual === strComp;
            break;
          case "ne":
          case "!=":
          case "<>":
            condition = strActual !== strComp;
            break;
          case "gt":
          case ">":
            condition = parseFloat(strActual) > parseFloat(strComp);
            break;
          case "gte":
          case ">=":
            condition = parseFloat(strActual) >= parseFloat(strComp);
            break;
          case "lt":
          case "<":
            condition = parseFloat(strActual) < parseFloat(strComp);
            break;
          case "lte":
          case "<=":
            condition = parseFloat(strActual) <= parseFloat(strComp);
            break;
          case "contains":
            condition = strActual.includes(strComp);
            break;
          case "startswith":
            condition = strActual.startsWith(strComp);
            break;
          case "endswith":
            condition = strActual.endsWith(strComp);
            break;
          default:
            condition = strActual === strComp;
        }

        return condition ? thenResult : elseResult;
      } catch {
        return elseVal.trim();
      }
    });
  }

  /**
   * Process <system|value|format> tokens for system values like now, userid, etc.
   */
  private static processSystemTokens(template: string, _context: EvaluationContext): string {
    const systemRegex = /<system\|([a-zA-Z_][a-zA-Z0-9_]*)\|?([^>]*)>/g;

    return template.replace(systemRegex, (_match, systemValue, _format) => {
      const now = new Date();
      let result = "";

      switch (systemValue.toLowerCase().trim()) {
        case "now":
          result = now.toISOString();
          break;
        case "today":
          result = now.toISOString().split("T")[0];
          break;
        case "year":
          result = now.getFullYear().toString();
          break;
        case "month":
          result = String(now.getMonth() + 1).padStart(2, "0");
          break;
        case "day":
          result = String(now.getDate()).padStart(2, "0");
          break;
        case "hour":
          result = String(now.getHours()).padStart(2, "0");
          break;
        case "minute":
          result = String(now.getMinutes()).padStart(2, "0");
          break;
        case "timestamp":
          result = now.getTime().toString();
          break;
        default:
          result = "";
      }

      return result;
    });
  }

  /**
   * Process <math|operator|value> for numeric operations
   * Example: <math|+|10> adds 10 to previous numeric value
   */
  private static processMathExpressions(template: string, _context: EvaluationContext): string {
    const mathRegex = /<math\|([+\-*/])\|([0-9.]+)>/g;

    return template.replace(mathRegex, (match, operator, value, offset) => {
      try {
        const num = parseFloat(value);
        if (isNaN(num)) return match;

        // Extract the number before this match to apply operation
        const lastNumMatch = template.substring(0, offset).match(/[\d.]+$/);
        if (lastNumMatch) {
          const lastNum = parseFloat(lastNumMatch[0]);
          let result = lastNum;

          switch (operator) {
            case "+":
              result = lastNum + num;
              break;
            case "-":
              result = lastNum - num;
              break;
            case "*":
              result = lastNum * num;
              break;
            case "/":
              if (num === 0) {
                return match;
              }
              result = lastNum / num;
              break;
          }

          return String(result);
        }
        return match;
      } catch {
        return match;
      }
    });
  }

  /**
   * Process formatting functions that transform the text preceding them.
   * Each function transforms the text segment from the start (or the end of the
   * previous formatting function) up to the function tag.
   *
   * Examples:
   *   {firstname}<Upper>           → JOHN
   *   {firstname}<Upper><Left|3>   → JOH
   *   {firstname}<Lower> {lastname}<Upper> → john SMITH
   */
  private static processFormattingFunctions(template: string, _context: EvaluationContext): string {
    let result = template;

    // <Upper> - uppercase the preceding segment
    result = result.replace(/([^<]*)<Upper>/gi, (_m, before: string) => before.toUpperCase());

    // <Lower> - lowercase the preceding segment
    result = result.replace(/([^<]*)<Lower>/gi, (_m, before: string) => before.toLowerCase());

    // <Trim|chars> - trim characters (or whitespace) from the preceding segment
    result = result.replace(/([^<]*)<Trim(?:\|([^>]+))?>/gi, (_m, before: string, chars?: string) => {
      if (chars) {
        const charsSet = new Set(chars.split(""));
        let filtered = "";
        for (const ch of before) {
          if (!charsSet.has(ch)) {
            filtered += ch;
          }
        }
        return filtered;
      }
      return before.trim();
    });

    // <Left|n> - keep the first n characters
    result = result.replace(/([^<]*)<Left\|(\d+)>/gi, (_m, before: string, len: string) =>
      before.substring(0, parseInt(len)),
    );

    // <Right|n> - keep the last n characters
    result = result.replace(/([^<]*)<Right\|(\d+)>/gi, (_m, before: string, len: string) => {
      const n = parseInt(len);
      return before.substring(before.length - n);
    });

    // <SubStr|start|length> - extract substring
    result = result.replace(/([^<]*)<SubStr\|(\d+)\|(\d+)>/gi, (_m, before: string, start: string, len: string) =>
      before.substring(parseInt(start), parseInt(start) + parseInt(len)),
    );

    return result;
  }

  /**
   * Process <Replace|old|new> for string replacement.
   * Applies the replacement only to the text segment preceding the tag,
   * consistent with other formatting functions.
   */
  private static processReplacements(template: string, _context: EvaluationContext): string {
    const replaceRegex = /([^<]*)<Replace\|([^|]+)\|([^>]*)>/g;

    return template.replace(replaceRegex, (_match, before, oldVal, newVal) => {
      const oldText = oldVal.trim();
      const newText = newVal.trim();

      if (!oldText) {
        return before;
      }

      const escapedOldVal = oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return before.replace(new RegExp(escapedOldVal, "g"), newText);
    });
  }

  /**
   * Get template hint/documentation for a specific function
   */
  static getHint(functionName: string): string {
    const hints: Record<string, string> = {
      column: "{fieldname} or {fieldname.relationshipname} - Get field value",
      columnraw: "{fieldname|raw} - Get raw field value",
      iif: "<iif|value|operator|compare|then|else> - Conditional. Operators: eq, ne, gt, gte, lt, lte, contains, startswith, endswith",
      system: "<system|value|format> - System values. Values: now, today, year, month, day, hour, minute, timestamp",
      upper: "<Upper> - Convert to uppercase",
      lower: "<Lower> - Convert to lowercase",
      trim: "<Trim|chars> - Trim characters",
      substr: "<SubStr|start|length> - Extract substring",
      left: "<Left|length> - Get left characters",
      right: "<Right|length> - Get right characters",
      replace: "<Replace|old|new> - Replace text",
      math: "<math|operator|value> - Math operation. Operators: +, -, *, /",
    };

    return hints[functionName.toLowerCase()] || "Unknown function";
  }

  /**
   * Get all available token suggestions for a record
   */
  static getTokenSuggestions(record: Record<string, any>): string[] {
    return Object.keys(record)
      .filter((key) => !key.startsWith("_"))
      .map((key) => `{${key}}`);
  }
}
