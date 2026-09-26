# Kruti Electronics - TV Repair Management System 📺

A full-stack, production-ready TV Repair Management System built for **Kruti Electronics** (TV Repair & Electronics Service Center).

---

## 🌟 Key Features

### 1. 🔍 Public Customer Portal (No Login Required)
- **Instant Search:** Customers can track repair progress using their **Receipt / Serial Number** (e.g. `KR00101`) or their **10-Digit Mobile Number**.
- **Live Status Badges:**
  - 🟡 **Pending Inspection**
  - 🔵 **Under Repair**
  - 🟢 **Ready for Pickup**
  - ⬛ **Delivered**
- **Multiple TVs per Receipt Support:** Displays all TVs attached to a single receipt, with individual statuses, reported complaints, cost estimates, and technician details.

### 2. 🛡️ Admin & Staff Management (Protected Routes)
- **Role-based Session Authentication:** Secure bcrypt password hashing and HTTP-only JWT cookies.
- **Admin Dashboard:** Real-time metrics for:
  - Total Receipts & Total TVs
  - Status counts: Pending, Under Repair, Ready, Delivered
  - Today's Receipts
  - **Old Receipts:** Automated highlight for receipts older than 4 days that are not yet Delivered.
  - Urgent Priority TV alerts.
- **Add Receipt Form:**
  - Strict Zod validation.
  - Auto-generated unique Serial Number with duplicate protection.
  - Multi-TV support (+ Add TV / Remove TV).
  - Configurable Brand, Model, Size, Complaint, Estimated Cost, Actual Cost, Status, Priority (Normal, High, Urgent), Rack Number, and Payment Method.
- **All Receipts Table:**
  - Horizontal scrolling table with persistent actions.
  - Real-time search by serial, customer name, mobile, and TV brand.
  - Dynamic filters for Status, Priority, and Age (0-3 days vs. 4+ days).
  - Old receipt warning badge.
  - **Excel Export:** Download full real database data to `.xlsx`.

### 3. 🖨️ Thermal Sticker Printing (50mm × 25mm)
- Purpose-built for thermal barcode and sticker roll printers (50mm width × 25mm height).
- Styled using strict `@page { size: 50mm 25mm; margin: 0; }`.
- Prints centered label:
  ```text
  KRUTI ELECTRONICS
  Serial No: 66700
  Name: SWETA
  Mobile: 8511296117
  ```
- Isolated printing iframe with zero margin, zero scaling, and auto-print trigger.

### 4. 📄 A4 Receipt Printing & PDF Download
- Professional printable A4 Job Card & Customer Receipt.
- Dynamic **QR Code** linking directly to `https://krutielectronics.com/search-receipt?serial=<SERIAL>`.
- Client-side PDF generation (`Receipt-<SERIAL>.pdf`).

### 5. 💬 1-Click WhatsApp Notification
- Clean mobile sanitation.
- Exact pre-formatted customer update message with receipt details and direct tracking URL.
- **Never auto-triggers on save**—only launches when admin explicitly clicks the WhatsApp button.

---

## 🏗️ Folder Structure

```text
├── .data/                  # Embedded persistent storage (auto-fallback if MONGODB_URI is not set)
├── public/
│   ├── robots.txt          # SEO robots file (disallows admin pages)
│   └── sitemap.xml         # XML sitemap for public indexing
├── scripts/
│   └── seed-admin.ts       # Secure admin seed script
├── src/
│   ├── components/
│   │   ├── ConfirmDialog.tsx # Accessible modal confirmation for delete
│   │   ├── DashboardCards.tsx# Live stats cards and alerts
│   │   ├── Footer.tsx        # Responsive company footer
│   │   ├── HomePage.tsx      # Public homepage with services and process
│   │   ├── Loading.tsx       # Loading spinners and status indicators
│   │   ├── LoginPage.tsx     # Admin authentication form
│   │   ├── Navbar.tsx        # Responsive header with mobile hamburger
│   │   ├── PrintReceipt.tsx  # A4 printable receipt & PDF generator with QR code
│   │   ├── ReceiptForm.tsx   # Add/Edit receipt form with multi-TV support
│   │   ├── ReceiptTable.tsx  # All Receipts table with search, filters, excel export
│   │   ├── SearchReceipt.tsx # Customer search and live tracking
│   │   └── StickerPrint.tsx  # 50mm x 25mm thermal sticker print modal & utility
│   ├── lib/
│   │   ├── auth.ts           # JWT generation, cookie handling, and auth middleware
│   │   ├── data-service.ts   # MongoDB Atlas Mongoose bridge & query abstraction
│   │   ├── mongodb.ts        # Mongoose connection pooling
│   │   ├── validation.ts     # Zod schemas for receipts, TVs, and logins
│   │   └── whatsapp.ts       # Mobile sanitizer and wa.me message builder
│   ├── models/
│   │   ├── Receipt.ts        # Mongoose Schema with compound indexes
│   │   └── User.ts           # Mongoose User Schema with bcrypt compare
│   ├── types/
│   │   ├── receipt.ts        # TypeScript definitions for Receipts and TVs
│   │   └── user.ts           # TypeScript definitions for Users and Auth
│   ├── App.tsx               # Main application controller and client router
│   ├── index.css             # Tailwind CSS & print media stylesheets
│   └── main.tsx              # React 19 entry point
├── .env.example              # Environment variables template
├── .env.local                # Local environment secrets
├── index.html                # HTML entry point with brand SEO meta
├── package.json              # Scripts and dependencies
├── server.ts                 # Full-stack Express server with Vite middleware integration
├── tsconfig.json             # TypeScript compiler settings
└── vite.config.ts            # Vite configuration
```

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB Atlas (with local persistence fallback for offline or zero-config development)
- **Utilities:**
  - `zod` for request validation
  - `bcryptjs` & `jsonwebtoken` for secure authentication
  - `qrcode` for live QR code generation
  - `jspdf` & `html2canvas` for PDF receipt export
  - `xlsx` for Excel export

