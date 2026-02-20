# Calculated Columns for BulkDataStudio

## Overview

Calculated columns allow you to dynamically compute update values based on record data, system values, and expressions. This feature is inspired by XRM Tokens and Bulk Data Updater, providing flexible value calculation for bulk operations.

## Setting Up Calculated Columns

1. **Enable Calculated Mode**: In the Update Value editor, select "Calculated" from the `setStatus` dropdown
2. **Define Expression**: Enter your expression template in the Expression Template field
3. **Preview**: View the calculated result in real-time as you type
4. **Validate**: The system shows errors if the expression is invalid

## Token Types

### Column Tokens

Reference field values from the current record:

```
{fieldname}              → Get field value with label (for lookups)
{fieldname|raw}          → Get raw field value
{parent.childfield}      → Navigate related records (dot notation)
```

**Examples:**

- `{firstname}` → Returns the first name
- `{account.name}` → Returns the parent account's name
- `{status|raw}` → Returns numeric value for status field

### System Tokens

Access system-level information:

```
<system|now|>            → Current date/time (ISO 8601)
<system|today|>          → Current date only
<system|year|>           → Current year (e.g., 2026)
<system|month|>          → Current month (01-12)
<system|day|>            → Current day of month
<system|hour|>           → Current hour (00-23)
<system|minute|>         → Current minute (00-59)
<system|timestamp|>      → Current timestamp in milliseconds
```

**Examples:**

- `Updated on <system|today|>` → "Updated on 2026-02-19"
- `<system|year|>-<system|month|>-<system|day|>` → "2026-02-19"

### Conditional Logic

Use IIF (If-If-Else) for decision-based values:

```
<iif|value|operator|compare|then|else>
```

**Operators:**

- Comparison: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
- String: `contains`, `startswith`, `endswith`

**Examples:**

- `<iif|{status}|eq|Active|Yes|No>` → "Yes" if status equals "Active"
- `<iif|{rating}|gt|100|High|Low>` → "High" if rating > 100
- `<iif|{email}|contains|@acme.com|Internal|External>` → "Internal" for acme.com emails

### Formatting Functions

Transform text values:

```
<Upper>                  → Convert to UPPERCASE
<Lower>                  → Convert to lowercase
<Trim|chars>             → Remove leading/trailing characters
<TrimStart|chars>        → Remove leading characters only
<TrimEnd|chars>          → Remove trailing characters only
<SubStr|start|length>    → Extract substring
<Left|length>            → Get left N characters
<Right|length>           → Get right N characters
<Replace|old|new>        → Replace text
<Pad|R|length|char>      → Pad with character
```

**Examples:**

- `{firstname}<Upper>` → "JOHN"
- `<SubStr|0|3>{lastname}` → First 3 chars of last name
- `<Replace|Old Company|New Company>{description}` → Replace company name

### Math Operations

Perform calculations on numeric values:

```
<math|operator|value>
```

**Operators:** `+`, `-`, `*`, `/`

**Examples:**

- `{quantity}<math|*|1.10>` → Increase quantity by 10%
- `{price}<math|-|0.05>` → Subtract 0.05 from price

## Complex Examples

### 1. Append Current Date

**Field:** Description  
**Expression:**

```
{description} - Updated <system|today|>
```

**Result:** "Original description - Updated 2026-02-19"

---

### 2. Concatenate with Conditional

**Field:** Notes  
**Expression:**

```
<iif|{status}|eq|Completed|Task finished on <system|today|>|Task is pending>
```

**Result (if completed):** "Task finished on 2026-02-19"  
**Result (if pending):** "Task is pending"

---

### 3. Dynamic Account Code

**Field:** AccountCode  
**Expression:**

```
<Left|2>{account.name}<Upper><system|year|>
```

**Result:** "ACACME2026" (first 2 chars of account name in uppercase + year)

---

### 4. Format Phone Number

**Field:** FormattedPhone  
**Expression:**

```
(<Left|3>{phone>) <SubStr|3|3>-<Right|4>{phone}>
```

**Result:** "(555) 123-4567" (from "5551234567")

---

### 5. Status-Based Pricing

**Field:** FinalPrice  
**Expression:**

```
<iif|{tier}|eq|Premium|{price}<math|*|0.90>|{price}>
```

**Result:** 10% discount applied if tier is "Premium"

---

## Best Practices

### ✅ Do's

- **Test with sample data** - Use the preview to verify expressions work
- **Use meaningful delimiters** - Make concatenated values readable
- **Combine operators logically** - Nest conditionals for complex scenarios
- **Handle missing values** - Expressions gracefully ignore null/undefined fields
- **Document complex templates** - Add notes about formula logic

### ❌ Don'ts

- **Reference non-existent fields** - They'll be treated as empty strings
- **Create circular logic** - Don't reference fields you're updating
- **Assume data format** - Verify field types before calculations
- **Overcomplicate expressions** - Keep templates readable and maintainable

## Integration with Bulk Operations

When executing bulk updates with calculated columns:

1. **Records are fetched** - Required fields are retrieved for each record
2. **Expressions evaluated** - Each record's data is substituted into the template
3. **Values calculated** - Formulas are executed per-record
4. **Updates applied** - Calculated values are written to the target field
5. **Results logged** - Success/error details are recorded

## Limitations & Notes

- **Lookup navigation** - Only one level of related data (dot notation) is supported
- **Number precision** - Math operations maintain JavaScript Number precision
- **Field availability** - Only fields included in the fetch are available for calculation
- **Performance** - Batch size is optimized; very large datasets may take time
- **Date formats** - System tokens return ISO 8601 format by default

## Error Handling

The editor shows real-time validation:

- ❌ **Red border/Error message** - Expression has syntax errors
- ✅ **Green check + preview** - Expression is valid
- ⚠️ **Yellow warning** - Field referenced but might be missing

## See Also

- Expression Evaluator API: `ExpressionEvaluator` class
- Update Column Data Model: `UpdateColumn` entity
- Expression patterns based on: XRM Tokens, Bulk Data Updater
