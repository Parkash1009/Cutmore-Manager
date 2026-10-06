import React, { useEffect, useMemo, useState } from "react";

import { createRoot } from "react-dom/client";

import {

  watchCustomers,

  watchEntries,

  watchAliases,

  watchRecycle,

  createCustomer,

  addAlias,

  addEntry,

  moveEntryToRecycle,

  restoreRecycle,

  permanentlyDeleteRecycle,
  watchSettlements,
  setCustomerOutstanding,
  recordSettlement,
  norm,

} from "./data";

import { excel, pdf } from "./export";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

import {

  Search,

  Plus,

  Download,

  Trash2,

  ChevronLeft,

  ChevronRight,

  RotateCcw,

  Languages,

  FileDown,

  UserPlus,
  Wallet,
  IndianRupee,
} from "lucide-react";

import "./styles.css";

const L = {

  en: {

    add: "Add Entry",

    sheet: "All Entries",

    customer: "Customer Name",

    pcs: "Pieces (PCS)",

    tunch: "Tunch",

    date: "Date",

    time: "Time",

    addEntry: "Add Entry",

    search: "Search by customer name",

    month: "Month",

    from: "From",

    to: "To",

    excel: "Excel",

    pdf: "PDF",

    prev: "Previous",

    next: "Next",

    newCustomer: "Add new customer",

    selectCustomer: "Select customer",

    history: "Customer History",

    total: "Total PCS",

    delete: "Delete",

    confirm: "Move this entry to recycle bin?",

    recycle: "Recycle Bin",

    restore: "Restore",

    permanent: "Delete Forever",

    empty: "No entries found",

    aliases: "Alias",

    addAlias: "Add Alias",

    language: "हिंदी",

  },

  hi: {

    add: "एंट्री जोड़ें",

    sheet: "सभी एंट्री",

    customer: "ग्राहक का नाम",

    pcs: "पीस (PCS)",

    tunch: "टंच",

    date: "तारीख",

    time: "समय",

    addEntry: "एंट्री जोड़ें",

    search: "ग्राहक नाम से खोजें",

    month: "महीना",

    from: "से",

    to: "तक",

    excel: "एक्सेल",

    pdf: "पीडीएफ",

    prev: "पिछला",

    next: "अगला",

    newCustomer: "नया ग्राहक जोड़ें",

    selectCustomer: "ग्राहक चुनें",

    history: "ग्राहक इतिहास",

    total: "कुल PCS",

    delete: "डिलीट",

    confirm: "इस एंट्री को रीसायकल बिन में भेजें?",

    recycle: "रीसायकल बिन",

    restore: "वापस लाएं",

    permanent: "हमेशा के लिए डिलीट",

    empty: "कोई एंट्री नहीं मिली",

    aliases: "अन्य नाम",

    addAlias: "नाम जोड़ें",

    language: "English",

  },

};

