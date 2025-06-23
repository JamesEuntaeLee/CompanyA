import { db } from '../firebase-config.js';

export async function getInventory(threshold = 10) {
  const snapshot = await db.collection('inventory')
    .where('quantity', '<=', threshold)
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateInventory(itemId, newQuantity) {
  return await db.collection('inventory')
    .doc(itemId)
    .update({ quantity: newQuantity });
}