// importData.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Function to import data into a Firestore collection
async function importCollection(collectionName, data) {
  console.log(`Importing data to collection: ${collectionName}...`);
  const batch = db.batch();
  let count = 0;

  for (const item of data) {
    // For simplicity, we'll use a new document with an auto-generated ID.
    // If your data has unique IDs you want to preserve, you can use:
    // const docRef = db.collection(collectionName).doc(item.id);
    const docRef = db.collection(collectionName).doc(); // Auto-generated ID
    batch.set(docRef, item);
    count++;
    if (count % 500 === 0) { // Commit in batches of 500 to avoid memory issues
      await batch.commit();
      console.log(`Committed ${count} documents to ${collectionName}.`);
      batch = db.batch(); // Start a new batch
    }
  }

  // Commit any remaining documents
  if (count % 500 !== 0 || count === 0) {
    await batch.commit();
    console.log(`Committed final ${count % 500 === 0 && count !== 0 ? 500 : count % 500} documents to ${collectionName}.`);
  }
  console.log(`Finished importing ${count} documents to collection: ${collectionName}.`);
}

async function runImport() {
  try {
    console.log('Starting data import...');

    // Import product_categories_data.json
    // const productCategoriesData = require('./product_categories_data.json');
    // await importCollection('product_categories', productCategoriesData);

    // Import customers_data.json
    const customersData = require('./customers_data.json');
    await importCollection('customers', customersData);

    // Import team_members_data.json
    // const teamMembersData = require('./team_members_data.json');
    // await importCollection('team_members', teamMembersData);

    // Import sales_data.json - This file is large, so ensure batching is effective.
    // Each sales entry is quite detailed. Consider if you want to flatten or
    // split this data if it grows very large.
    // const salesData = require('./sales_data.json');
    // await importCollection('sales', salesData);

    // Import inventory_data.json
    // const inventoryData = require('./inventory_data.json');
    // await importCollection('inventory', inventoryData);

    console.log('Customers data import complete!'); // Changed message
  } catch (error) {
    console.error('Error during data import:', error);
  } finally {
    // Exit the process after import is complete or an error occurs
    process.exit(0);
  }
}

// Run the import function
runImport();
