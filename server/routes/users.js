import { database } from "../index.js";

export const usersRoutes = (app) => {
  app.get("/user/:userId", (req, res) => {
    database.findOne({ _id: req.params.userId }, (err, doc) => {
      console.log("getting user: ", req.params.userId);
      if (err) {
        console.log("no find", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.get("/users", (req, res) => {
    database.find({ docType: "user" }, (err, docs) => {
      console.log("getting users: ", docs);
      if (err) {
        console.log("no find", err);
      }
      res.json({ status: "ok", docs });
    });
  });

  app.post("/user/:userId", (req, res) => {
    database.insert({ _id: req.params.userId, ...req.body }, (err, doc) => {
      console.log("adding user: ", req.params.userId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.put("/user/:userId", (req, res) => {
    database.update({ _id: req.params.userId, ...req.body }, (err, doc) => {
      console.log("edited user: ", req.params.userId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.delete("/user/:userId", (req, res) => {
    database.remove({ _id: req.params.userId }, (err, numDeleted) => {
      console.log("delete stack: ", req.params.userId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", numDeleted });
    });
  });
};
