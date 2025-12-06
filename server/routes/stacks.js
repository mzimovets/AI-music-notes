import { database } from "../index.js";

export const stacksRoutes = (app) => {
  app.get("/stack/:stackId", (req, res) => {
    database.findOne({ _id: req.params.stackId }, (err, doc) => {
      console.log("getting stack: ", req.params.stackId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.get("/stacks", (req, res) => {
    database.find({ docType: "stack" }, (err, docs) => {
      console.log("getting stacks: ", docs);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", docs });
    });
  });

  app.post("/stack/:stackId", (req, res) => {
    database.insert({ _id: req.params.stackId, ...req.body }, (err, doc) => {
      console.log("adding stack: ", req.params.stackId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.put("/stack/:stackId", (req, res) => {
    database.update({ _id: req.params.stackId, ...req.body }, (err, doc) => {
      console.log("editer stack: ", req.params.stackId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.delete("/stack/:stackId", (req, res) => {
    database.remove({ _id: req.params.stackId }, (err, numDeleted) => {
      console.log("delete stack: ", req.params.stackId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", numDeleted });
    });
  });
};
