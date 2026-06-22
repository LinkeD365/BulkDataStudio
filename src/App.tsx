import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useConnection,
  useEventLog,
  useToolboxEvents,
} from "./hooks/useToolboxAPI";
import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import { BulkDataStudio } from "./components/BulkDataStudio";
import { dvService } from "./utils/dataverseService";
import { utilService } from "./utils/utils";
import { ViewModel } from "./model/vm";

function App() {
  const { connection, refreshConnection } = useConnection();
  const { addLog } = useEventLog();
  const [theme, setTheme] = useState<string>("light");
  const invocationContextHandledRef = useRef(false);
  // Handle platform events
  const handleEvent = useCallback(
    async (event: string, _data: any) => {
      switch (event) {
        case "connection:updated":
        case "connection:created":
          refreshConnection();
          break;

        case "connection:deleted":
          refreshConnection();
          break;

        case "terminal:output":
        case "terminal:command:completed":
        case "terminal:error":
          // Terminal events handled by dedicated components
          break;
        case "settings:updated":
          if (_data && _data.theme) {
            document.body.setAttribute("data-theme", _data.theme);
            document.body.setAttribute("data-ag-theme-mode", _data.theme);
            setTheme(_data.theme);
          }

          break;
        default:
          addLog(`Unhandled event: ${event}`, "warning");
          break;
      }
    },
    [refreshConnection, addLog],
  );

  useToolboxEvents(handleEvent);

  // Add initial log (run only once on mount)
  useEffect(() => {
    (async () => {
      const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
      document.body.setAttribute("data-theme", currentTheme);
      document.body.setAttribute("data-ag-theme-mode", currentTheme);
      setTheme(currentTheme);
    })();
    addLog("Bulk Data Studio initialized", "success");
  }, [addLog]);

  const dvSvc = useMemo(() => {
    if (!connection) return null;
    return new dvService({
      connection: connection,
      dvApi: window.dataverseAPI,
      onLog: addLog,
    });
  }, [connection, addLog]);

  const [viewModel] = useState(() => new ViewModel());
  const utils = useMemo(() => {
    if (!connection) return null;
    return new utilService({
      dvSvc: dvSvc!,
      vm: viewModel,
      onLog: addLog,
    });
  }, [dvSvc, viewModel, addLog]);

  useEffect(() => {
    if (!connection || !dvSvc || !utils) {
      return;
    }

    if (invocationContextHandledRef.current) {
      return;
    }

    invocationContextHandledRef.current = true;

    (async () => {
      try {
        if (!window.toolboxAPI.invocation) {
          return;
        }

        const launchContext =
          await window.toolboxAPI.invocation.getLaunchContext();
        if (!launchContext || typeof launchContext !== "object") {
          return;
        }

        const fetchXmlCandidate =
          (typeof launchContext.fetchXml === "string" &&
            launchContext.fetchXml) ||
          (typeof launchContext.fetchxml === "string" &&
            launchContext.fetchxml) ||
          (typeof launchContext.xml === "string" && launchContext.xml) ||
          "";
        const fetchXml = fetchXmlCandidate.trim();

        if (!fetchXml) {
          addLog(
            "Invocation context was provided but no fetchXml payload was found",
            "warning",
          );
          return;
        }

        addLog(
          "Invocation payload received. Running FetchXML query...",
          "info",
        );
        viewModel.selectedView = undefined;
        viewModel.fetchXml = fetchXml;
        //viewModel.fetchFields = [];

        const tableMatch = fetchXml.match(
          /<entity\s+name=['\"]([^'\"]+)['\"]/i,
        );
        const tableLogicalName = tableMatch?.[1];

        if (tableLogicalName) {
          if (!viewModel.tables || viewModel.tables.length === 0) {
            viewModel.tables = await dvSvc.getTables();
          }

          const matchedTable = viewModel.tables.find(
            (t) => t.logicalName === tableLogicalName,
          );
          if (matchedTable) {
            viewModel.selectedTable = matchedTable;
            if (!matchedTable.fields || matchedTable.fields.length === 0) {
              matchedTable.fields = await dvSvc.getFields(
                matchedTable.logicalName,
              );
            }
          } else {
            addLog(
              `Table ${tableLogicalName} from FetchXML was not found in this environment`,
              "warning",
            );
          }
        }

      //  viewModel.isDataLoading = true;
        // try {
        //   await utils.loadData();
        //   await window.toolboxAPI.invocation.returnData({
        //     status: "success",
        //     recordCount: Array.isArray(viewModel.data)
        //       ? viewModel.data.length
        //       : 0,
        //   });
        //   addLog("FetchXML invocation query completed", "success");
        // } finally {
        //   viewModel.isDataLoading = false;
        // }
      } catch (error: any) {
        const message =
          error && typeof error.message === "string"
            ? error.message
            : String(error);
        addLog(`Failed to run invocation FetchXML query: ${message}`, "error");
        await window.toolboxAPI.invocation.returnData({
          status: "error",
          error: message,
        });
      }
    })();
  }, [connection, dvSvc, utils, viewModel, addLog]);
  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      <BulkDataStudio
        connection={connection}
        dvSvc={dvSvc!}
        vm={viewModel}
        onLog={addLog}
        utils={utils!}
      />
    </FluentProvider>
  );
}

export default App;
