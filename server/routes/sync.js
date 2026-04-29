import { database } from "../index.js";

function verifyApiKey(req, res, next) {
  const key = process.env.SYNC_API_KEY;
  if (!key) return res.status(503).json({ error: "Sync not configured on this server" });

  const auth = req.headers["authorization"] || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!provided || provided !== key) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export const syncRoutes = (app) => {
  // GET /api/sync/export?since=<unix_ms>
  // Возвращает все записи (songs + stacks), изменённые после `since`.
  // Включает soft-deleted записи, чтобы реплика могла их удалить у себя.
  app.get("/api/sync/export", verifyApiKey, (req, res) => {
    const since = parseInt(req.query.since) || 0;

    database.find(
      {
        docType: { $in: ["song", "stack"] },
        updatedAt: { $gt: since },
      },
      (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });

        const songs = docs.filter((d) => d.docType === "song");
        const stacks = docs.filter((d) => d.docType === "stack");

        // Отдельно — ID записей, которые были мягко удалены после `since`
        const deletedSongIds = songs
          .filter((d) => d.deletedAt && d.deletedAt > since)
          .map((d) => d._id);
        const deletedStackIds = stacks
          .filter((d) => d.deletedAt && d.deletedAt > since)
          .map((d) => d._id);

        // Живые записи для upsert на реплике
        const liveSongs = songs.filter((d) => !d.deletedAt);
        const liveStacks = stacks.filter((d) => !d.deletedAt);

        res.json({
          timestamp: Date.now(),
          songs: liveSongs,
          stacks: liveStacks,
          deletedSongIds,
          deletedStackIds,
        });
      },
    );
  });

  // GET /api/health — проверка доступности сервера (без аутентификации)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", ts: Date.now() });
  });
};
