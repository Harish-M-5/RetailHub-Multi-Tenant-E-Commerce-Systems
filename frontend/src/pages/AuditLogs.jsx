import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/audit-logs").then(({ data }) => setLogs(data.logs));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="card divide-y divide-gray-100 dark:divide-gray-800">
        {logs.map((log) => (
          <div key={log._id} className="py-3 text-sm">
            <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
            <p className="text-gray-500">{log.details}</p>
            <p className="text-xs text-gray-400">{log.performedByName} · {new Date(log.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-500 py-4">No audit logs yet.</p>}
      </div>
    </div>
  );
}
