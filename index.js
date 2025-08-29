const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

const ADMIN_PASSWORD = "ikall22";

// 🔗 Ganti dengan connection string MongoDB Atlas kamu
const uri = "mongodb+srv://oppoanggun813_db_user:<db_password>@ikall.pjnpr4w.mongodb.net/?retryWrites=true&w=majority&appName=ikall";
const client = new MongoClient(uri);

let collection;

// Koneksi MongoDB
async function connectDB() {
  await client.connect();
  const db = client.db("ipManager"); // nama database
  collection = db.collection("allowed_ips"); // nama collection
  console.log("✅ Connected to MongoDB");
}
connectDB();

app.use(bodyParser.urlencoded({ extended: true }));

// Middleware auth
function checkAuth(req, res, next) {
  if (req.query.password === ADMIN_PASSWORD) {
    next();
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login</title>
        <style>
          body {
            margin: 0;
            background: #111;
            color: #fff;
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          form {
            background: #1f1f1f;
            padding: 25px;
            border-radius: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            width: 90%;
            max-width: 360px;
            animation: fadeIn 0.5s ease;
          }
          input, button {
            width: 100%;
            padding: 12px;
            border-radius: 10px;
            border: none;
            margin-bottom: 15px;
            font-size: 16px;
          }
          input {
            border: 1px solid #333;
            background: #2b2b2b;
            color: #fff;
          }
          button {
            background: #2563eb;
            color: #fff;
            font-weight: bold;
            cursor: pointer;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        </style>
      </head>
      <body>
        <form method="GET" action="/">
          <h2 style="text-align:center;margin-bottom:20px;">🔐 Masukkan Password</h2>
          <input type="password" name="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
      </body>
      </html>
    `);
  }
}

app.get("/", checkAuth, (req, res) => {
  const ips = await collection.find().toArray();

  let total = ips.length;
  let active = ips.filter(x => !x.status || x.status === "active").length;

  let rows = ips.map((ipObj, idx) => {
    let ip = typeof ipObj === "string" ? ipObj : ipObj.ip;
    return `
      <div class="ip-card">
        <div class="ip-text">${ip}</div>
        <div class="btn-group">
          <button onclick="openEditModal(${idx}, '${ip}')" class="btn btn-warning">Edit</button>
          <button onclick="openDeleteModal(${idx}, '${ip}')" class="btn btn-danger">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Manage IPs</title>
      <style>
        :root {
          --bg: #111;
          --text: #fff;
          --card-bg: #1e1e1e;
        }
        .light {
          --bg: #f3f4f6;
          --text: #111;
          --card-bg: #fff;
        }
        body {
          margin: 0;
          font-family: sans-serif;
          background: var(--bg);
          color: var(--text);
          transition: background 0.3s, color 0.3s;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          padding: 15px;
          box-sizing: border-box;
        }
        h2 { margin: 0; }
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        /* Toggle Dark/Light Bulat Kecil */
        .theme-toggle {
          width: 30px;
          height: 30px;
          font-size: 16px;
          border: none;
          border-radius: 50%;
          background: #444;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.3s;
        }
        .theme-toggle:hover { transform: scale(1.2); background: #666; }

        .card {
          background: var(--card-bg);
          padding: 12px;
          border-radius: 10px;
          text-align: center;
          flex: 1;
          margin: 0 5px;
        }
        .stats {
          display: flex;
          justify-content: space-around;
          margin: 15px 0;
        }
        input, button {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #444;
          margin-bottom: 10px;
          background: var(--card-bg);
          color: var(--text);
          font-size: 16px;
        }
        button { cursor: pointer; border: none; }
        .btn {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          border: none;
        }
        .btn-warning { background: #f59e0b; }
        .btn-danger { background: #dc2626; }
        .btn-primary {
          background: #2563eb;
          font-weight: bold;
          font-size: 16px;
        }
        .ip-card {
          background: var(--card-bg);
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .ip-text { font-size: 16px; font-weight: bold; }
        .btn-group { display: flex; gap: 8px; margin-top: 10px; }

        /* Modal Styling */
        .modal {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.7);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }
        .modal-content {
          background: var(--card-bg);
          padding: 20px;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from {opacity: 0; transform: scale(0.9);}
          to {opacity: 1; transform: scale(1);}
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="top-bar">
          <h2>📋 Manage IPs</h2>
          <button onclick="toggleTheme()" class="theme-toggle">🌓</button>
        </div>
        <p style="color:gray;font-size:14px;margin:5px 0 15px;">Kelola daftar IP dengan mudah</p>

        <div class="stats">
          <div class="card">
            <div style="font-size:18px;font-weight:bold;">${total}</div>
            <div style="font-size:12px;">Total</div>
          </div>
          <div class="card">
            <div style="font-size:18px;font-weight:bold;">${active}</div>
            <div style="font-size:12px;">Active</div>
          </div>
        </div>

        <form method="POST" action="/add?password=${req.query.password}">
          <input type="text" name="ip" placeholder="Masukkan IP baru" required />
          <button type="submit" class="btn-primary">+ Tambah IP</button>
        </form>

        <input type="text" id="search" placeholder="🔍 Cari IP..." />
        <div id="ipList">${rows}</div>
      </div>

      <!-- Edit Modal -->
      <div class="modal" id="editModal">
        <div class="modal-content">
          <h3>Edit IP</h3>
          <input type="text" id="editInput" />
          <button onclick="saveEdit()" class="btn-primary" style="margin-top:10px;">Simpan</button>
          <button onclick="closeModal('editModal')" style="margin-top:5px;background:#444;">Batal</button>
        </div>
      </div>

      <!-- Delete Modal -->
      <div class="modal" id="deleteModal">
        <div class="modal-content">
          <h3>Hapus IP?</h3>
          <p id="deleteText"></p>
          <button onclick="confirmDeleteAction()" class="btn-danger" style="margin-top:10px;">Hapus</button>
          <button onclick="closeModal('deleteModal')" style="margin-top:5px;background:#444;">Batal</button>
        </div>
      </div>

      <script>
        let editId = null, deleteId = null;

        function toggleTheme(){ document.body.classList.toggle("light"); }

        document.getElementById("search").addEventListener("keyup", function(){
          let filter = this.value.toLowerCase();
          document.querySelectorAll("#ipList > div").forEach(row=>{
            let ip = row.querySelector(".ip-text").textContent.toLowerCase();
            row.style.display = ip.includes(filter) ? "" : "none";
          });
        });

        function openEditModal(id, ip) {
          editId = id;
          document.getElementById("editInput").value = ip;
          document.getElementById("editModal").style.display = "flex";
        }

        function openDeleteModal(id, ip) {
          deleteId = id;
          document.getElementById("deleteText").textContent = "Anda yakin ingin menghapus IP: " + ip + "?";
          document.getElementById("deleteModal").style.display = "flex";
        }

        function closeModal(modalId) {
          document.getElementById(modalId).style.display = "none";
        }

        function saveEdit() {
          let newIP = document.getElementById("editInput").value.trim();
          if(newIP){
            window.location.href = "/edit?id=" + editId + "&newIP=" + newIP + "&password=${req.query.password}";
          }
        }

        function confirmDeleteAction() {
          window.location.href = "/delete?id=" + deleteId + "&password=${req.query.password}";
        }
      </script>
    </body>
    </html>
  `);
});

app.post("/add", async (req, res) => {
  const ip = req.body.ip.trim();
  const existing = await collection.findOne({ ip });
  if (!existing) {
    await collection.insertOne({ ip, status: "active" });
  }
  res.redirect("/?password=" + req.query.password);
});

app.get("/delete", async (req, res) => {
  await collection.deleteOne({ _id: new ObjectId(req.query.id) });
  res.redirect("/?password=" + req.query.password);
});

app.get("/edit", async (req, res) => {
  await collection.updateOne(
    { _id: new ObjectId(req.query.id) },
    { $set: { ip: req.query.newIP } }
  );
  res.redirect("/?password=" + req.query.password);
});

module.exports = app;
