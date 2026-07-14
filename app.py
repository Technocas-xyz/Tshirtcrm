#!/usr/bin/env python3
"""T-Shirt CRM — Flask backend proxying riin.com supplier API with Cloudinary image upload."""

import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime
from functools import wraps

import requests as http
from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "tshirtcrm-secret-change-me-in-production")

CONFIG_FILE = os.path.expanduser("~/.tshirt_api_config.json")
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crm.db")

_catalog_cache: dict = {}
_cache_ts: dict = {}

STATUSES = {
    1: "Store Audit", 2: "Pending Push", 3: "Rejected",
    4: "Factory Audit", 5: "In Production", 12: "Shipped",
    13: "Closed", 14: "Refunding", 15: "Refunded",
}
CACHE_TTL = 3600


# ─── Config ──────────────────────────────────────────────────────────────────

def get_config() -> dict:
    defaults = {
        "secret_key": "7bd905edaa5a2cbf831bf4dac051d0eb",
        "base_url": "https://tshirt.riin.com",
        "env": "prod",
        "cloudinary_cloud_name": "lyn4wlge",
        "cloudinary_api_key": "171822229229393",
        "cloudinary_api_secret": "CarbH0UYzSa-e2y3btPdgnf42Jo",
    }
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            stored = json.load(f)
        defaults.update(stored)
    return defaults


def save_config(config: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


# ─── Supplier API ─────────────────────────────────────────────────────────────

def supplier_post(endpoint: str, body: dict) -> dict:
    cfg = get_config()
    body_str = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    sign = hashlib.md5((body_str + "::" + cfg["secret_key"]).encode()).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "secretKey": cfg["secret_key"],
        "sign": sign,
    }
    try:
        resp = http.post(cfg["base_url"] + endpoint, data=body_str.encode(), headers=headers, timeout=90)
        resp.raise_for_status()
        return resp.json()
    except http.exceptions.Timeout:
        return {"successful": False, "message": "Request timed out — server is processing, check status shortly."}
    except http.exceptions.RequestException as e:
        return {"successful": False, "message": str(e)}


def cached_catalog(key: str, endpoint: str) -> list:
    if key in _catalog_cache and (time.time() - _cache_ts.get(key, 0)) < CACHE_TTL:
        return _catalog_cache[key]
    result = supplier_post(endpoint, {"pageIndex": 1, "pageSize": 1000})
    if result.get("successful"):
        records = result.get("data", {}).get("records", [])
        _catalog_cache[key] = records
        _cache_ts[key] = time.time()
        return records
    return _catalog_cache.get(key, [])


# ─── Cloudinary ───────────────────────────────────────────────────────────────

def cloudinary_upload(file_bytes: bytes, filename: str) -> dict:
    cfg = get_config()
    cloud_name = cfg.get("cloudinary_cloud_name", "")
    api_key = cfg.get("cloudinary_api_key", "")
    api_secret = cfg.get("cloudinary_api_secret", "")
    if not all([cloud_name, api_key, api_secret]):
        return {"error": "Cloudinary not configured"}

    ts = int(time.time())
    sig_str = f"timestamp={ts}{api_secret}"
    signature = hashlib.sha1(sig_str.encode()).hexdigest()

    try:
        resp = http.post(
            f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
            data={"api_key": api_key, "timestamp": ts, "signature": signature},
            files={"file": (filename, file_bytes)},
            timeout=60,
        )
        data = resp.json()
        if "secure_url" in data:
            return {"url": data["secure_url"], "public_id": data.get("public_id", "")}
        return {"error": data.get("error", {}).get("message", "Upload failed")}
    except http.exceptions.RequestException as e:
        return {"error": str(e)}


