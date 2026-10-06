import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "firebase/firestore";

import { db } from "./firebase";

export const customersRef = collection(db, "customers");
export const entriesRef = collection(db, "entries");
export const aliasesRef = collection(db, "aliases");
export const recycleRef = collection(db, "recycleBin");

export const norm = (v = "") =>
  v
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

export function watchCustomers(cb) {
  return onSnapshot(
    query(customersRef, orderBy("nameLower")),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export function watchEntries(cb) {
  return onSnapshot(
    query(entriesRef, orderBy("dateTime", "desc")),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export function watchAliases(cb) {
  return onSnapshot(
    aliasesRef,
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export function watchRecycle(cb) {
  return onSnapshot(
    query(recycleRef, orderBy("deletedAt", "desc")),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function createCustomer(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  const lower = norm(clean);

  const ref = await addDoc(customersRef, {
    name: clean,
    nameLower: lower,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(aliasesRef, lower), {
    alias: clean,
    aliasLower: lower,
    customerId: ref.id,
    createdAt: serverTimestamp()
  });

  return {
    id: ref.id,
    name: clean,
    nameLower: lower
  };
}

export async function addAlias(customer, alias) {
  const clean = alias.trim().replace(/\s+/g, " ");
  const lower = norm(clean);

  if (!clean) return;

  await setDoc(doc(aliasesRef, lower), {
    alias: clean,
    aliasLower: lower,
    customerId: customer.id,
    createdAt: serverTimestamp()
  });
}

export async function findCustomerByName(name) {
  const lower = norm(name);

  const s = await getDocs(
    query(
      aliasesRef,
      where("aliasLower", "==", lower)
    )
  );

  if (s.empty) return null;

  return {
    id: s.docs[0].data().customerId
  };
}

/*
  Add Entry

  HUID is stored as text so it can contain:
  - numbers
  - letters
  - hyphens
  - other HUID formats

  Example:
  HUID = "HUID12345"
*/
export async function addEntry(
  customer,
  pcs,
  tunch,
  huid,
  date,
  time
) {
  const dt = new Date(`${date}T${time}:00`);

  return addDoc(entriesRef, {
    customerId: customer.id,
    customerName: customer.name,
    customerNameLower: customer.nameLower,

    pcs: Number(pcs),
    tunch: Number(tunch),

    // HUID stored as text
    huid: String(huid || "").trim(),

    date,
    time,
    dateTime: dt,
    createdAt: serverTimestamp()
  });
}

export async function moveEntryToRecycle(entry) {
  const batch = writeBatch(db);

  batch.set(doc(recycleRef), {
    type: "entry",
    originalEntryId: entry.id,
    originalData: entry,
    deletedAt: serverTimestamp()
  });

  batch.delete(doc(entriesRef, entry.id));

  await batch.commit();
}

export async function restoreRecycle(item) {
  if (item.type === "entry" && item.originalData) {
    const data = { ...item.originalData };

    delete data.id;
    delete data.deletedAt;

    const batch = writeBatch(db);

    batch.set(
      doc(entriesRef, item.originalEntryId),
      data
    );

    batch.delete(doc(recycleRef, item.id));

    await batch.commit();
  }
}

export async function permanentlyDeleteRecycle(item) {
  await deleteDoc(doc(recycleRef, item.id));
}


// ======================================================
// AMOUNT SETTLEMENT
// ======================================================

export const settlementsRef = collection(
  db,
  "settlements"
);


// Listen to all customer settlement records
// in real time.
export function watchSettlements(cb) {
  return onSnapshot(
    query(
      settlementsRef,
      orderBy("createdAt", "desc")
    ),
    (snapshot) =>
      cb(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      )
  );
}


// Set or update a customer's manually entered
// outstanding amount.
export async function setCustomerOutstanding(
  customer,
  amount
) {
  const outstanding = Number(amount);

  if (!customer?.id) {
    throw new Error("Please select a customer.");
  }

  if (
    !Number.isFinite(outstanding) ||
    outstanding < 0
  ) {
    throw new Error(
      "Outstanding amount must be zero or more."
    );
  }

  await setDoc(
    doc(db, "customerBalances", customer.id),
    {
      customerId: customer.id,
      customerName: customer.name,
      outstanding,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
}


// Record money received from a customer.
export async function recordSettlement(
  customer,
  amount,
  date,
  currentBalance
) {
  const received = Number(amount);

  if (!customer?.id) {
    throw new Error("Please select a customer.");
  }

  if (
    !Number.isFinite(received) ||
    received <= 0
  ) {
    throw new Error(
      "Received amount must be greater than zero."
    );
  }

  if (received > Number(currentBalance)) {
    throw new Error(
      "Received amount cannot exceed the outstanding balance."
    );
  }

  return addDoc(settlementsRef, {
    customerId: customer.id,
    customerName: customer.name,
    amountReceived: received,
    date,
    createdAt: serverTimestamp()
  });
}