function nowParts() {

  const d = new Date();

  const pad = (n) => String(n).padStart(2, "0");

  return {

    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(

      d.getDate()

    )}`,

    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,

  };

}

function displayDate(value) {

  if (!value) return "";

  const [y, m, d] = value.split("-");

  return `${d}-${m}-${y}`;

}

function monthKey(d) {

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

}

function monthTitle(key) {

  const [y, m] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {

    month: "long",

    year: "numeric",

  }).format(new Date(y, m - 1, 1));

}

function formatPcs(value) {

  return Number(value || 0).toLocaleString("en-IN", {

    maximumFractionDigits: 2,

  });

}

function App() {

  const [lang, setLang] = useState("en");

  const t = L[lang];

  const [customers, setCustomers] = useState([]);

  const [entries, setEntries] = useState([]);

  const [aliases, setAliases] = useState([]);

  const [trash, setTrash] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlementCustomerId, setSettlementCustomerId] = useState("");
  const [settlementSearch, setSettlementSearch] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(nowParts().date);

  const [tab, setTab] = useState("add");

  const [selected, setSelected] = useState(null);

  const [customer, setCustomer] = useState(null);

  const [name, setName] = useState("");

  const [pcs, setPcs] = useState("");

  const [tunch, setTunch] = useState("");

  const initialDateTime = nowParts();

  const [date, setDate] = useState(initialDateTime.date);

  const [time, setTime] = useState(initialDateTime.time);

  const [search, setSearch] = useState("");

  const [month, setMonth] = useState(monthKey(new Date()));

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(25);

  const [alias, setAlias] = useState("");

  const [showTrash, setShowTrash] = useState(false);

  const [busy, setBusy] = useState(false);

  // --------------------------------------------------

  // FIREBASE LIVE DATA

  // --------------------------------------------------

  useEffect(() => {

    return watchCustomers(setCustomers);

  }, []);

  useEffect(() => {

    return watchEntries(setEntries);

  }, []);

  useEffect(() => {

    return watchAliases(setAliases);

  }, []);

  useEffect(() => {

    return watchRecycle(setTrash);

  }, []);

  useEffect(() => {
    return watchSettlements(setSettlements);
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "customerBalances"), (snapshot) => {
      setBalances(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  // --------------------------------------------------

  // CUSTOMER TOTALS

  // --------------------------------------------------

  const customerMap = useMemo(() => {

    return Object.fromEntries(

      customers.map((c) => [c.id, c])

    );

  }, [customers]);

  const totals = useMemo(() => {

    const result = {};

    for (const entry of entries) {

      result[entry.customerId] =

        (result[entry.customerId] || 0) +

        Number(entry.pcs || 0);

    }

    return result;

  }, [entries]);

const totalTunches = useMemo(() => {

  const result = {};

  for (const entry of entries) {

    result[entry.customerId] =

      (result[entry.customerId] || 0) +

      Number(entry.tunch || 0);

  }

  return result;

}, [entries]);

  // --------------------------------------------------

  const settlementCustomer = customers.find((c) => c.id === settlementCustomerId) || null;
  const balanceMap = useMemo(() => Object.fromEntries(balances.map((b) => [b.customerId || b.id, b])), [balances]);
  const settlementTotals = useMemo(() => {
    const result = {};
    for (const item of settlements) result[item.customerId] = (result[item.customerId] || 0) + Number(item.amountReceived || 0);
    return result;
  }, [settlements]);
  const currentOutstanding = settlementCustomer
    ? Math.max(0, Number(balanceMap[settlementCustomer.id]?.outstanding || 0) - Number(settlementTotals[settlementCustomer.id] || 0))
    : 0;
  const settlementHistory = settlements.filter((item) => item.customerId === settlementCustomerId).slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || ((a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
  const settlementCustomers = customers.filter((c) => norm(c.name).includes(norm(settlementSearch)));

  async function saveOutstanding() {
    if (!settlementCustomer) return alert("Please select a customer.");
    const amount = Number(outstandingAmount);
    if (!outstandingAmount.trim() || !Number.isFinite(amount) || amount < 0) return alert("Enter a valid outstanding amount (0 or more).");
    try { setBusy(true); await setCustomerOutstanding(settlementCustomer, amount); setOutstandingAmount(""); alert("Outstanding amount saved."); }
    catch (error) { console.error(error); alert("Could not save outstanding amount. " + (error?.message || "")); }
    finally { setBusy(false); }
  }

  async function savePayment() {
    if (!settlementCustomer) return alert("Please select a customer.");
    const amount = Number(paymentAmount);
    if (!paymentAmount.trim() || !Number.isFinite(amount) || amount <= 0) return alert("Enter a payment amount greater than 0.");
    if (!paymentDate) return alert("Please select payment date.");
    if (amount > currentOutstanding) return alert("Payment cannot be greater than the current outstanding balance.");
    try { setBusy(true); await recordSettlement(settlementCustomer, amount, paymentDate, currentOutstanding); setPaymentAmount(""); alert("Payment recorded."); }
    catch (error) { console.error(error); alert("Could not record payment. " + (error?.message || "")); }
    finally { setBusy(false); }
  }

  // CUSTOMER SEARCH

  // --------------------------------------------------

  const suggestions = useMemo(() => {

    const q = norm(name);

    if (!q || customer) {

      return [];

    }

    const aliasCustomerIds = new Set(

      aliases

        .filter((a) => a.aliasLower?.includes(q))

        .map((a) => a.customerId)

    );

    return customers

      .filter(

        (c) =>

          c.nameLower?.includes(q) ||

          aliasCustomerIds.has(c.id)

      )

      .slice(0, 8);

  }, [name, customers, aliases, customer]);

  // Check if the typed name is already exactly an existing customer.

  const exactCustomerExists = useMemo(() => {

    const q = norm(name);

    if (!q) return false;

    return customers.some(

      (c) => norm(c.name) === q

    );

  }, [name, customers]);

  // --------------------------------------------------

  // TABLE FILTERING

  // --------------------------------------------------

  useEffect(() => {

    setPage(1);

  }, [search, month, from, to, pageSize]);

  const filtered = useMemo(() => {

    const q = norm(search);

    return entries

      .filter((entry) => {

        const matchName =

          !q ||

          entry.customerNameLower?.includes(q);

        const matchFrom =

          !from || entry.date >= from;

        const matchTo =

          !to || entry.date <= to;

        const matchMonth =

          from || to

            ? true

            : entry.date?.startsWith(month);

        return (

          matchName &&

          matchFrom &&

          matchTo &&

          matchMonth

        );

      })

      .sort((a, b) => {

        const getTime = (entry) => {

          try {

            if (entry.dateTime?.toDate) {

              return entry.dateTime.toDate().getTime();

            }

            return new Date(

              `${entry.date}T${entry.time || "00:00"}`

            ).getTime();

          } catch {

            return 0;

          }

        };

        return getTime(b) - getTime(a);

      });

  }, [entries, search, month, from, to]);

  const pages = Math.max(

    1,

    Math.ceil(filtered.length / pageSize)

  );

  const visible = filtered.slice(

    (page - 1) * pageSize,

    page * pageSize

  );

  // --------------------------------------------------

  // SELECT EXISTING CUSTOMER

  // --------------------------------------------------

  function chooseCustomer(c) {

    setCustomer(c);

    setName(c.name);

    // Customer is now selected.

    // suggestions automatically disappear.

  }

  // --------------------------------------------------

  // CREATE NEW CUSTOMER

  // --------------------------------------------------

  async function createNew() {

    const customerName = name.trim();

    if (!customerName) {

      alert("Please enter customer name.");

      return;

    }

    // Don't create duplicate exact customer names.

    const existing = customers.find(

      (c) => norm(c.name) === norm(customerName)

    );

    if (existing) {

      setCustomer(existing);

      setName(existing.name);

      return;

    }

    try {

      setBusy(true);

      const newCustomer =

        await createCustomer(customerName);

      if (!newCustomer) {

        throw new Error(

          "Customer was not created. Please check Firebase."

        );

      }

      // Select the newly created customer.

      setCustomer(newCustomer);

      setName(newCustomer.name);

    } catch (error) {

      console.error(

        "Create customer error:",

        error

      );

      alert(

        "Could not create customer.\n\n" +

          (error?.message ||

            "Please check Firebase connection and Firestore rules.")

      );

    } finally {

      setBusy(false);

    }

  }

  // --------------------------------------------------

  // ADD ENTRY

  // --------------------------------------------------

  async function save() {

    if (!customer) {

      alert("Please select or create a customer.");

      return;

    }

    if (Number(pcs) <= 0) {

      alert("Please enter PCS greater than 0.");

      return;

    }

    try {

      setBusy(true);

      await addEntry(

        customer,

        pcs,

        tunch,

        date,

        time

      );

      // --------------------------------------------

      // CLEAR EVERYTHING FOR NEXT ENTRY

      // --------------------------------------------

      setCustomer(null);

      setName("");

      setPcs("");

      setTunch("");

      const current = nowParts();

      setDate(current.date);

      setTime(current.time);

      // Stay on Add Entry.

      setTab("add");

    } catch (error) {

      console.error(

        "Add entry error:",

        error

      );

      alert(

        "Could not save entry.\n\n" +

          (error?.message ||

            "Please check Firebase connection.")

      );

    } finally {

      setBusy(false);

    }

  }

  // --------------------------------------------------

  // MONTH NAVIGATION

  // --------------------------------------------------

  function shiftMonth(delta) {

    const [y, m] = month

      .split("-")

      .map(Number);

    const d = new Date(

      y,

      m - 1 + delta,

      1

    );

    setMonth(monthKey(d));

    setFrom("");

    setTo("");

  }

  // --------------------------------------------------

  // CUSTOMER HISTORY

  // --------------------------------------------------

  const selectedCustomer =

    selected

      ? customerMap[selected] || null

      : null;

  const history =

    selected

      ? entries.filter(

          (e) => e.customerId === selected

        )

      : [];

  // --------------------------------------------------

  // UI

  // --------------------------------------------------

  return (

    <div className="app">

      {/* HEADER */}

      <header>

        <div>

          <h1>Cutmore Manager</h1>

          <span>

            Live Firebase • Offline ready

          </span>

        </div>

        <div className="headBtns">

          <button

            type="button"

            onClick={() =>

              setLang(

                lang === "en"

                  ? "hi"

                  : "en"

              )

            }

          >

            <Languages size={17} />

            {t.language}

          </button>

          <button

            type="button"

            onClick={() =>

              setShowTrash(true)

            }

          >

            <Trash2 size={17} />

            {t.recycle}

          </button>

        </div>

      </header>

      {/* TABS */}

      <nav className="tabs">

        <button

          type="button"

          className={

            tab === "add"

              ? "active"

              : ""

          }

          onClick={() =>

            setTab("add")

          }

        >

          <Plus />

          {t.add}

        </button>

        <button

          type="button"

          className={

            tab === "sheet"

              ? "active"

              : ""

          }

          onClick={() =>

            setTab("sheet")

          }

        >

          <FileDown />

          {t.sheet}

        </button>

      <button type="button" className={tab === "settlement" ? "active" : ""} onClick={() => setTab("settlement")}>
          <Wallet size={18} /> Amount Settlement
        </button>

        </nav>

      {/* ==========================================

          ADD ENTRY

          ========================================== */}

      {tab === "add" && (

        <main className="addPage">

          <div className="formCard">

            <h2>{t.add}</h2>

            {/* CUSTOMER */}

            <label>

              {t.customer}

            </label>

            <div className="picker">

              <input

                value={name}

                placeholder={t.selectCustomer}

                disabled={busy}

                onChange={(e) => {

                  setName(e.target.value);

                  // Typing means customer needs

                  // to be selected again.

                  setCustomer(null);

                }}

                autoFocus

              />

              {/* EXISTING CUSTOMER SUGGESTIONS */}

              {suggestions.length > 0 &&

                !customer && (

                  <div className="suggestions">

                    {suggestions.map((c) => (

                      <button

                        type="button"

                        key={c.id}

                        onClick={() =>

                          chooseCustomer(c)

                        }

                      >

                        <span>

                          {c.name}

                        </span>

                        <b>

                          {formatPcs(

                            totals[c.id] || 0

                          )}

                        </b>

                      </button>

                    ))}

                  </div>

                )}

            </div>

            {/* SELECTED CUSTOMER */}

            {customer && (

              <div className="selected">

                ✓ {customer.name}

              </div>

            )}

            {/* CREATE NEW CUSTOMER */}

            {name.trim() &&

              !customer &&

              !exactCustomerExists && (

                <button

                  type="button"

                  className="newBtn"

                  onClick={createNew}

                  disabled={busy}

                >

                  <UserPlus size={18} />

                  {busy

                    ? "Creating..."

                    : `${t.newCustomer}: "${name.trim()}"`}

                </button>

              )}

            {/* PCS */}

            <label>

              {t.pcs}

            </label>

            <input

              type="number"

              inputMode="decimal"

              step="any"

              value={pcs}

              disabled={busy}

              onChange={(e) =>

                setPcs(e.target.value)

              }

            />

            {/* TUNCH */}

            <label>

              {t.tunch}

            </label>

            <input

              type="number"

              inputMode="decimal"

              step="any"

              value={tunch}

              disabled={busy}

              onChange={(e) =>

                setTunch(e.target.value)

              }

            />

            {/* DATE + TIME */}

            <div className="two">

              <div>

                <label>

                  {t.date}

                </label>

                <input

                  type="date"

                  value={date}

                  disabled={busy}

                  onChange={(e) =>

                    setDate(e.target.value)

                  }

                />

              </div>

              <div>

                <label>

                  {t.time}

                </label>

                <input

                  type="time"

                  value={time}

                  disabled={busy}

                  onChange={(e) =>

                    setTime(e.target.value)

                  }

                />

              </div>

            </div>

            {/* ADD ENTRY */}

            <button

              type="button"

              className="big primary"

              onClick={save}

              disabled={busy}

            >

              <Plus />

              {busy

                ? "Saving..."

                : t.addEntry}

            </button>

          </div>

        </main>

      )}

      {/* ==========================================

          ALL ENTRIES

          ========================================== */}

      {tab === "sheet" && (

        <main className="sheetPage">

          <div className="filters">

            <div className="searchBox">

              <Search />

              <input

                placeholder={t.search}

                value={search}

                onChange={(e) =>

                  setSearch(e.target.value)

                }

              />

            </div>

            <div className="monthNav">

              <button

                type="button"

                onClick={() =>

                  shiftMonth(-1)

                }

              >

                <ChevronLeft />

              </button>

              <b>

                {monthTitle(month)}

              </b>

              <button

                type="button"

                onClick={() =>

                  shiftMonth(1)

                }

              >

                <ChevronRight />

              </button>

            </div>

            <div className="dates">

              <label>

                {t.from}

                <input

                  type="date"

                  value={from}

                  onChange={(e) =>

                    setFrom(e.target.value)

                  }

                />

              </label>

              <label>

                {t.to}

                <input

                  type="date"

                  value={to}

                  onChange={(e) =>

                    setTo(e.target.value)

                  }

                />

              </label>

              <button

                type="button"

                onClick={() => {

                  setFrom("");

                  setTo("");

                }}

              >

                Month

              </button>

            </div>

            <div className="exportBtns">

              <button

                type="button"

                onClick={() =>

                  excel(

                    filtered,

                    `cutmore-${month}.xlsx`

                  )

                }

              >

                <Download />

                {t.excel}

              </button>

              <button

                type="button"

                onClick={() =>

                  pdf(

                    filtered,

                    `${monthTitle(month)} • ${filtered.length} entries`

                  )

                }

              >

                <Download />

                {t.pdf}

              </button>

            </div>

          </div>

          <div className="tableCard">

            <table>

              <thead>

                <tr>

                  <th>{t.date}</th>

                  <th>{t.time}</th>

                  <th>{t.customer}</th>

                  <th>{t.pcs}</th>

                  <th>{t.tunch}</th>

                  <th></th>

                </tr>

              </thead>

              <tbody>

                {visible.map((entry) => (

                  <tr key={entry.id}>

                    <td>

                      {displayDate(

                        entry.date

                      )}

                    </td>

                    <td>

                      {entry.time}

                    </td>

                    <td>

                      <button

                        type="button"

                        className="link"

                        onClick={() =>

                          setSelected(

                            entry.customerId

                          )

                        }

                      >

                        {entry.customerName}

                      </button>

                    </td>

                    <td>

                      {formatPcs(

                        entry.pcs

                      )}

                    </td>

                    <td>

                      {entry.tunch}

                    </td>

                    <td>

                      <button

                        type="button"

                        className="icon danger"

                        onClick={async () => {

                          if (

                            confirm(

                              t.confirm

                            )

                          ) {

                            await moveEntryToRecycle(

                              entry

                            );

                          }

                        }}

                      >

                        <Trash2 size={16} />

                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {!visible.length && (

              <div className="empty">

                {t.empty}

              </div>

            )}

            {/* PAGINATION */}

            <div className="pagination">

              <span>

                {filtered.length

                  ? `${(page - 1) * pageSize + 1}-${Math.min(

                      page * pageSize,

                      filtered.length

                    )} / ${filtered.length}`

                  : "0 / 0"}

              </span>

              <label>

                Rows

                <select

                  value={pageSize}

                  onChange={(e) =>

                    setPageSize(

                      Number(e.target.value)

                    )

                  }

                >

                  <option value="25">

                    25

                  </option>

                  <option value="50">

                    50

                  </option>

                  <option value="100">

                    100

                  </option>

                </select>

              </label>

              <button

                type="button"

                disabled={page <= 1}

                onClick={() =>

                  setPage(

                    (p) => p - 1

                  )

                }

              >

                {t.prev}

              </button>

              <b>

                {page}/{pages}

              </b>

              <button

                type="button"

                disabled={

                  page >= pages

                }

                onClick={() =>

                  setPage(

                    (p) => p + 1

                  )

                }

              >

                {t.next}

              </button>

            </div>

          </div>

        </main>

      )}

      {/* ==========================================

          CUSTOMER HISTORY

          ========================================== */}

      {tab === "settlement" && (
        <main className="sheetPage">
          <div className="formCard">
            <h2><Wallet size={21} /> Amount Settlement</h2>
            <label>Search customer</label>
            <input value={settlementSearch} onChange={(e) => { setSettlementSearch(e.target.value); setSettlementCustomerId(""); }} placeholder="Type customer name" disabled={busy} />
            <label>Select customer</label>
            <select value={settlementCustomerId} onChange={(e) => { setSettlementCustomerId(e.target.value); setSettlementSearch(customers.find((c) => c.id === e.target.value)?.name || ""); setOutstandingAmount(""); }} disabled={busy}>
              <option value="">Select customer</option>
              {settlementCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {settlementCustomer && <>
              <div className="selected">✓ {settlementCustomer.name}</div>
              <div className="tableCard" style={{ padding: 16, margin: "12px 0" }}>
                <div><b>Total outstanding entered:</b> ₹{Number(balanceMap[settlementCustomer.id]?.outstanding || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                <div><b>Total payments received:</b> ₹{Number(settlementTotals[settlementCustomer.id] || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
                <h2 style={{ marginBottom: 0 }}>Remaining balance: ₹{currentOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</h2>
              </div>
              <h3>Set / update total outstanding</h3>
              <label>Total bill / opening outstanding (₹)</label>
              <input type="number" min="0" step="0.01" value={outstandingAmount} onChange={(e) => setOutstandingAmount(e.target.value)} placeholder={String(Number(balanceMap[settlementCustomer.id]?.outstanding || 0))} disabled={busy} />
              <button type="button" className="big primary" onClick={saveOutstanding} disabled={busy}><IndianRupee size={18} /> Save Outstanding Amount</button>
              <h3 style={{ marginTop: 24 }}>Record payment received</h3>
              <div className="two">
                <div><label>Amount received (₹)</label><input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} disabled={busy} /></div>
                <div><label>Payment date</label><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} disabled={busy} /></div>
              </div>
              <button type="button" className="big primary" onClick={savePayment} disabled={busy || currentOutstanding <= 0}><IndianRupee size={18} /> {busy ? "Saving..." : "Record Payment"}</button>
              <h3 style={{ marginTop: 24 }}>Payment history</h3>
              <div className="tableCard"><table><thead><tr><th>Date</th><th>Received</th><th>Balance after payment</th></tr></thead><tbody>
                {settlementHistory.map((item, index) => {
                  const cumulativePayments = settlementHistory.slice(0, index + 1).reduce((sum, p) => sum + Number(p.amountReceived || 0), 0);
                  const remaining = Math.max(0, Number(balanceMap[settlementCustomer.id]?.outstanding || 0) - cumulativePayments);
                  return <tr key={item.id}><td>{displayDate(item.date)}</td><td>₹{Number(item.amountReceived || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td>₹{remaining.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>;
                })}
              </tbody></table>{!settlementHistory.length && <div className="empty">No payments recorded for this customer.</div>}</div>
            </>}
          </div>
        </main>
      )}

      {/* CUSTOMER HISTORY */}
      {selectedCustomer && (

        <div className="modalBack">

          <div className="modal">

            <div className="modalHead">

          <div>

  <h2>

    {selectedCustomer.name}

  </h2>

  <b>

    Total PCS:{" "}

    {formatPcs(

      totals[selectedCustomer.id] || 0

    )}

  </b>

  <br />

  <b>

    Total Tunch:{" "}

    {formatPcs(

      totalTunches[selectedCustomer.id] || 0

    )}

  </b>

</div>

              <button

                type="button"

                onClick={() =>

                  setSelected(null)

                }

              >

                ×

              </button>

            </div>

            <div className="history">

              {[...history]

                .sort((a, b) =>

                  `${b.date} ${b.time || ""}`.localeCompare(

                    `${a.date} ${a.time || ""}`

                  )

                )

                .map((entry) => (

                  <div key={entry.id}>

                    <span>

                      {displayDate(

                        entry.date

                      )}{" "}

                      {entry.time}

                    </span>

                    <b>

                      {formatPcs(

                        entry.pcs

                      )}{" "}

                      PCS

                    </b>

                    <span>

                      Tunch {entry.tunch}

                    </span>

                  </div>

                ))}

            </div>

            {/* ALIAS */}

            <div className="aliasAdd">

              <input

                placeholder={t.aliases}

                value={alias}

                onChange={(e) =>

                  setAlias(e.target.value)

                }

              />

              <button

                type="button"

                onClick={async () => {

                  if (alias.trim()) {

                    try {

                      await addAlias(

                        selectedCustomer,

                        alias.trim()

                      );

                      setAlias("");

                    } catch (error) {

                      console.error(error);

                      alert(

                        error?.message ||

                          "Could not add alias."

                      );

                    }

                  }

                }}

              >

                {t.addAlias}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* ==========================================

          RECYCLE BIN

          ========================================== */}

      {showTrash && (

        <div className="modalBack">

          <div className="modal">

            <div className="modalHead">

              <h2>

                {t.recycle}

              </h2>

              <button

                type="button"

                onClick={() =>

                  setShowTrash(false)

                }

              >

                ×

              </button>

            </div>

            {!trash.length ? (

              <div className="empty">

                {t.empty}

              </div>

            ) : (

              trash.map((item) => (

                <div

                  className="trashRow"

                  key={item.id}

                >

                  <div>

                    <b>

                      {

                        item.originalData

                          ?.customerName ||

                        "Entry"

                      }

                    </b>

                    <small>

                      {

                        item.originalData

                          ?.date

                      }{" "}

                      •{" "}

                      {

                        item.originalData

                          ?.pcs

                      }{" "}

                      PCS

                    </small>

                  </div>

                  <div>

                    <button

                      type="button"

                      onClick={() =>

                        restoreRecycle(item)

                      }

                    >

                      <RotateCcw size={16} />

                      {t.restore}

                    </button>

                    <button

                      type="button"

                      className="danger"

                      onClick={() => {

                        if (

                          confirm(

                            "Delete forever?"

                          )

                        ) {

                          permanentlyDeleteRecycle(

                            item

                          );

                        }

                      }}

                    >

                      {t.permanent}

                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

      )}

    </div>

  );

}

// --------------------------------------------------

// ERROR BOUNDARY

// --------------------------------------------------

class ErrorBoundary extends React.Component {

  constructor(props) {

    super(props);

    this.state = {

      error: null,

    };

  }

  static getDerivedStateFromError(error) {

    return {

      error,

    };

  }

  render() {

    if (this.state.error) {

      return (

        <div className="fatal">

          <h1>

            Cutmore Manager

          </h1>

          <p>

            Startup error

          </p>

          <pre>

            {String(

              this.state.error.message ||

                this.state.error

            )}

          </pre>

        </div>

      );

    }

    return this.props.children;

  }

}

// --------------------------------------------------

// START APP

// --------------------------------------------------

createRoot(

  document.getElementById("root")

).render(

  <ErrorBoundary>

    <App />

  </ErrorBoundary>

);