---

## 🚀 Getting Started / Local Export Guide (फाइल एक्सपोर्ट करने के बाद चलाने का तरीका)

### 📌 Windows Users (सबसे आसान तरीका):
अगर आपने प्रोजेक्ट को एक्सपोर्ट करके अपने कंप्यूटर/फाइल एक्सप्लोरर में रखा है:
1. सिर्फ **`start-windows.bat`** फाइल पर डबल क्लिक (Double Click) करें।
2. यह ऑटोमैटिक `npm install` करके सर्वर स्टार्ट कर देगा।
3. ब्राउज़र में **http://localhost:3000** ओपन करें।

---

### 📌 Manual Terminal Steps (Mac / Linux / Windows):

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start the Full-Stack Server
> ⚠️ **महत्वपूर्ण:** सिर्फ `index.html` या `vite` ना चलाएं! पूरा ऐप और API चलाने के लिए `npm run dev` चलाना ज़रूरी है:
```bash
npm run dev
```
अब ब्राउज़र में **http://localhost:3000** ओपन करें।

---

### ❓ "Unable to connect to server" क्यों आता है और कैसे ठीक करें?

1. **कारण 1: Backend Server चालू नहीं है:**
   - अगर आप सिर्फ `index.html` पर डबल क्लिक करते हैं या केवल Vite फ्रंटेंड चालू करते हैं, तो Express API सर्वर नहीं चलता।
   - **समाधान:** टर्मिनल में `npm run dev` चलाएं या `start-windows.bat` रन करें।

2. **कारण 2: MongoDB Atlas IP Whitelist (Network Access) की समस्या:**
   - MongoDB Atlas में अगर आपका कंप्यूटर का IP एड्रेस Whitelist नहीं है, तो कनेक्शन ब्लॉक हो जाता है।
   - **समाधान:**
     1. [cloud.mongodb.com](https://cloud.mongodb.com) में लॉगिन करें।
     2. बाएँ मेनू में **Security** -> **Network Access** पर क्लिक करें।
     3. **Add IP Address** पर क्लिक करके **"ALLOW ACCESS FROM ANYWHERE" (`0.0.0.0/0`)** सेलेक्ट करें और Save करें।

3. **कारण 3: क्या MongoDB Atlas के बिना भी ऐप काम करेगा?**
   - **हाँ!** इस सिस्टम में **ऑटोमैटिक लोकल फॉलबैक (Local JSON Storage)** बनाया गया है।
   - अगर MongoDB Atlas कनेक्ट नहीं भी होता, तो ऐप क्रैश नहीं होगा और सारा डेटा आपके कंप्यूटर में `.data/receipts.json` में ऑटोमैटिक सुरक्षित रहेगा!

---

### 3. Configure Environment Variables (Optional for MongoDB Atlas)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env.local`:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/kruti_electronics?retryWrites=true&w=majority"
AUTH_SECRET="your-super-secure-jwt-secret-key"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Seed Initial Admin Account
```bash
npm run seed-admin
```
Or specify custom credentials:
```bash
npx tsx scripts/seed-admin.ts "admin@krutielectronics.com" "yourPassword123" "Workshop Manager"
```

Default credentials:
- **Email:** `admin@krutielectronics.com`
- **Password:** `admin123`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## ☁️ Deployment Guide (MongoDB Atlas & Vercel / Cloud Run)

### Step 1: MongoDB Atlas Setup
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free M0 cluster.
3. Under **Database Access**, create a user (e.g. `kruti_admin`) with Read and Write permissions.
4. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere) or your hosting provider's IP range.
5. Click **Connect** -> **Drivers** -> Copy the connection string.
6. Replace `<password>` in the connection string.

### Step 2: Deploy to Production
Set the following environment variables in your deployment dashboard:
- `MONGODB_URI`: Your MongoDB Atlas URI.
- `AUTH_SECRET`: Random 32+ character string.
- `NEXT_PUBLIC_SITE_URL`: Your live domain (e.g. `https://krutielectronics.com`).
- `NODE_ENV`: `production`

---

## 🏷️ Thermal Sticker Printer Configuration
When printing 50mm × 25mm roll stickers:
- **Paper Size:** `50mm × 25mm` (or `2" × 1"`)
- **Margins:** `None` (0mm)
- **Scale:** `100%`
- **Headers & Footers:** `Off`