# ─── Database ─────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            platform_oid        TEXT PRIMARY KEY,
            consignee_name      TEXT DEFAULT '',
            phone               TEXT DEFAULT '',
            address             TEXT DEFAULT '',
            city                TEXT DEFAULT '',
            state               TEXT DEFAULT '',
            country             TEXT DEFAULT 'US',
            post_code           TEXT DEFAULT '',
            courier             TEXT DEFAULT '',
            supplier_status     INTEGER DEFAULT 2,
            supplier_status_str TEXT DEFAULT 'Pending Push',
            notes               TEXT DEFAULT '',
            goods_count         INTEGER DEFAULT 0,
            order_payload       TEXT DEFAULT '{}',
            created_at          TEXT,
            updated_at          TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            full_name   TEXT DEFAULT '',
            is_admin    INTEGER DEFAULT 0,
            is_active   INTEGER DEFAULT 1,
            created_at  TEXT,
            updated_at  TEXT
        )
    """)
    # Create default admin if no users exist
    row = conn.execute("SELECT COUNT(*) FROM users").fetchone()
    if row[0] == 0:
        now = ts()
        conn.execute(
            "INSERT INTO users (username, password, full_name, is_admin, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            ("admin", generate_password_hash("admin123"), "Super Admin", 1, 1, now, now)
        )
    conn.commit()
    conn.close()


def ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ─── Auth ──────────────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Unauthorized"}), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Unauthorized"}), 401
            return redirect(url_for("login_page"))
        if not session.get("is_admin"):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


@app.route("/login", methods=["GET"])
def login_page():
    if "user_id" in session:
        return redirect(url_for("index"))
    return render_template("login.html")


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    if not user["is_active"]:
        return jsonify({"success": False, "message": "Account is disabled"}), 403

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["full_name"] = user["full_name"]
    session["is_admin"] = bool(user["is_admin"])
    return jsonify({"success": True, "user": {"username": user["username"], "full_name": user["full_name"], "is_admin": bool(user["is_admin"])}})


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/auth/me", methods=["GET"])
@login_required
def api_me():
    return jsonify({
        "username": session.get("username"),
        "full_name": session.get("full_name"),
        "is_admin": session.get("is_admin", False),
    })


@app.route("/api/auth/change-password", methods=["POST"])
@login_required
def api_change_password():
    data = request.json or {}
    current = data.get("current_password", "")
    new_pw = data.get("new_password", "")
    if not current or not new_pw:
        return jsonify({"success": False, "message": "Both current and new password required"}), 400
    if len(new_pw) < 4:
        return jsonify({"success": False, "message": "New password must be at least 4 characters"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (session["user_id"],)).fetchone()
    if not user or not check_password_hash(user["password"], current):
        conn.close()
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401

    conn.execute("UPDATE users SET password=?, updated_at=? WHERE id=?",
                 (generate_password_hash(new_pw), ts(), session["user_id"]))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ─── Routes: User Management (Admin only) ─────────────────────────────────────

@app.route("/api/users", methods=["GET"])
@admin_required
def list_users():
    conn = get_db()
    rows = conn.execute("SELECT id, username, full_name, is_admin, is_active, created_at, updated_at FROM users ORDER BY id").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/users", methods=["POST"])
@admin_required
def create_user():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()
    is_admin = 1 if data.get("is_admin") else 0

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
    if len(password) < 4:
        return jsonify({"success": False, "message": "Password must be at least 4 characters"}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"success": False, "message": "Username already exists"}), 409

    now = ts()
    conn.execute(
        "INSERT INTO users (username, password, full_name, is_admin, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        (username, generate_password_hash(password), full_name, is_admin, 1, now, now)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/users/<int:uid>", methods=["PUT"])
@admin_required
def update_user(uid):
    data = request.json or {}
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 404

    full_name = (data.get("full_name") or user["full_name"]).strip()
    is_admin = 1 if data.get("is_admin") else 0
    is_active = 1 if data.get("is_active", user["is_active"]) else 0
    password = data.get("password", "")

    if password:
        if len(password) < 4:
            conn.close()
            return jsonify({"success": False, "message": "Password must be at least 4 characters"}), 400
        conn.execute("UPDATE users SET full_name=?, is_admin=?, is_active=?, password=?, updated_at=? WHERE id=?",
                     (full_name, is_admin, is_active, generate_password_hash(password), ts(), uid))
    else:
        conn.execute("UPDATE users SET full_name=?, is_admin=?, is_active=?, updated_at=? WHERE id=?",
                     (full_name, is_admin, is_active, ts(), uid))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/users/<int:uid>", methods=["DELETE"])
@admin_required
def delete_user(uid):
    if uid == session.get("user_id"):
        return jsonify({"success": False, "message": "Cannot delete yourself"}), 400
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id=?", (uid,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ─── Routes: Static ───────────────────────────────────────────────────────────

@app.route("/")
@login_required
def index():
    return render_template("index.html")


# ─── Routes: Settings ─────────────────────────────────────────────────────────

@app.route("/api/settings", methods=["GET"])
@login_required
def get_settings():
    cfg = get_config()
    return jsonify({
        "secret_key": cfg.get("secret_key", ""),
        "base_url": cfg.get("base_url", "https://tshirt.riin.com"),
        "env": cfg.get("env", "prod"),
        "cloudinary_cloud_name": cfg.get("cloudinary_cloud_name", ""),
        "cloudinary_api_key": cfg.get("cloudinary_api_key", ""),
        "cloudinary_api_secret": cfg.get("cloudinary_api_secret", ""),
    })


@app.route("/api/settings", methods=["POST"])
@login_required
def post_settings():
    data = request.json or {}
    cfg = get_config()
    for key in ["secret_key", "base_url", "env", "cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret"]:
        if key in data:
            cfg[key] = data[key]
    if data.get("env") == "test":
        cfg["base_url"] = "https://tshirt-test.riin.com"
    elif data.get("env") == "prod":
        cfg["base_url"] = "https://tshirt.riin.com"
    save_config(cfg)
    _catalog_cache.clear()
    return jsonify({"success": True})


# ─── Routes: Upload ───────────────────────────────────────────────────────────

@app.route("/api/upload", methods=["POST"])
@login_required
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    result = cloudinary_upload(f.read(), f.filename)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)


# ─── Routes: Orders ───────────────────────────────────────────────────────────

@app.route("/api/orders", methods=["GET"])
@login_required
def list_orders():
    q = request.args.get("q", "")
    status = request.args.get("status", "")
    conn = get_db()
    sql = "SELECT * FROM orders WHERE 1=1"
    params: list = []
    if q:
        sql += " AND (platform_oid LIKE ? OR consignee_name LIKE ? OR city LIKE ? OR phone LIKE ?)"
        params += [f"%{q}%"] * 4
    if status:
        sql += " AND supplier_status = ?"
        params.append(int(status))
    sql += " ORDER BY created_at DESC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/orders", methods=["POST"])
@login_required
def create_order():
    data = request.json or {}
    result = supplier_post("/trade/api/interface/placeOrder", data)
    if not result.get("successful"):
        return jsonify({"success": False, "message": result.get("message", "Unknown error")}), 400
    conn = get_db()
    conn.execute("""
        INSERT OR IGNORE INTO orders
            (platform_oid, consignee_name, phone, address, city, state, country,
             post_code, courier, supplier_status, supplier_status_str,
             goods_count, order_payload, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,2,'Pending Push',?,?,?,?)
    """, (
        data["platformOid"],
        data.get("consigneeName", ""),
        data.get("phone", ""),
        data.get("address", ""),
        data.get("receiverCity", ""),
        data.get("receiverProvince", ""),
        data.get("receiverCountry", "US"),
        data.get("postCode", ""),
        data.get("deliveryCourier", ""),
        len(data.get("goodsList", [])),
        json.dumps(data),
        ts(), ts(),
    ))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "platform_oid": data["platformOid"]})


@app.route("/api/orders/<oid>", methods=["GET"])
@login_required
def get_order(oid):
    conn = get_db()
    row = conn.execute("SELECT * FROM orders WHERE platform_oid=?", (oid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/orders/<oid>", methods=["PUT"])
@login_required
def update_order(oid):
    data = request.json or {}
    result = supplier_post("/trade/api/interface/updateOrder", data)
    if not result.get("successful"):
        return jsonify({"success": False, "message": result.get("message", "Unknown error")}), 400
    conn = get_db()
    conn.execute("""
        UPDATE orders SET consignee_name=?,phone=?,address=?,city=?,state=?,
            country=?,post_code=?,courier=?,updated_at=?
        WHERE platform_oid=?
    """, (
        data.get("consigneeName", ""), data.get("phone", ""),
        data.get("address", ""), data.get("receiverCity", ""),
        data.get("receiverProvince", ""), data.get("receiverCountry", "US"),
        data.get("postCode", ""), data.get("deliveryCourier", ""),
        ts(), oid,
    ))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/orders/<oid>/close", methods=["POST"])
@login_required
def close_order(oid):
    result = supplier_post("/trade/api/interface/closeOrder", {"platformOid": oid})
    if not result.get("successful"):
        return jsonify({"success": False, "message": result.get("message", "Unknown error")}), 400
    conn = get_db()
    conn.execute(
        "UPDATE orders SET supplier_status=13,supplier_status_str='Closed',updated_at=? WHERE platform_oid=?",
        (ts(), oid),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/orders/<oid>/notes", methods=["PUT"])
@login_required
def update_notes(oid):
    data = request.json or {}
    conn = get_db()
    conn.execute("UPDATE orders SET notes=?,updated_at=? WHERE platform_oid=?",
                 (data.get("notes", ""), ts(), oid))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/orders/<oid>/delivery", methods=["GET"])
@login_required
def get_delivery(oid):
    return jsonify(supplier_post("/trade/api/interface/queryOrderDelivery", {"platformOidList": [oid]}))


@app.route("/api/orders/sync", methods=["POST"])
@login_required
def sync_orders():
    data = request.json or {}
    oids = data.get("oids", [])
    if not oids:
        conn = get_db()
        # Sync ALL orders, including terminal ones, so we can detect orphans
        rows = conn.execute("SELECT platform_oid FROM orders").fetchall()
        conn.close()
        oids = [r["platform_oid"] for r in rows]

    if not oids:
        return jsonify({"success": True, "updated": 0})

    updated = 0
    for i in range(0, len(oids), 100):
        batch = oids[i:i + 100]
        result = supplier_post("/trade/api/interface/queryOrderStatus", {"platformOidList": batch})
        if not result.get("successful"):
            continue

        conn = get_db()
        for item in (result.get("data") or []):
            conn.execute(
                "UPDATE orders SET supplier_status=?,supplier_status_str=?,updated_at=? WHERE platform_oid=?",
                (item["orderStatus"], item.get("orderStateStr", ""), ts(), item["platformOid"]),
            )
            updated += 1
        conn.commit()
        conn.close()

    return jsonify({"success": True, "updated": updated})


@app.route("/api/orders/import", methods=["POST"])
@login_required
def import_order():
    """Import an existing supplier order into local DB by its platformOid."""
    data = request.json or {}
    oid = (data.get("platformOid") or "").strip()
    if not oid:
        return jsonify({"success": False, "message": "platformOid is required"}), 400

    result = supplier_post("/trade/api/interface/queryOrderInfo", {"platformOidList": [oid]})
    if not result.get("successful") or not result.get("data"):
        return jsonify({"success": False, "message": "Order not found on supplier portal"}), 404

    o = result["data"][0]
    now = ts()
    conn = get_db()
    conn.execute("""
        INSERT OR REPLACE INTO orders
            (platform_oid, consignee_name, phone, address, city, state, country,
             post_code, courier, supplier_status, supplier_status_str,
             notes, goods_count, order_payload, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        o["platformOid"],
        o.get("consigneeName", ""),
        o.get("phone", ""),
        o.get("address", ""),
        o.get("receiverCity", ""),
        o.get("receiverProvince", ""),
        o.get("receiverCountry", "US"),
        o.get("postCode", ""),
        o.get("deliveryCourier", ""),
        o.get("orderStatus", 2),
        STATUSES.get(o.get("orderStatus", 2), ""),
        "",
        o.get("goodsTotalQty", 0),
        json.dumps(o),
        o.get("orderTime", now),
        now,
    ))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "platform_oid": o["platformOid"]})


# ─── Routes: Catalog ──────────────────────────────────────────────────────────

@app.route("/api/catalog/styles")
@login_required
def get_styles():
    return jsonify(cached_catalog("styles", "/trade/api/interface/queryStyle"))


@app.route("/api/catalog/colors")
@login_required
def get_colors():
    return jsonify(cached_catalog("colors", "/trade/api/interface/queryColor"))


@app.route("/api/catalog/sizes")
@login_required
def get_sizes():
    return jsonify(cached_catalog("sizes", "/trade/api/interface/querySize"))


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print("\n  T-Shirt CRM → http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
