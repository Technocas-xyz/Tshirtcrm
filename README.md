# T-Shirt CRM

A web-based order management system for the riin.com T-shirt fulfillment API. Place orders, upload print/mockup images via Cloudinary, track status, and keep notes — all from one page.

---

## Setup

**Requirements:** Python 3.8+

```bash
cd tshirt-crm
pip install flask requests
python app.py
```

Open **http://localhost:5000** in your browser.

To stop the server, press **Ctrl + C** in the terminal where it's running.

---

## Pages

### Dashboard
Overview of all orders with counts by status and a recent orders list.

### Orders
Full order list with search and status filter tabs (All / Pending / Production / Shipped / Closed).

- **Click any row** to open the order detail panel on the right.
- **Sync All** — pulls the latest status for every order from the supplier. Any order in the local DB that no longer exists on the supplier portal is automatically removed.
- **Import Order** — enter an order ID from the supplier portal to pull it into the CRM (useful for orders placed outside this tool).

### New Order
Form to place a new order with the supplier.

1. Fill in the order ID (auto-generated, must be unique), recipient details, and shipping address.
2. Click **Add Item** for each T-shirt in the order. Per item:
   - Select style, color, size, craft type (Heat Transfer or DTG), and quantity.
   - Upload a **Print Image** (PNG — the artwork that gets printed).
   - Upload a **Mockup Image** (the preview/effect shot).
   - Images are uploaded to Cloudinary automatically; the Cloudinary URL is sent to the supplier.
3. Click **Place Order**. The supplier processes the images server-side, so this may take up to 90 seconds.

### Catalog
Browse the supplier's available styles, colors, and sizes. Data is cached for 1 hour.

### Settings
Change credentials without restarting the server. All fields are saved to `~/.tshirt_api_config.json`.

| Field | Description |
|---|---|
| Secret Key | Supplier API secret key |
| Base URL / Environment | Production (`tshirt.riin.com`) or Test (currently unreachable) |
| Cloudinary Cloud Name | Your Cloudinary account name |
| Cloudinary API Key | From the Cloudinary dashboard |
| Cloudinary API Secret | From the Cloudinary dashboard |

Click **Test Connection** to verify the supplier API is reachable before saving.

---

## Order Detail Panel

Click any order row to open the side panel.

| Action | What it does |
|---|---|
| **Sync Status** | Refreshes this single order's status from the supplier |
| **Tracking** | Fetches the shipping tracking number and waybill link |
| **Update Shipping** | Opens a form to correct the recipient's address or carrier (only works while the order is still Pending Push) |
| **Close Order** | Cancels the order on the supplier side — irreversible |
| **Notes** | Free-text field visible only inside the CRM, not sent to the supplier |

---

## Order Statuses

| Status | Meaning |
|---|---|
| Pending Push | Received by us, not yet confirmed by supplier factory |
| Store Audit | Under review by the supplier |
| Factory Audit | Accepted by the factory |
| In Production | Being printed and assembled |
| Shipped | Dispatched — tracking number available |
| Closed | Cancelled |
| Rejected | Supplier rejected the order — check the panel for reason |
| Refunding / Refunded | Refund in progress or complete |

---

## Image Requirements

| Type | Purpose | Notes |
|---|---|---|
| Print Image | The artwork applied to the garment | PNG preferred; must be accessible from China (use Cloudinary — do not use Dropbox, Google Drive, or local paths) |
| Mockup Image | Preview/effect photo | Any common image format |

Both images are **required** for every item. The supplier's server downloads them during order creation, which is why placement can take up to 90 seconds.

---

## Tips

- **Order IDs must be globally unique.** The auto-generated format (`ORD-YYMMDDHHMMSS`) is safe to use as-is. Never reuse a closed order's ID.
- **Craft types:** Heat Transfer (烫画) is the default for most styles. DTG (直喷/Direct-to-Garment) is available on select styles — check the Catalog page.
- If an order gets stuck on **Pending Push** for more than a few hours, use Sync Status to check. The supplier portal may have rejected it silently.
- Sync All only removes orders that the supplier has no record of — it will never delete orders the supplier knows about, regardless of status.
