import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useEventLog, useToolboxEvents } from "./hooks/useToolboxAPI";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { BulkDataStudio } from "./components/BulkDataStudio";
import { dvService } from "./utils/dataverseService";
import { utilService } from "./utils/utils";
import { ViewModel } from "./model/vm";

function App() {
  const { connection, refreshConnection } = useConnection();
  const { addLog } = useEventLog();
  const [theme, setTheme] = useState<string>("light");
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
    addLog("React Sample Tool initialized", "success");
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

  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      <BulkDataStudio connection={connection} dvSvc={dvSvc!} vm={viewModel} onLog={addLog} utils={utils!} />
    </FluentProvider>
  );
}

export default App;
