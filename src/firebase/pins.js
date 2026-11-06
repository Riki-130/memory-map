import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "./db.js";

// maps/{mapId}/pins/{pinId}:
//   title, address, lat, lng, placeId, type ("memory" | "wishlist"), category, icon,
//   visitedAt ("YYYY-MM-DD" | ""), memo, photos[{id, path, thumbPath, width, height, uploadedBy}],
//   videoLinks[], createdBy, createdAt, updatedAt

export function subscribePins(mapId, onChange, onError) {
  return onSnapshot(
    collection(db, "maps", mapId, "pins"),
    (snapshot) => onChange(snapshot.docs.map((pinDoc) => ({ id: pinDoc.id, ...pinDoc.data() }))),
    onError
  );
}

// Pin ids are created up front so photos can be uploaded under the pin's storage path
// before the pin itself is saved.
export function newPinId(mapId) {
  return doc(collection(db, "maps", mapId, "pins")).id;
}

export function savePin(mapId, pinId, data, user, isNew) {
  const payload = { ...data, updatedAt: serverTimestamp() };
  if (isNew) {
    payload.createdBy = user.uid;
    payload.createdAt = serverTimestamp();
  }
  return setDoc(doc(db, "maps", mapId, "pins", pinId), payload, { merge: true });
}

export async function deletePin(mapId, pin) {
  await deleteDoc(doc(db, "maps", mapId, "pins", pin.id));
  await Promise.allSettled((pin.photos || []).flatMap((photo) => [
    deleteObject(ref(storage, photo.path)),
    deleteObject(ref(storage, photo.thumbPath))
  ]));
}

export function deletePhotoFiles(photo) {
  return Promise.allSettled([
    deleteObject(ref(storage, photo.path)),
    deleteObject(ref(storage, photo.thumbPath))
  ]);
}

// Download URLs are resolved on demand (storage rules check membership at that point)
// and are never written to Firestore.
const urlCache = new Map();
export function photoUrl(path) {
  if (!urlCache.has(path)) {
    const promise = getDownloadURL(ref(storage, path));
    promise.catch(() => urlCache.delete(path));
    urlCache.set(path, promise);
  }
  return urlCache.get(path);
}

async function resizeToJpeg(file, maxSide, quality) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("画像を変換できませんでした"))), "image/jpeg", quality);
  });
  return { blob, width, height };
}

function upload(path, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), blob, { contentType: "image/jpeg" });
    task.on("state_changed", (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes), reject, resolve);
  });
}

export async function uploadPhoto(mapId, pinId, file, user, onProgress) {
  const photoId = crypto.randomUUID();
  const base = `maps/${mapId}/pins/${pinId}/${photoId}`;
  const [full, thumb] = await Promise.all([
    resizeToJpeg(file, 2048, 0.82),
    resizeToJpeg(file, 400, 0.75)
  ]);
  await upload(`${base}_thumb.jpg`, thumb.blob);
  await upload(`${base}.jpg`, full.blob, onProgress);
  return {
    id: photoId,
    path: `${base}.jpg`,
    thumbPath: `${base}_thumb.jpg`,
    width: full.width,
    height: full.height,
    uploadedBy: user.uid
  };
}
