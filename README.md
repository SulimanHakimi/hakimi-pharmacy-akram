# Hakimi Pharmacy — Management System

Pharmacy management system: point of sale with printed invoices, inventory with buy and
sell prices, suppliers, purchase orders, prescriptions, customer credit (نسیه), finance
and printable reports.

- **Frontend** — Next.js (App Router) + React, plain JavaScript
- **Backend** — Node.js + Express
- **Database** — MongoDB (Mongoose)

Bazar Zahid Abad, Mohammad Agha, Logar · License PH-2214

## Accounts

Two accounts, created by `npm run init` from passwords you choose. Each person changes
their own password from **Settings** after first sign-in.

| Account | Role | Can reach |
|---|---|---|
| Akram Hakimi | Administrator | Everything |
| Sales counter | Salesperson | Point of Sale and Invoices only |

Permissions are enforced in two places: the sidebar only shows pages the account may
open, and every API route checks the same permission. A salesperson who types
`/finance` into the address bar is redirected, and the underlying request returns 403.

## First run

**1. Point the backend at your MongoDB and set the two passwords** in `backend/.env`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/hakimi_pharmacy
JWT_SECRET=<a long random string>
ADMIN_NAME=Akram Hakimi
ADMIN_EMAIL=akram@hakimipharmacy.af
ADMIN_PASSWORD=<choose one, min 8 characters>
SELLER_NAME=Sales Counter
SELLER_EMAIL=seller@hakimipharmacy.af
SELLER_PASSWORD=<choose one, min 8 characters>
```

**2. Create the accounts** (safe to re-run; existing accounts are left alone):

```bash
cd backend && npm install && npm run init
```

**3. Start the API:**

```bash
cd backend && npm start
```

**4. Start the app** in a second terminal, then open http://localhost:3000:

```bash
cd frontend && npm install && npm run dev
```

Once both passwords are set up you can blank `ADMIN_PASSWORD` and `SELLER_PASSWORD`
in `.env` — they are only read by `npm run init`.

## Starting from empty

The database ships with **no** drugs, suppliers, customers or sales — everything is real
data you enter. The natural order on day one:

1. **Suppliers** → add the distributors you buy from.
2. **Inventory** → add each drug with its category, supplier, buy and sell price,
   opening stock, expiry month, and optionally batch and barcode.
3. **Point of Sale** → start selling. Customers are created automatically from the
   name and phone on the first sale.

Invoice, purchase order and prescription numbers start at 1001.

## How the pieces connect

Completing a sale is the flow that touches most of the system. `POST /api/invoices`
validates stock, writes the invoice, decrements each drug, creates the customer if the
phone is new, and either records cash income or adds the total to that customer's credit
when the sale is on نسیه.

Receiving a purchase order adds the quantity to stock and updates the drug's buy price,
so margins reflect the latest cost. Paying on the spot books an expense; otherwise the
amount is added to what you owe that supplier and shows up under accounts payable.

Dispensing a prescription marks it dispensed and hands the patient, phone, doctor and
drug list to the point of sale, where payment is taken.

Analytics and reports are computed from the invoices themselves — top sellers, category
mix, and profit and loss all reflect real sales, and read as empty until you have some.

## Configuration

`backend/.env` — `MONGODB_URI`, `JWT_SECRET`, `PORT` (default 5000), plus the init-only
account variables above.

`frontend/.env.local` — `NEXT_PUBLIC_API_URL`, default `http://localhost:5000/api`.

Currency, VAT rate and the low-stock threshold are edited in the app under **Settings**.
The pharmacy name, address, phone and licence number that print on invoices and reports
live in `frontend/lib/labels.js`. Drug interaction warnings are in
`frontend/lib/interactions.js` — extend that list as needed.

### If you use MongoDB Atlas

Atlas rejects connections from IPs that are not on its Network Access allowlist. The TCP
connection is accepted but the TLS handshake is dropped, which surfaces as
`ReplicaSetNoPrimary`. Add the machine's public IP under **Atlas → Network Access**.

If DNS SRV lookups are blocked on your network (`querySrv ETIMEOUT`), use the seedlist
form of the URI (`mongodb://host1,host2,host3/...?ssl=true&replicaSet=...`) instead of
`mongodb+srv://`.

## Backups

**Settings → Back up now** writes a JSON copy of every collection to `backend/backups`,
timestamped. The ten most recent files are listed in the app. Keep copies off the
machine — a backup on the same disk does not survive that disk failing.

## Before going live

- Set `JWT_SECRET` to a long random value; the placeholder in `.env` is not safe.
- Both staff should change their password from Settings.
- Serve over HTTPS. Tokens are held in `localStorage` and last 12 hours.
- `.env` is gitignored — keep it that way.

## API

All routes are under `/api` and need `Authorization: Bearer <token>` except
`POST /api/auth/login`.

| Method | Path | Permission |
|---|---|---|
| POST | `/auth/login` | public |
| GET | `/auth/me` | any signed-in account |
| POST | `/auth/change-password` | any signed-in account |
| GET | `/drugs` | any signed-in account |
| POST, PUT, DELETE | `/drugs` | `inv` |
| GET | `/suppliers` | any signed-in account |
| POST, PUT | `/suppliers` | `sup` |
| POST | `/suppliers/:id/pay` | `sup` or `fin` |
| GET | `/suppliers/price-comparison` | `sup` |
| GET | `/customers` | `cust` or `fin` |
| POST | `/customers/:id/settle` | `cust` or `fin` |
| GET | `/invoices` | `sales`, `dash` or `pos` |
| POST | `/invoices` | `pos` |
| GET, POST | `/purchases` | `pur` |
| GET, POST | `/prescriptions` | `rx` |
| POST | `/prescriptions/:id/dispense` | `rx` |
| GET, POST | `/transactions` | `fin` |
| GET | `/analytics/dashboard` | `dash` |
| GET | `/analytics/period/:period` | `ana` |
| GET | `/analytics/report` | `ana` |
| GET | `/logs` | `set` |
| GET | `/settings` | any signed-in account |
| PUT | `/settings` | `set` |
| POST | `/settings/backup`, GET `/settings/backups` | `set` |
