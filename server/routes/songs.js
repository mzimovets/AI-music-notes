import { database } from "../index.js";

export const songsRoutes = (app) => {
  app.get("/song/:songId", (req, res) => {
    database.findOne({ _id: req.params.songId }, (err, doc) => {
      console.log("getting song: ", req.params.songId);
      if (err) {
        console.log("no find", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.get("/songs", (req, res) => {
    database.find({ docType: "song" }, (err, docs) => {
      console.log("getting songs: ", docs);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", docs });
    });
  });

  app.post("/song/:songId", (req, res) => {
    database.insert({ _id: req.params.songId, ...req.body }, (err, doc) => {
      console.log("adding song: ", req.params.songId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.put("/song/:songId", (req, res) => {
    database.update({ _id: req.params.songId, ...req.body }, (err, doc) => {
      console.log("edited song: ", req.params.songId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });
};
