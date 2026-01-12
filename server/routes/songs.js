import { database } from "../index.js";

export const songsRoutes = (app, urlencodedParser, upload) => {
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

  app.get("/songs/:category", (req, res) => {
    console.log("GET songs category", req.params);
    database.find(
      { docType: "song", category: req.params.category },
      (err, docs) => {
        console.log("getting songs: ", docs);
        if (err) {
          console.log("err", err);
        }
        res.json({ status: "ok", docs });
      }
    );
  });

  // Add Multer middleware
  app.post(
    "/song/:songId",
    urlencodedParser,
    upload.single("file"),
    (req, res) => {
      const serverSong = { ...req.body, file: req.file };
      console.log("req.file", req.file);
      database.insert({ _id: req.params.songId, ...serverSong }, (err, doc) => {
        console.log("adding song: ", req.params.songId, serverSong);
        if (err) {
          console.log("err", err);
        }
        res.json({ status: "ok", doc });
      });
    }
  );

  app.post(
    "/song/:songId/:update",
    urlencodedParser,
    upload.single("file"),
    (req, res) => {
      const serverSong = { ...req.body };
      if (req.file) {
        serverSong.file = req.file;
        console.log("req.file", req.file);
      }
      console.log(req.params._id);
      database.update(
        { _id: req.params.songId },
        { $set: { ...serverSong } },
        (err, doc) => {
          console.log("edited song: ", req.params.songId);
          if (err) {
            console.log("err", err);
          }
          res.json({ status: "ok", doc });
        }
      );
    }
  );

  app.get("/song/:songId/:delete", urlencodedParser, (req, res) => {
    console.log(
      "deleting song on server",
      req.params.songId,
      req.params.delete
    );
    database.remove({ _id: req.params.songId }, (err, num) => {
      console.log("deleting song: ", req.params.songId, num);
      if (err) {
        console.log("err", err);
      }
      // Добавить удаление файла
      res.json({ status: "ok", num });
    });
  });
};
