import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "./db.js";

// maps/{mapId}/goals/{goalId}: the couple's yearly goals (calendar years).
//   year (number), text, done, doneAt (Timestamp | null), doneBy (uid | null),
//   order (number, ascending within a year), pinId ("" = none),
//   amountTarget / amountCurrent (yen, null = not a money goal),
//   createdBy, createdAt, updatedAt

function goalsCollection(mapId) {
  return collection(db, "maps", mapId, "goals");
}

function goalRef(mapId, goalId) {
  return doc(db, "maps", mapId, "goals", goalId);
}

export function subscribeGoals(mapId, onChange, onError) {
  return onSnapshot(
    goalsCollection(mapId),
    // "estimate" so a just-checked goal shows its completion date before the server confirms it.
    (snapshot) => onChange(snapshot.docs.map((goalDoc) => ({ id: goalDoc.id, ...goalDoc.data({ serverTimestamps: "estimate" }) }))),
    onError
  );
}

export function addGoal(mapId, year, text, order, user) {
  return setDoc(doc(goalsCollection(mapId)), {
    year,
    text,
    done: false,
    doneAt: null,
    doneBy: null,
    order,
    pinId: "",
    amountTarget: null,
    amountCurrent: null,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateGoal(mapId, goalId, patch) {
  return updateDoc(goalRef(mapId, goalId), { ...patch, updatedAt: serverTimestamp() });
}

export function setGoalDone(mapId, goalId, done, user) {
  return updateGoal(mapId, goalId, {
    done,
    doneAt: done ? serverTimestamp() : null,
    doneBy: done ? user.uid : null
  });
}

export function deleteGoal(mapId, goalId) {
  return deleteDoc(goalRef(mapId, goalId));
}

// Applies { goalId: patch } in one write, e.g. swapping order or carrying goals over.
export function updateGoals(mapId, patches) {
  const batch = writeBatch(db);
  for (const [goalId, patch] of Object.entries(patches)) {
    batch.update(goalRef(mapId, goalId), { ...patch, updatedAt: serverTimestamp() });
  }
  return batch.commit();
}
