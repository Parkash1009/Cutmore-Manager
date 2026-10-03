import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, where, writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

export const customersRef = collection(db, "customers");
export const entriesRef = collection(db, "entries");
export const aliasesRef = collection(db, "aliases");
export const recycleRef = collection(db, "recycleBin");

export const norm = (v="") => v.normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase();

export function watchCustomers(cb) {
  return onSnapshot(query(customersRef, orderBy("nameLower")), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))));
}
export function watchEntries(cb) {
  return onSnapshot(query(entriesRef, orderBy("dateTime","desc")), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))));
}
export function watchAliases(cb) {
  return onSnapshot(aliasesRef, s => cb(s.docs.map(d=>({id:d.id,...d.data()}))));
}
export function watchRecycle(cb) {
  return onSnapshot(query(recycleRef, orderBy("deletedAt","desc")), s => cb(s.docs.map(d=>({id:d.id,...d.data()}))));
}

export async function createCustomer(name) {
  const clean=name.trim().replace(/\s+/g," ");
  const lower=norm(clean);
  const ref=await addDoc(customersRef,{name:clean,nameLower:lower,createdAt:serverTimestamp()});
  await setDoc(doc(aliasesRef,lower),{alias:clean,aliasLower:lower,customerId:ref.id,createdAt:serverTimestamp()});
  return {id:ref.id,name:clean,nameLower:lower};
}

export async function addAlias(customer, alias) {
  const clean=alias.trim().replace(/\s+/g," ");
  const lower=norm(clean);
  if(!clean) return;
  await setDoc(doc(aliasesRef,lower),{alias:clean,aliasLower:lower,customerId:customer.id,createdAt:serverTimestamp()});
}

export async function findCustomerByName(name) {
  const lower=norm(name);
  const s=await getDocs(query(aliasesRef,where("aliasLower","==",lower)));
  if(s.empty) return null;
  return {id:s.docs[0].data().customerId};
}

export async function addEntry(customer, pcs, tunch, date, time) {
  const dt = new Date(`${date}T${time}:00`);
  return addDoc(entriesRef,{
    customerId:customer.id,
    customerName:customer.name,
    customerNameLower:customer.nameLower,
    pcs:Number(pcs),
    tunch:Number(tunch),
    date,
    time,
    dateTime:dt,
    createdAt:serverTimestamp()
  });
}

export async function moveEntryToRecycle(entry) {
  const batch=writeBatch(db);
  batch.set(doc(recycleRef),{
    type:"entry",
    originalEntryId:entry.id,
    originalData:entry,
    deletedAt:serverTimestamp()
  });
  batch.delete(doc(entriesRef,entry.id));
  await batch.commit();
}

export async function restoreRecycle(item) {
  if(item.type==="entry" && item.originalData){
    const data={...item.originalData};
    delete data.id;
    delete data.deletedAt;
    const batch=writeBatch(db);
    batch.set(doc(entriesRef,item.originalEntryId),data);
    batch.delete(doc(recycleRef,item.id));
    await batch.commit();
  }
}

export async function permanentlyDeleteRecycle(item) {
  await deleteDoc(doc(recycleRef,item.id));
}
