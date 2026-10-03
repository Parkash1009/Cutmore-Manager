# Cutmore Manager — Personal Edition

A no-login React + Firebase CMS for customer-wise PCS/Tunch records.

## Workflow

1. Open **Add Entry**.
2. Type a customer name.
3. Existing customer/alias suggestions appear.
4. If it does not exist, create the customer by name.
5. Enter PCS, Tunch, date and time.
6. Press Add Entry.
7. Open **All Entries** for the complete sheet.
8. Filter by month, date range, or customer.
9. Paginate 25/50/100 rows.
10. Export the currently filtered rows to Excel or PDF.
11. Click a customer name to see history and total PCS.
12. Deleted entries go to Recycle Bin and can be restored.

## Firebase

This version deliberately has **no login**. Firestore rules are therefore open and should only be used for a personal/private deployment. Do not put sensitive information in this database and do not publish this project as a public application.

In Firebase Console, enable Firestore. Replace the rules with `firestore.rules` and publish them.

Copy `.env.example` to `.env` and put your Firebase Web App config there.

## Windows

Because some Windows PowerShell configurations block `npm.ps1`, use:

```powershell
npm.cmd install
npm.cmd run dev
```

## Android

```powershell
npm.cmd install
npm.cmd run build
npx cap add android
npx cap sync android
npx cap open android
```

Build the APK from Android Studio.

## Data model

customers/{customerId}
- name
- nameLower
- createdAt

aliases/{normalizedAlias}
- alias
- aliasLower
- customerId

entries/{entryId}
- customerId
- customerName
- customerNameLower
- pcs
- tunch
- date
- time
- dateTime
- createdAt

recycleBin/{recycleId}
- type
- originalEntryId
- originalData
- deletedAt

Entries are the source of truth. Customer total PCS is calculated from all live entries, so repeated additions accumulate automatically without manually overwriting a total.
