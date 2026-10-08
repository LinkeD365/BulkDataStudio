# Bulk Data Studio

Bulk Data Studio, a respectful clone of Jonas Rapp's [Bulk Data Updater](https://jonasr.app/bdu/) within XrmToolBox.

![Main Screenshot](https://github.com/LinkeD365/BulkDataStudio/blob/main/public/mainscreenshot.png?raw=true)

This tool allows users to perform bulk data operations efficiently within Microsoft Dataverse environments.

## Features

- ✅ Find records to update via view
- ✅ Select one or more fields to update to static values
- ✅ Touch Records to trigger workflows
- ✅ Includes Status and Ownership updates
- ✅ Bulk delete selected records
- ✅ Save/Load Job
- ✅ Allow Edit of FetchXml
- ✅ Touch per field
- ✅ Some XrmTokens for calculated fields
- 📘 Calculated fields reference: [All calculated field options](CALCULATED_COLUMNS.md)
- ✅ Clone record with child tables


## Installation
- Download and install from PPTB Marketplace
- Select tool from installed tools and choose appropriate dataverse connection.

## Useage
- Select Fetch Data, this will display a list of tables in your environment.
- Choose a view to use. You can also use any FetchXML to return data
- Select Add Config to choose a column to update.
- Actions to take on each column are defined by column type.
- Select one or more rows in the datagrid and then select update rows. This will take the actions you suggested on all the rows.

## Updates

08/10/26
- Reordered controls in the update rows (#51)
- Data grid cell values no longer wrap (#50)
- Added horizontal scrolling to data grids (#54)
- Vertically aligned controls in the Fields to update list (#53)
- Selected view and FetchXML are cleared when changing table (#55)
- Field definitions are cleared when changing the data query (#52)
- Table selection is kept when reopening the load view dialog (#49)
- Refactored data grid, FetchXML editor, update list and view selector components

22/06/26
- Added clone record with child tables functionality
- Added option to be called from other tools that provide fetchxml
- Added support for multi choice lists.

30/03/26
- Fixed [#33 Does not load active stage](https://github.com/LinkeD365/BulkDataStudio/issues/33)

19/02/26

- Added [#17 Calculated field support](https://github.com/LinkeD365/BulkDataStudio/issues/17)

13/02/26

- Added [#14 FetchXml Edit Support](https://github.com/LinkeD365/BulkDataStudio/issues/14)

25-Jan-26

- Fixed bug with logging
- [#20](https://github.com/LinkeD365/BulkDataStudio/issues/20) Thanks @Ghitafjorback

23-Jan-26

- Added bulk delete & save config functionality

19-Jan-26

- Added Status and Ownership updates and fixed bugs around view selection

## License

MIT
