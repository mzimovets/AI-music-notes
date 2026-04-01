import { database } from "../index.js";

export const usersRoutes = (app, urlencodedParser) => {
  const userDocumentQuery = (username) => ({
    username,
    docType: { $in: ["admin", "user"] },
  });

  app.get("/user/:username/settings", (req, res) => {
    const username = req.params.username;

    database.findOne(userDocumentQuery(username), (err, doc) => {
      if (err) {
        console.log("Error finding user settings:", err);
        return res.status(500).json({ error: err });
      }

      if (!doc) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        status: "ok",
        settings: {
          chatVisible: doc.settings?.chatVisible !== false,
        },
      });
    });
  });

  app.put("/user/:username/settings", urlencodedParser, (req, res) => {
    const username = req.params.username;
    const chatVisible = req.body?.chatVisible !== false;

    database.update(
      userDocumentQuery(username),
      {
        $set: {
          "settings.chatVisible": chatVisible,
        },
      },
      {},
      (err, updatedCount) => {
        if (err) {
          console.log("Error updating user settings:", err);
          return res.status(500).json({ error: err });
        }

        if (!updatedCount) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({
          status: "ok",
          settings: {
            chatVisible,
          },
        });
      },
    );
  });

  app.get("/user/:username", (req, res) => {
    const identifier = req.params.username;
    console.log("GET /user/:username called with username:", identifier);
    const query = userDocumentQuery(identifier);
    database.findOne(query, (err, doc) => {
      if (err) {
        console.log("Error finding user:", err);
        return res.status(500).json({ error: err });
      }
      if (doc) {
        if (!doc.role) {
          doc.role = "user";
        }
        console.log("Found user:", doc);
      } else {
        console.log("User not found for username:", identifier);
      }
      res.json({ doc }); // doc должен содержать password (хеш) и role
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

  app.post("/user/:userId", urlencodedParser, (req, res) => {
    database.insert({ _id: req.params.userId, ...req.body }, (err, doc) => {
      console.log("adding user: ", req.params.userId);
      if (err) {
        console.log("err", err);
      }
      res.json({ status: "ok", doc });
    });
  });

  app.put("/user/:userId", urlencodedParser, (req, res) => {
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
