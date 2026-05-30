import { database } from "../index.js";
import { pushLocalChangeToRemote } from "../push-remote.js";

export const stacksRoutes = (app, urlencodedParser) => {
  app.get("/stack/:stackId", (req, res) => {
    database.findOne({ _id: req.params.stackId, deletedAt: { $exists: false } }, (err, doc) => {
      console.log("getting stack: ", req.params.stackId);
      if (err) console.log("err", err);
      res.json({ status: "ok", doc });
    });
  });

  app.get("/stacks", (req, res) => {
    database.find({ docType: "stack", deletedAt: { $exists: false } }, (err, docs) => {
      if (err) console.log("err", err);
      res.json({ status: "ok", docs });
    });
  });

  app.post("/stack/:stackId", urlencodedParser, (req, res) => {
    console.log("req.body", req.body);
    database.insert({ _id: req.params.stackId, ...req.body, updatedAt: Date.now() }, (err, doc) => {
      console.log("adding stack: ", req.params.stackId);
      if (err) console.log("err", err);
      res.json({ status: "ok", doc });
      // Мгновенный push на мастер (фоново)
      if (!err && doc) pushLocalChangeToRemote(doc);
    });
  });

  app.post("/stack/:stackId/update", urlencodedParser, (req, res) => {
    console.log("req.body", req.body);
    database.update(
      { _id: req.params.stackId },
      { $set: { ...req.body, updatedAt: Date.now() } },
      (err, num) => {
        console.log("updating stack: ", req.params.stackId);
        if (err) console.log("err", err);
        res.json({ status: "ok", doc: num });
        // Получаем обновлённый документ и пушим на мастер (фоново)
        if (!err) {
          database.findOne({ _id: req.params.stackId }, (findErr, doc) => {
            if (!findErr && doc) pushLocalChangeToRemote(doc);
          });
        }
      },
    );
  });

  app.put("/stack/:stackId", (req, res) => {
    database.update(
      { _id: req.params.stackId },
      { $set: { ...req.body, updatedAt: Date.now() } },
      (err, num) => {
        console.log("edited stack: ", req.params.stackId);
        if (err) console.log("err", err);
        res.json({ status: "ok", doc: num });
        // Получаем обновлённый документ и пушим на мастер (фоново)
        if (!err) {
          database.findOne({ _id: req.params.stackId }, (findErr, doc) => {
            if (!findErr && doc) pushLocalChangeToRemote(doc);
          });
        }
      },
    );
  });

  app.get("/stack/:stackId/:delete", urlencodedParser, (req, res) => {
    console.log("deleting stack on server", req.params.stackId, req.params.delete);
    // Soft delete — помечаем deletedAt вместо физического удаления
    database.update(
      { _id: req.params.stackId },
      { $set: { deletedAt: Date.now(), updatedAt: Date.now() } },
      (err, num) => {
        console.log("soft-deleted stack: ", req.params.stackId, num);
        if (err) console.log("err", err);
        res.json({ status: "ok", num });
        // Получаем помеченный документ и пушим на мастер (фоново)
        if (!err) {
          database.findOne({ _id: req.params.stackId }, (findErr, doc) => {
            if (!findErr && doc) pushLocalChangeToRemote(doc);
          });
        }
      },
    );
  });
};
