#!/usr/bin/env python3
"""T-Shirt CRM — Flask backend proxying riin.com supplier API with Cloudinary image upload."""

import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime

import requests as http
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

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
    conn.commit()
    conn.close()


def ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ─── Routes: Static ───────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ─── Routes: Settings ─────────────────────────────────────────────────────────

@app.route("/api/settings", methods=["GET"])
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
def get_order(oid):
    conn = get_db()
    row = conn.execute("SELECT * FROM orders WHERE platform_oid=?", (oid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/orders/<oid>", methods=["PUT"])
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
def update_notes(oid):
    data = request.json or {}
    conn = get_db()
    conn.execute("UPDATE orders SET notes=?,updated_at=? WHERE platform_oid=?",
                 (data.get("notes", ""), ts(), oid))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/orders/<oid>/delivery", methods=["GET"])
def get_delivery(oid):
    return jsonify(supplier_post("/trade/api/interface/queryOrderDelivery", {"platformOidList": [oid]}))


@app.route("/api/orders/sync", methods=["POST"])
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
        return jsonify({"success": True, "updated": 0, "removed": 0})

    updated = 0
    removed = 0
    for i in range(0, len(oids), 100):
        batch = oids[i:i + 100]
        result = supplier_post("/trade/api/interface/queryOrderStatus", {"platformOidList": batch})
        if not result.get("successful"):
            continue
        responded = {item["platformOid"] for item in (result.get("data") or [])}
        orphans = [oid for oid in batch if oid not in responded]

        conn = get_db()
        for item in (result.get("data") or []):
            conn.execute(
                "UPDATE orders SET supplier_status=?,supplier_status_str=?,updated_at=? WHERE platform_oid=?",
                (item["orderStatus"], item.get("orderStateStr", ""), ts(), item["platformOid"]),
            )
            updated += 1
        # Remove orders the supplier has no record of
        for oid in orphans:
            conn.execute("DELETE FROM orders WHERE platform_oid=?", (oid,))
            removed += 1
        conn.commit()
        conn.close()

    return jsonify({"success": True, "updated": updated, "removed": removed})


@app.route("/api/orders/import", methods=["POST"])
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
def get_styles():
    return jsonify(cached_catalog("styles", "/trade/api/interface/queryStyle"))


@app.route("/api/catalog/colors")
def get_colors():
    return jsonify(cached_catalog("colors", "/trade/api/interface/queryColor"))


@app.route("/api/catalog/sizes")
def get_sizes():
    return jsonify(cached_catalog("sizes", "/trade/api/interface/querySize"))


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print("\n  T-Shirt CRM → http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
