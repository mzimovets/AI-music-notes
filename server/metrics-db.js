// Отдельная NeDB-коллекция для метрик синхронизации.
// Вынесена в отдельный модуль, чтобы не создавать circular import между
// index.js → routes/sync.js и sync-client.js → index.js.

import Datastore from "nedb";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const metricsDb = new Datastore({
  filename: path.join(__dirname, "sync_metrics.db"),
  autoload: true,
});

// Индекс по timestamp для быстрой сортировки
metricsDb.ensureIndex({ fieldName: "timestamp" });
