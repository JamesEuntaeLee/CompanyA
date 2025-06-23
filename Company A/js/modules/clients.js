import { db } from '../firebase-config.js';

export async function getClients(sortBy = 'name') {
  let query = db.collection('clients')
    .orderBy(sortBy);
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getClientDetails(clientId) {
  const doc = await db.collection('clients').doc(clientId).get();
  return doc.exists ? doc.data() : null;
}