// Временная диагностика бага "ноты становятся маленькими" (см. app/home/pdfjs.tsx
// и app/stackView/[id]/components/SwipeBookViewer.tsx). Баг вероятностный,
// не воспроизводится по требованию — гадать дальше по коду бессмысленно,
// нужны факты прямо с планшета в момент, когда это происходит.
//
// Планшет шлёт сюда каждое измерение размера и, отдельно, что реально ушло в
// отрисовку canvas вместе с честным повторным замером контейнера в тот же
// момент. Если они разошлись — врёт состояние React (где-то применилось
// устаревшее значение). Если совпали — контейнер на экране действительно
// маленький в этот момент, и дело не в замере, а в раскладке выше по дереву.
//
// Без авторизации: это только числа и метки времени, ничего личного, а
// планшет в момент бага может быть без интернета — только с платой в
// локальной сети.
//
// Снять после того, как причина найдётся — файл, маршрут в index.js и
// клиентский lib/viewer-diag.ts.

import "../nedb-compat.js";
import Datastore from "nedb";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const diagDb = new Datastore({
  filename: path.join(__dirname, "..", "viewer_diag.db"),
  autoload: true,
});
diagDb.ensureIndex({ fieldName: "ts" });

// Не даём базе расти бесконечно, если снять диагностику забудут — старше
// суток вычищаем при каждой новой записи
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const viewerDiagRoutes = (app) => {
  app.post("/api/viewer-diag", (req, res) => {
    const body = req.body ?? {};
    if (!body.event) return res.status(400).json({ ok: false });

    diagDb.insert({ ...body, ts: Date.now(), ip: req.ip }, (err) => {
      if (err) console.warn("[viewer-diag] Не удалось сохранить:", err.message);
    });
    diagDb.remove({ ts: { $lt: Date.now() - MAX_AGE_MS } }, { multi: true }, () => {});

    res.json({ ok: true });
  });

  // Смотреть глазами: /api/viewer-diag?session=... или без параметров —
  // последние 500 записей всех сессий
  app.get("/api/viewer-diag", (req, res) => {
    const query = req.query.session ? { session: req.query.session } : {};
    diagDb
      .find(query)
      .sort({ ts: 1 })
      .limit(2000)
      .exec((err, docs) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: "ok", count: docs.length, docs });
      });
  });
};
