import { database } from "../index.js";

export const stacksRoutes = (app, urlencodedParser) => {
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

  app.post("/stack/:stackId", urlencodedParser, (req, res) => {
    console.log("req.body", req.body);
    database.insert({ _id: req.params.stackId, ...req.body }, (err, doc) => {
      console.log("adding stack: ", req.params.stackId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.post("/stack/:stackId/update", urlencodedParser, (req, res) => {
    console.log("req.body", req.body);
    database.update(
      { _id: req.params.stackId },
      { $set: { ...req.body } },
      (err, doc) => {
        console.log("updating stack: ", req.params.stackId);
        if (err) {
          console.log("err", err);
        }
        res.json({ status: "ok", doc });
      },
    );
  });

  app.put("/stack/:stackId", (req, res) => {
    database.update(
      { _id: req.params.stackId },
      { $set: { ...req.body } },
      (err, doc) => {
        console.log("editer stack: ", req.params.stackId);
        if (err) {
          console.log("err", err);
        }
        res.json({ status: "ok", doc });
      },
    );
  });

  app.get("/stack/:stackId/:delete", urlencodedParser, (req, res) => {
    console.log(
      "deleting stack on server",
      req.params.stackIdId,
      req.params.delete,
    );
    database.remove({ _id: req.params.stackId }, (err, num) => {
      console.log("deleting stack: ", req.params.stackId, num);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", num });
    });
  });
};

global.io.on("connection", (socket) => {
  socket.on("stack-updated", (data) => {
    socket.broadcast.emit("stack-updated", data);
  });
});
