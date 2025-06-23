import { db } from '../firebase-config.js';

export async function getSalesData(userId, period = 'monthly') {
  let query = db.collection('sales')
    .where('employeeId', '==', userId);
  
  // Add time period filter
  if (period === 'monthly') {
    const startDate = new Date();
    startDate.setDate(1);
    query = query.where('date', '>=', startDate);
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addSale(saleData) {
  return await db.collection('sales').add(saleData);
}