# GoDaddy Page Content — DH Field EMR

Instructions: Add a new page to your GoDaddy site called "Field EMR" (or "EMR Software").
Add it to your navigation menu under a relevant section.
Copy each section below into the GoDaddy page builder using their text, image, and button blocks.

---

## HERO SECTION
(Use a full-width hero block with dark overlay. Use a photo from your Uganda outreach if available.)

### Heading:
DH Field EMR

### Subheading:
Free, offline-first electronic medical records for field clinicians. Built for medical outreach in resource-limited settings.

### Button:
Download for Mac (links to the .dmg file — upload to GoDaddy's file manager or a file host)

---

## SECTION 1: What is DH Field EMR?
(Use a text block, centered or left-aligned)

### Heading:
Purpose-Built for the Field

### Body:
DH Field EMR is a desktop application designed specifically for medical outreach teams working in areas with limited or unreliable internet connectivity. It provides a complete electronic medical record system that works entirely offline, syncing data to the cloud whenever a connection is available.

Built by Damico Health for our medical outreach programs in Uganda, the software is now available free of charge to any healthcare organization doing similar work.

---

## SECTION 2: Key Features
(Use a 3-column or 2-column card/icon layout)

### Card 1 — Offline-First
Works without internet. All patient records are stored locally on your computer. Data syncs automatically when you reconnect.

### Card 2 — Multi-Device Sync
Up to 10 computers per organization, all sharing the same patient database. Records created on one device appear on all others within seconds.

### Card 3 — Point-of-Care Labs
Built-in support for rapid diagnostic tests (Malaria, HIV, Typhoid, HCG, RPR, H. pylori, Hep B), urinalysis, and blood glucose.

### Card 4 — Smart Prescribing
Pre-built medication regimens linked to diagnoses. Auto-calculates quantities. Full formulary management with controlled substance tracking.

### Card 5 — Real-Time Analytics
Charts and statistics updated in real time — disease categories, lab positivity rates, referral patterns, demographics, and more.

### Card 6 — Web Portal
A companion web dashboard for viewing records, analyzing data, and managing your organization's configuration from any browser.

---

## SECTION 3: How It Works
(Use a numbered/step layout or timeline)

### Heading:
Get Started in 15 Minutes

### Step 1: Create a Free Cloud Database
Sign up for a free Supabase account and create a project. This is where your organization's data lives — you own it completely.

### Step 2: Install the Desktop App
Download the Mac app and run the built-in setup wizard. It walks you through connecting to your database, creating tables, and seeding your configuration.

### Step 3: Register Your Devices
Install the app on each computer your team will use. Enter the same cloud credentials and give each device a name. They'll sync automatically.

### Step 4: Deploy the Web Portal
Host the lightweight web portal on any free static hosting service (Vercel, Netlify, GitHub Pages). Access your data and manage configuration from anywhere.

---

## SECTION 4: Who Is This For?
(Use a text block or cards)

### Heading:
Built for Organizations Like Yours

### Body:
DH Field EMR is designed for:

- Medical mission teams conducting outreach in remote areas
- Community health programs in low-resource settings
- Mobile clinics and temporary care facilities
- Any healthcare team that needs reliable patient records without dependable internet

Each organization runs their own independent instance. Your data stays yours — we never have access to patient information.

---

## SECTION 5: Downloads
(Use a download/button section)

### Heading:
Downloads

### Download 1:
**DH Field EMR for Mac** — Desktop Application (.dmg)
[Download Button → link to uploaded .dmg file]

### Download 2:
**Setup Guide** — Step-by-step instructions for organization administrators (PDF)
[Download Button → link to uploaded setup-guide.pdf]

### Download 3:
**User Guide** — Day-to-day usage guide for field clinicians (PDF)
[Download Button → link to uploaded user-guide.pdf]

### Download 4:
**Admin Guide** — Portal and configuration management guide (PDF)
[Download Button → link to uploaded admin-guide.pdf]

---

## SECTION 6: Technical Details
(Use an accordion/expandable block or simple text)

### Heading:
Technical Details

### System Requirements:
- macOS 12 (Monterey) or later
- 200 MB disk space
- Internet connection required only for initial setup and sync

### Architecture:
- Desktop app built with Electron and SQLite for reliable offline storage
- Cloud sync via Supabase (free tier supports ~50,000+ records)
- Web portal is static HTML/CSS/JS — no server required
- Bi-directional sync every 30 seconds when online

### Data Ownership:
Each organization creates and controls their own Supabase project. Patient data is stored in your database, under your control. Damico Health does not have access to any organization's data.

### Open Source:
DH Field EMR is open source and free to use under the MIT license.

---

## SECTION 7: Contact / Support
(Use a simple text block)

### Heading:
Questions?

### Body:
For questions about DH Field EMR, setup assistance, or to report issues, contact us through our main contact page or reach out directly to the Damico Health team.

[Contact Us Button → link to your existing contact page]

---

## NOTES FOR GODADDY SETUP:

1. **Color scheme**: Use your existing site colors (gold #F79E0F, dark text #1b1b1b, white backgrounds)
2. **Fonts**: Your site already uses Quicksand and Muli — keep those
3. **Images**: Use photos from your Uganda outreach for hero/section backgrounds
4. **File uploads**: You'll need to upload 4 files to GoDaddy's file manager:
   - DH Field EMR.dmg (the app installer — I'm building this now)
   - setup-guide.pdf (print the HTML guide to PDF)
   - user-guide.pdf (print the HTML guide to PDF)
   - admin-guide.pdf (print the HTML guide to PDF)
5. **Navigation**: Add "Field EMR" to your main nav, probably under a new section or alongside "Campaigns"
6. **To convert guides to PDF**: Open each HTML guide in Chrome/Safari, then File > Print > Save as PDF
