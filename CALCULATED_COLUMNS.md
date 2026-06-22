# Calculated Fields Reference

This document lists all currently supported calculated-field options in Bulk Data Studio.

## How To Use

1. Add a field in the Update list.
2. Set Action to `Calculated`.
3. Enter an expression template.
4. Use preview/validation in the editor before running a bulk update.

## Expression Processing Order

Expressions are processed in this order:

1. Column tokens: `{field}` / `{field|raw}`
2. Conditionals: `<iif|...>`
3. System tokens: `<system|...>`
4. Math functions: `<math|...>`
5. Formatting functions: `<Upper>`, `<Lower>`, `<Trim|...>`, `<Left|...>`, `<Right|...>`, `<SubStr|...>`
6. Replacement function: `<Replace|old|new>`

## All Available Options

### 1. Column Tokens

- `{fieldname}`: Returns the field value.
- `{fieldname|raw}`: Returns raw value mode (same token format, useful for parity with XRM token style).
- `{parent.child}`: Dot notation is supported by the evaluator for nested object paths.

Examples:

```text
{firstname}
{statuscode|raw}
{account.name}
```

### 2. Conditional Token

Format:

```text
<iif|value|operator|compare|then|else>
```

Supported operators:

- `eq` or `=`
- `ne`, `!=`, or `<>`
- `gt` or `>`
- `gte` or `>=`
- `lt` or `<`
- `lte` or `<=`
- `contains`
- `startswith`
- `endswith`

Examples:

```text
<iif|statuscode|eq|1|Active|Inactive>
<iif|emailaddress1|contains|@contoso.com|Internal|External>
```

### 3. System Tokens

Format:

```text
<system|value|>
```

Supported values:

- `now`: current date/time (ISO)
- `today`: current date (YYYY-MM-DD)
- `year`
- `month` (01-12)
- `day` (01-31)
- `hour` (00-23)
- `minute` (00-59)
- `timestamp` (Unix ms)

Examples:

```text
Updated <system|today|>
<system|year|>-<system|month|>-<system|day|>
```

### 4. Math Function

Format:

```text
<math|operator|value>
```

Supported operators:

- `+`
- `-`
- `*`
- `/`

Examples:

```text
{revenue}<math|*|1.1>
{score}<math|+|5>
```

### 5. Formatting Functions

Supported formatting tags:

- `<Upper>`: uppercase preceding segment
- `<Lower>`: lowercase preceding segment
- `<Trim|chars>`: remove characters listed in `chars` from preceding segment
- `<Trim>`: trim whitespace from preceding segment
- `<Left|length>`: first N chars of preceding segment
- `<Right|length>`: last N chars of preceding segment
- `<SubStr|start|length>`: substring from preceding segment

Examples:

```text
{fullname}<Upper>
{telephone1}<Right|4>
{name}<Trim|*>
```

### 6. Replace Function

Format:

```text
<Replace|old|new>
```

Example:

```text
{description}<Replace|old company|new company>
```

## Practical Examples

```text
{description} - Updated <system|today|>
<iif|statuscode|eq|1|Ready for follow-up|Pending review>
{name}<Upper><Left|8>
{creditlimit}<math|*|1.05>
```

## Notes And Limitations

- If a field is missing or null, token replacement returns an empty string.
- For calculated updates, referenced top-level fields are auto-fetched before evaluation.
- Navigation paths in templates (for example `parent.child`) are not auto-fetched by the prefetch step and may require the data to already exist in the record context.
- Math operates on the trailing numeric portion before the `<math|...>` tag.
- Unknown system tokens resolve to empty output.

## Quick Checklist

- Keep expressions simple and test with preview first.
- Use explicit delimiters when concatenating values.
- Validate condition operators and numeric math inputs.
- Prefer top-level field references for reliable bulk execution.
