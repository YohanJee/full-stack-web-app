import express from "express";
import { urlencoded } from "express";
import mysql2 from "mysql2/promise";
import session from "express-session";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 8006;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  }),
);

app.use("/css", express.static(path.join(__dirname, "static/css")));
app.use("/js", express.static(path.join(__dirname, "static/js")));
app.use(express.static(path.join(__dirname, "static")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

let db;

try {
  db = await mysql2.createConnection({
    host: "cse-mysql-classes-02.cse.umn.edu",
    port: 3306,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
  });
} catch (err) {
  console.error("Database connection failed:", err);
}

console.log("Connected to MYSQL database!");

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}
function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect("/attendees");
  }
  next();
}

app.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login");
});
app.get("/register", redirectIfLoggedIn, (req, res) => {
  res.render("register");
});
app.get("/update-account", requireLogin, (req, res) => {
  res.render("update-account", { user: req.session.user });
});
app.get("/signup", requireLogin, (req, res) => {
  res.render("signup", { user: req.session.user });
});

//Home page
app.get("/", requireLogin, (req, res) => {
  res.render("index", {
    user: req.session.user,
    event: {
      title: "League of Legends Clash Game Night",
      date: "January 9, 2026",
      time: "5:00 PM",
      location: "1709 Fenwick Ave, Eau Claire, WI 54701",
    },
  });
});

app.get("/edit-attendee/:id", requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM attendees WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).send("Attendee not found");
    res.render("edit-attendee", { attendee: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/login");
  });
});

app.get("/attendees", requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM attendees");
    res.render("attendees", { attendees: rows, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/api/attendees", requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM attendees");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT password FROM users WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      return res.render("login", { error: "Username not found" });
    }

    const hashedPassword = rows[0].password;
    if (bcrypt.compareSync(password, hashedPassword)) {
      req.session.user = username;
      return res.redirect("/");
    } else {
      return res.render("login", { error: "Incorrect password" });
    }
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Database error, please try again" });
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (rows.length > 0) {
      return res.status(400).send("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute("INSERT INTO users (username, password) VALUES (?, ?)", [
      username,
      hashedPassword,
    ]);

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/update-account", requireLogin, async (req, res) => {
  const { username, password } = req.body;
  try {
    let sql = "UPDATE users SET username = ?";
    const params = [username];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql += ", password = ?";
      params.push(hashedPassword);
    }

    sql += " WHERE username = ?";
    params.push(req.session.user);

    await db.execute(sql, params);

    req.session.user = username;

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/delete-account", requireLogin, async (req, res) => {
  try {
    await db.execute("DELETE FROM users WHERE username = ?", [
      req.session.user,
    ]);
    req.session.destroy((err) => {
      if (err) console.error(err);
      res.redirect("/login");
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/add-attendee", requireLogin, async (req, res) => {
  const {
    first_name,
    last_name,
    street_address,
    city,
    state,
    country,
    phone,
    email,
    league_id,
    league_rank,
    preferred_position,
  } = req.body;

  try {
    await db.execute(
      `INSERT INTO attendees 
        (first_name, last_name, street_address, city, state, country, phone, email, league_id, league_rank, preferred_position) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        street_address,
        city,
        state,
        country,
        phone,
        email,
        league_id,
        league_rank,
        preferred_position,
      ],
    );
    res.redirect("/attendees");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/update-attendee/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    street_address,
    city,
    state,
    country,
    phone,
    email,
    league_id,
    league_rank,
    preferred_position,
  } = req.body;

  try {
    await db.execute(
      `UPDATE attendees SET
        first_name=?, last_name=?, street_address=?, city=?, state=?, country=?,
        phone=?, email=?, league_id=?, league_rank=?, preferred_position=?
      WHERE id=?`,
      [
        first_name,
        last_name,
        street_address,
        city,
        state,
        country,
        phone,
        email,
        league_id,
        league_rank,
        preferred_position,
        id,
      ],
    );
    res.redirect("/attendees");
  } catch (err) {
    console.error("SQL ERROR:", err.sqlMessage || err);
    res.status(500).send("Database error");
  }
});

//update attendee status
app.post("/api/attendees/:id/status", requireLogin, async (req, res) => {
  const { status } = req.body;
  try {
    await db.execute("UPDATE attendees SET status=? WHERE id=?", [
      status,
      req.params.id,
    ]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

//delete attendee
app.delete("/api/attendees/:id", requireLogin, async (req, res) => {
  try {
    await db.execute("DELETE FROM attendees WHERE id=?", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
