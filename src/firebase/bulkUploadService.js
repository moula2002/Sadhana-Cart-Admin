import { collection, addDoc, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

// Batch size for Firestore batch operations (max 500)
const BATCH_SIZE = 100;

class BulkUploadService {
  // Upload products in batches
  async uploadProducts(products, onProgress) {
    try {
      const totalProducts = products.length;
      let uploadedCount = 0;
      const results = {
        success: [],
        errors: []
      };

      // Split products into batches
      const batches = this.createBatches(products, BATCH_SIZE);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          // Process current batch
          const batchResults = await this.processBatch(batch);
          
          // Update results
          results.success.push(...batchResults.success);
          results.errors.push(...batchResults.errors);
          
          // Update progress
          uploadedCount += batch.length;
          const progress = Math.round((uploadedCount / totalProducts) * 100);
          
          if (onProgress) {
            onProgress(progress, uploadedCount, totalProducts);
          }
          
          // Small delay between batches to avoid overwhelming Firestore
          if (i < batches.length - 1) {
            await this.delay(100);
          }
          
        } catch (batchError) {
          console.error(`Batch ${i + 1} failed:`, batchError);
          
          // Add all products in failed batch to errors
          batch.forEach((product, index) => {
            results.errors.push({
              product,
              error: `Batch upload failed: ${batchError.message}`,
              index: uploadedCount + index
            });
          });
          
          uploadedCount += batch.length;
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Bulk upload failed:', error);
      throw new Error(`Bulk upload failed: ${error.message}`);
    }
  }

  // Process a single batch using Firestore batch operations
  async processBatch(products) {
    const batch = writeBatch(db);
    const results = {
      success: [],
      errors: []
    };

    try {
      // Check for existing products to prevent duplicates
      const productNames = products.map(p => p.name?.trim()).filter(Boolean);
      const existingProducts = await this.checkExistingProducts(productNames);
      
      // Add all products in the batch
      for (let index = 0; index < products.length; index++) {
        const product = products[index];
        try {
          // Validate product data
          const validatedProduct = this.validateProduct(product);
          
          // Check if product already exists - but allow re-upload if product was deleted
          if (existingProducts.has(validatedProduct.name.toLowerCase())) {
            console.log(`Product '${validatedProduct.name}' already exists, skipping...`);
            results.errors.push({
              product,
              error: `Product '${validatedProduct.name}' already exists in database`,
              index
            });
            continue;
          }
          
          // Create new document reference
          const productRef = doc(collection(db, 'products'));
          
          // Debug: Log the generated ID
          console.log(`Generated ID for product ${validatedProduct.name}: ${productRef.id}`);
          
          // Add to batch
          batch.set(productRef, {
            ...validatedProduct,
            id: productRef.id // Explicitly add ID to document
          });
          
          results.success.push({
            product: validatedProduct,
            id: productRef.id
          });
          
        } catch (validationError) {
          console.log(`Validation failed for product at index ${index}:`, validationError.message);
          console.log('Product data:', product);
          results.errors.push({
            product,
            error: validationError.message,
            index
          });
        }
      }

      // Commit the batch if there are successful products
      if (results.success.length > 0) {
        console.log(`Committing batch with ${results.success.length} products...`);
        try {
          await batch.commit();
          console.log('Batch committed successfully!');
        } catch (commitError) {
          console.error('Batch commit failed:', commitError);
          // Move successful products to errors
          results.success.forEach(item => {
            results.errors.push({
              product: item.product,
              error: `Commit failed: ${commitError.message}`,
              index: 0
            });
          });
          results.success = [];
        }
      } else {
        console.log('No products to commit - all had validation errors');
      }
      
      return results;
      
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  // Check for existing products by name to prevent duplicates
  async checkExistingProducts(productNames) {
    const existingProducts = new Set();
    
    if (productNames.length === 0) {
      return existingProducts;
    }
    
    try {
      console.log('Checking existing products in Firebase...', productNames);
      
      // Firebase 'in' query has a limit of 10 items, so we need to batch the queries
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < productNames.length; i += batchSize) {
        batches.push(productNames.slice(i, i + batchSize));
      }
      
      // Execute all batch queries with fresh data from Firebase
      for (const batch of batches) {
        const q = query(
          collection(db, 'products'),
          where('name', 'in', batch)
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.size} existing products in batch`);
        
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          if (productData.name) {
            existingProducts.add(productData.name.toLowerCase());
            console.log(`Existing product found: ${productData.name}`);
          }
        });
      }
      
      console.log('Total existing products found:', existingProducts.size);
      return existingProducts;
      
    } catch (error) {
      console.error('Error checking existing products:', error);
      // Return empty set on error to allow upload (fail-safe)
      return new Set();
    }
  }

  // Validate individual product data
  validateProduct(product) {
    const errors = [];
    
    // Flexible validation - only name is truly required
    // All other fields will have default values if missing
    if (!product.name?.trim()) {
      errors.push('Product name is required');
    }

    // Price validation with default
    let price = parseFloat(product.price);
    if (isNaN(price) || price <= 0) {
      price = 0; // Default price
      console.warn(`Product "${product.name}": Invalid price, setting to 0`);
    }

    // Offer price validation with default
    let offerPrice = parseFloat(product.offerPrice);
    if (isNaN(offerPrice) || offerPrice < 0) {
      offerPrice = 0; // Default offer price
    }

    // Stock validation with default
    let stock = parseInt(product.stock);
    if (isNaN(stock) || stock < 0) {
      stock = 0; // Default stock
      console.warn(`Product "${product.name}": Invalid stock, setting to 0`);
    }

    // Cash on delivery validation - handle both boolean and string formats
    let cashOnDelivery = 'Yes';
    if (typeof product.cashOnDelivery === 'boolean') {
      cashOnDelivery = product.cashOnDelivery ? 'Yes' : 'No';
    } else if (product.cashOnDelivery && !['yes', 'no'].includes(product.cashOnDelivery.toLowerCase())) {
      errors.push('Cash on Delivery must be Yes, No, true, or false');
    } else if (product.cashOnDelivery) {
      cashOnDelivery = product.cashOnDelivery;
    }

    // Images validation
    let images = [];
    if (product.images && Array.isArray(product.images)) {
      images = product.images.filter(img => img && img.trim());
    } else if (product.image) {
      images = [product.image];
    }

    // Variants validation (handle both variants and sizeVariants)
    let variants = [];
    const variantsToProcess = product.variants || product.sizeVariants;
    if (variantsToProcess && Array.isArray(variantsToProcess)) {
      variants = variantsToProcess
        .filter(variant => variant && typeof variant === 'object')
        .map(variant => ({
          sku: variant.sku || '',
          size: variant.size || '',
          price: parseFloat(variant.price) || 0,
          stock: parseInt(variant.stock) || 0,
          color: variant.color || '',
          material: variant.material || ''
        }))
        .filter(variant => 
          variant.sku && variant.size && 
          variant.price >= 0 && 
          variant.stock >= 0
        );
    }
    
    // Also handle sizeVariants separately for backward compatibility
    let sizeVariants = [];
    if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
      sizeVariants = product.sizeVariants
        .filter(variant => variant && typeof variant === 'object')
        .map(variant => ({
          sku: variant.sku || '',
          size: variant.size || '',
          price: parseFloat(variant.price) || 0,
          stock: parseInt(variant.stock) || 0,
          color: variant.color || '',
          material: variant.material || ''
        }))
        .filter(variant => 
          variant.sku && variant.size && 
          variant.price >= 0 && 
          variant.stock >= 0
        );
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Return cleaned product data with default values for missing fields
    return {
      productId: product.productId || `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: product.name.trim(),
      description: product.description?.trim() || 'No description provided',
      category: product.category?.trim() || 'Uncategorized',
      categoryId: product.categoryId || '',
      subcategory: (product.subcategory || product.subCategory || '').trim(),
      subcategoryId: product.subcategoryId || '',
      brand: product.brand?.trim() || 'Unknown Brand',
      sku: product.sku?.trim() || `SKU_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      price: price,
      offerPrice: offerPrice,
      stock: stock,
      rating: parseFloat(product.rating) || 0,
      timestamp: product.timestamp || new Date().toISOString(),
      cashOnDelivery: cashOnDelivery,
      images: images,
      variants: variants,
      sizeVariants: sizeVariants.length > 0 ? sizeVariants : variants,
      attributes: product.attributes || '',
      date: product.date || new Date().toISOString().split('T')[0]
    };
  }

  // Create batches from products array
  createBatches(products, batchSize) {
    const batches = [];
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }
    return batches;
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Basic URL validation
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Get upload statistics
  getUploadStats(results) {
    return {
      total: results.success.length + results.errors.length,
      successful: results.success.length,
      failed: results.errors.length,
      successRate: results.success.length + results.errors.length > 0 
        ? Math.round((results.success.length / (results.success.length + results.errors.length)) * 100)
        : 0
    };
  }

  // Generate error report
  generateErrorReport(results) {
    if (results.errors.length === 0) {
      return null;
    }

    const errorReport = {
      totalErrors: results.errors.length,
      errors: results.errors.map(error => ({
        productName: error.product?.name || 'Unknown',
        error: error.error,
        rowIndex: error.index + 1
      }))
    };

    return errorReport;
  }

  // Delete all products from all collections
  async deleteAllProducts() {
    try {
      console.log('Starting to delete all products from Firebase...');
      
      // Get all collections that start with common patterns
      // Since we can't list all collections directly, we'll need to track them
      // For now, we'll delete from known collections and any we can find
      
      const collectionsToCheck = [];
      
      // Try to get collections from localStorage or a tracking mechanism
      const uploadHistory = JSON.parse(localStorage.getItem('jsonUploadHistory') || '[]');
      const knownCollections = new Set();
      
      // Add collections from upload history if available
      uploadHistory.forEach(upload => {
        if (upload.collectionNames) {
          upload.collectionNames.forEach(name => knownCollections.add(name));
        }
      });
      
      // Also check some common collection names
      const commonCollections = ['products'];
      commonCollections.forEach(name => knownCollections.add(name));
      
      let totalDeleted = 0;
      const deletionResults = [];
      
      for (const collectionName of knownCollections) {
        try {
          console.log(`Checking collection: ${collectionName}`);
          
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          if (snapshot.size > 0) {
            console.log(`Found ${snapshot.size} documents in ${collectionName}`);
            
            // Delete all documents in this collection
            const batch = writeBatch(db);
            let batchCount = 0;
            
            snapshot.forEach((docSnapshot) => {
              batch.delete(docSnapshot.ref);
              batchCount++;
              
              // Firebase batch limit is 500 operations
              if (batchCount >= 500) {
                // We'll handle this in chunks if needed
              }
            });
            
            await batch.commit();
            totalDeleted += snapshot.size;
            
            deletionResults.push({
              collection: collectionName,
              deleted: snapshot.size,
              status: 'success'
            });
            
            console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
          } else {
            console.log(`Collection ${collectionName} is empty or doesn't exist`);
            deletionResults.push({
              collection: collectionName,
              deleted: 0,
              status: 'empty'
            });
          }
        } catch (collectionError) {
          console.error(`Error deleting from collection ${collectionName}:`, collectionError);
          deletionResults.push({
            collection: collectionName,
            deleted: 0,
            status: 'error',
            error: collectionError.message
          });
        }
      }
      
      console.log(`Total products deleted: ${totalDeleted}`);
      
      return {
        success: true,
        totalDeleted,
        results: deletionResults,
        message: `Successfully deleted ${totalDeleted} products from ${deletionResults.length} collections`
      };
      
    } catch (error) {
      console.error('Error deleting all products:', error);
      return {
        success: false,
        error: error.message,
        totalDeleted: 0
      };
    }
  }
}

// Create and export singleton instance
const bulkUploadService = new BulkUploadService();
export default bulkUploadService;

// Export individual methods for direct use
export {
  bulkUploadService
};

// Export the main upload function
export const bulkUploadProducts = (products, onProgress) => {
  return bulkUploadService.uploadProducts(products, onProgress);
};