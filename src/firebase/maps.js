import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "./db.js";
import { INVITE_TTL_DAYS } from "../config.js";

// Data model (see firestore.rules for who may do what):
//   maps/{mapId}                     name, ownerId, memberIds[], members{uid: profile}
//   maps/{mapId}/invites/{token}     mapName, createdBy, ownerName, expiresAt, active
//   maps/{mapId}/joinRequests/{uid}  profile + token of the invite that was used
//   maps/{mapId}/pins/{pinId}        see pins.js

export function profileOf(user, role) {
  return {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    role,
    joinedAt: Timestamp.now()
  };
}

export function subscribeMyMaps(uid, onChange, onError) {
  const myMaps = query(collection(db, "maps"), where("memberIds", "array-contains", uid));
  return onSnapshot(
    myMaps,
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange({
        maps: snapshot.docs.map((mapDoc) => ({ id: mapDoc.id, ...mapDoc.data() })),
        fromCache: snapshot.metadata.fromCache
      });
    },
    onError
  );
}

export async function createMap(user, name = "ふたりの地図") {
  const mapRef = doc(collection(db, "maps"));
  await setDoc(mapRef, {
    name,
    ownerId: user.uid,
    memberIds: [user.uid],
    members: { [user.uid]: profileOf(user, "host") },
    createdAt: serverTimestamp()
  });
  return mapRef.id;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createInvite(map, user) {
  const token = randomToken();
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await setDoc(doc(db, "maps", map.id, "invites", token), {
    mapName: map.name,
    ownerName: user.displayName || "",
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    expiresAt,
    active: true
  });
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  url.searchParams.set("map", map.id);
  url.searchParams.set("invite", token);
  return { url: url.toString(), expiresAt: expiresAt.toDate() };
}

export async function getInvite(mapId, token) {
  const snapshot = await getDoc(doc(db, "maps", mapId, "invites", token));
  if (!snapshot.exists()) return null;
  const invite = snapshot.data();
  const valid = invite.active && invite.expiresAt.toMillis() > Date.now();
  return { ...invite, valid };
}

export function requestToJoin(mapId, token, user) {
  return setDoc(doc(db, "maps", mapId, "joinRequests", user.uid), {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    token,
    createdAt: serverTimestamp()
  });
}

export function subscribeMyJoinRequest(mapId, uid, onChange) {
  return onSnapshot(
    doc(db, "maps", mapId, "joinRequests", uid),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
    () => onChange(null)
  );
}

export function subscribeJoinRequests(mapId, onChange) {
  return onSnapshot(collection(db, "maps", mapId, "joinRequests"), (snapshot) => {
    onChange(snapshot.docs.map((requestDoc) => ({ uid: requestDoc.id, ...requestDoc.data() })));
  });
}

export async function approveJoinRequest(mapId, request) {
  const batch = writeBatch(db);
  batch.update(doc(db, "maps", mapId), {
    memberIds: arrayUnion(request.uid),
    [`members.${request.uid}`]: {
      displayName: request.displayName,
      email: request.email,
      photoURL: request.photoURL,
      role: "member",
      joinedAt: Timestamp.now()
    }
  });
  batch.delete(doc(db, "maps", mapId, "joinRequests", request.uid));
  await batch.commit();
}

export function rejectJoinRequest(mapId, uid) {
  return deleteDoc(doc(db, "maps", mapId, "joinRequests", uid));
}

export function removeMember(mapId, uid) {
  const batch = writeBatch(db);
  batch.update(doc(db, "maps", mapId), {
    memberIds: arrayRemove(uid),
    [`members.${uid}`]: deleteField()
  });
  return batch.commit();
}

// Any member may edit the category list (firestore.rules allows members to change only this field).
export function updateCategories(mapId, categories) {
  return updateDoc(doc(db, "maps", mapId), {
    categories: categories.map(({ icon, label }) => ({ icon, label: label.trim() }))
  });
}
