# Quick Start - Calculated Columns for BulkDataStudio

## What's New?

BulkDataStudio now supports **Calculated Columns** - dynamically compute field values during bulk updates using expressions with tokens, conditionals, formatting, and system values.

## How to Use

### Basic Workflow

1. **Select Records** - Choose records to update via FetchXML or view

2. **Add Update Column** - Click "Add Field" in the Update tab

3. **Set to Calculated** - Change dropdown from "Fixed" to "Calculated"

4. **Enter Expression** - Use tokens and functions:

   ```
   {firstname}              // Get first name
   <system|today|>         // Insert today's date
   <Upper>                 // Uppercase it
   ```

5. **Preview** - See the result update in real-time

6. **Execute** - Click "Execute Update" to apply to all records

## Expression Syntax - Quick Reference

### Insert Field Values

```
{fieldname}              Single field
{fieldname.lookup}       Related record field (one level)
{fieldname|raw}          Raw value (no formatting)
```

### Add System Values

```
<system|now|>            Current date & time (2026-02-19T14:30:45.123Z)
<system|today|>          Current date (2026-02-19)
<system|year|>           Year (2026)
<system|month|>          Month (02)
<system|day|>            Day (19)
<system|hour|>           Hour (14)
<system|minute|>         Minute (30)
```

### Use Conditionals

```
<iif|{status}|eq|Active|Yes|No>
                         IF status = "Active", use "Yes", else "No"

Operators: eq, ne, gt, gte, lt, lte, contains, startswith, endswith
```

### Format Text

```
<Upper>                  UPPERCASE
<Lower>                  lowercase
<Trim>                   Remove spaces
<Left|3>                 First 3 characters
<Right|4>               Last 4 characters
<SubStr|0|5>            Characters 0-5
<Replace|old|new>       Replace old with new
```

### Do Math

```
{quantity}<math|*|1.10>  Multiply by 1.10 (10% increase)
{price}<math|-|5.00>     Subtract 5.00
```

## Examples

### 1️⃣ Append Today's Date

**Field**: Notes  
**Expression**: `{notes} - Updated <system|today|>`  
**Result**: "Original text - Updated 2026-02-19"

---

### 2️⃣ Conditional Status

**Field**: Category  
**Expression**: `<iif|{revenue}|gt|100000|Enterprise|SMB>`  
**Result**: "Enterprise" if revenue > 100000, else "SMB"

---

### 3️⃣ Format Name

**Field**: DisplayName  
**Expression**: `<Upper>{lastname}, {firstname}`  
**Result**: "DOE, JOHN"

---

### 4️⃣ Create Reference Code

**Field**: ReferenceCode  
**Expression**: `ACC-<system|year|>-<Left|2>{accountname}`  
**Result**: "ACC-2026-AC" (first 2 chars of account name)

---

### 5️⃣ Discount for Premium

**Field**: FinalPrice  
**Expression**: `<iif|{tier}|eq|Premium|{price}<math|*|0.90>|{price}>`  
**Result**: 10% discount for Premium tier, full price otherwise

---

## Tips & Tricks

### Get Help

- Click **?** button in the editor for syntax reference
- Hover over buttons to see token names
- Click "More fields..." to see all available fields

### Test Your Expression

- Edit the expression and watch the **Preview** update
- **Green checkmark** = valid expression
- **Red error** = fix the syntax

### Token Suggestions

- See buttons for top 5 fields
- Click "More fields..." for complete list
- Click any button to insert that token

### Common Mistakes

❌ `{missing_field}` - If field doesn't exist, returns empty  
❌ `<IIF|...>` - Case sensitive! Use `<iif|...>` (lowercase)  
❌ `{field}|raw` - Should be `{field|raw}` (pipe inside braces)  
✅ `{field|raw}` - Correct!

## What Happens During Update?

1. **Records are fetched** with fields needed for calculations
2. **Expression evaluated for each record** with its data
3. **Calculated value stored** for that record
4. **All records updated** with their calculated values
5. **Results logged** in the execution log

### Performance

- Handles 100+ records efficiently
- Batches of 2 records fetched per API call
- Parallel processing for speed
- Typically < 30 seconds for large datasets

## File Reference

### User Documentation

- 📖 **CALCULATED_COLUMNS.md** - Complete user guide with all tokens/functions
- 📋 **DESIGN.md** - Why we chose this approach (architecture/philosophy)

### Developer Documentation

- 🔧 **IMPLEMENTATION.md** - How it works internally (for dev team)
- 📝 **Code files**:
  - `expressionEvaluator.ts` - Expression parser
  - `CalculatedValueEditor.tsx` - UI component
  - `UpdateColumn.tsx` - Data model
  - `dataverseService.tsx` - Service layer

## Support & Troubleshooting

### Expression won't evaluate?

1. Check the red error message in the preview
2. Verify all `{tokens}` have matching braces
3. Verify operators are lowercase (eq, not EQ)
4. Check fields exist in data (click "More fields")

### Wrong value showing?

1. The preview uses the first loaded record
2. Full calculations happen when you execute
3. Check field names match (case-sensitive)
4. Verify conditional values match your data

### Performance slow?

1. Large datasets (500+) may take time
2. All-at-once calculation evaluated record-by-record
3. Monitor the log for progress
4. Consider filtering records first

## Next Steps

1. **Read** → [CALCULATED_COLUMNS.md](./CALCULATED_COLUMNS.md) for detailed syntax
2. **Try** → Create your first calculated field
3. **Explore** → Use examples from this guide
4. **Share** → Document your templates for team reuse

---

**Questions?** Check the help button (?) in the editor or review the examples above.

**Ready to bulk update with calculated values! 🚀**
