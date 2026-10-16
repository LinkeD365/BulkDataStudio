import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useConnection,
  useEventLog,
  useToolboxEvents,
} from "./hooks/useToolboxAPI";
import {
  FluentProvider,
  Spinner,
  Text,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import { BulkDataStudio } from "./components/BulkDataStudio";
import { dvService } from "./utils/dataverseService";
import { utilService } from "./utils/utils";
import { ViewModel } from "./model/vm";

function App() {
  const { connection, isLoading, refreshConnection } = useConnection();
  const { addLog } = useEventLog();
  const [theme, setTheme] = useState<string>("light");
  const invocationContextConnectionRef = useRef<string | null>(null);
  const previousConnectionIdRef = useRef<string | null>(null);
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

  const viewModel = useMemo(() => new ViewModel(), [connection?.id]);

  const dvSvc = useMemo(() => {
    if (!connection) return null;
    return new dvService({
      connection: connection,
      dvApi: window.dataverseAPI,
      onLog: addLog,
    });
  }, [connection, addLog]);

  useEffect(() => {
    const currentConnectionId = connection?.id ?? null;
    const previousConnectionId = previousConnectionIdRef.current;

    if (previousConnectionId !== null && previousConnectionId !== currentConnectionId) {
      addLog("Connection changed. Loaded data and pending operations were cleared.", "warning");
      void window.toolboxAPI.utils.showNotification({
        title: "Connection Changed",
        body: "Loaded records and pending operations were cleared to prevent changes in the wrong environment.",
        type: "warning",
      });
    }

    previousConnectionIdRef.current = currentConnectionId;
  }, [connection?.id, addLog]);

  const utils = useMemo(() => {
    if (!connection || !dvSvc) return null;
    return new utilService({
      dvSvc,
      vm: viewModel,
      onLog: addLog,
    });
  }, [dvSvc, viewModel, addLog]);

  useEffect(() => {
    if (!connection || !dvSvc || !utils) {
      return;
    }

    if (invocationContextConnectionRef.current === connection.id) {
      return;
    }

    invocationContextConnectionRef.current = connection.id;

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
          launchContext.fetchxml ?? launchContext.fetchXml ?? launchContext.xml;
        if (
          typeof fetchXmlCandidate !== "string" ||
          !fetchXmlCandidate.trim()
        ) {
          throw new Error(
            "The invocation payload must include a non-empty fetchxml string.",
          );
        }

        addLog(
          "Invocation payload received. Loading FetchXML records...",
          "info",
        );
        viewModel.selectedView = undefined;
        viewModel.updateCols = [];
        viewModel.fetchFields = [];
        viewModel.selectedRows = [];
        viewModel.data = [];
        viewModel.fetchXml = fetchXmlCandidate.trim();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        addLog(`Failed to accept invocation FetchXML: ${message}`, "error");
        await window.toolboxAPI.utils.showNotification({
          title: "Error Receiving FetchXML",
          body: message,
          type: "error",
        });
      }
    })();
  }, [connection, dvSvc, utils, viewModel, addLog]);

  const content =
    connection && dvSvc && utils ? (
      <BulkDataStudio
        key={connection.id}
        connection={connection}
        dvSvc={dvSvc}
        vm={viewModel}
        onLog={addLog}
        utils={utils}
      />
    ) : (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        {isLoading ? <Spinner label="Loading connection..." /> : <Text>Select a Dataverse connection to continue.</Text>}
      </div>
    );

  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      {content}
    </FluentProvider>
  );
}

export default App;
