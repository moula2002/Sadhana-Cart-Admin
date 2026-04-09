import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Trash2, Upload, Ruler, Package, Tag, User, Info, Palette, DollarSign, Hash } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getFirestore,
  serverTimestamp
} from 'firebase/firestore';
import {  onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  getStorage
} from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { sendTopicNotification } from '../firebase/sendNotification';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpjMz_gzDUtdLtBryB1hDBccT7vgqRYaE",
  authDomain: "sadhana-cart.firebaseapp.com",
  projectId: "sadhana-cart",
  storageBucket: "sadhana-cart.firebasestorage.app",
  messagingSenderId: "126398142924",
  appId: "1:126398142924:web:90a0999a0ebc992e85a569",
  measurementId: "G-FER4YR4F73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Utility functions for safe type conversion
const safeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const safeInt = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const AddProduct = ({ 
  isOpen, 
  onClose, 
  onProductAdded,
  categories = [], 
  subCategories = [],
  editingProduct = null,
  products = [] // Add products prop to extract brands
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [sizeVariants, setSizeVariants] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [uniqueBrands, setUniqueBrands] = useState([]);

  // Initialize Firebase services
  const db = getFirestore(app);
  const storage = getStorage(app);

  // Extract unique brands from products
useEffect(() => {
  const brandsRef = collection(db, "brands");
  const q = query(brandsRef, orderBy("name", "asc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Map both the ID and the Name to ensure uniqueness
    const brandsList = snapshot.docs.map(doc => ({
      id: doc.id, 
      name: doc.data().name?.trim()
    }))
    .filter(brand => brand.name && brand.name !== 'NA' && brand.name !== '');

    // OPTIONAL: Double-check for duplicate names in the database
    const seen = new Set();
    const filteredUnique = brandsList.filter(brand => {
      const duplicate = seen.has(brand.name.toLowerCase());
      seen.add(brand.name.toLowerCase());
      return !duplicate;
    });

    setUniqueBrands(filteredUnique);
  });

  return () => unsubscribe();
}, []);

  const [formData, setFormData] = useState({
    basesku: '',
    brand: '',
    careinstructions: '',
    category: '',
    color: '',
    description: '',
    gender: '',
    "height(cm)": '',
    hsncode: '',
    images: [],
    "length(cm)": '',
    material: '',
    name: '',
    name_lower: '',
    occasion: '',
    offerprice: '',
    pattern: '',
    price: '',
    productid: '',
    searchkeywords: [],
    sellerid: '',
    seourl: '',
    sizevariants: [],
    stock: '',
    subcategory: '',
    "weight(g)": '',
    "width(cm)": '',
    isFeatured: false,
    featuredProductInfo: {
      title: '',
      description: '',
      displayOrder: ''
    }
  });

  // Generate search keywords from product name
  const generateSearchKeywords = (name) => {
    if (!name || name.trim() === '') return [];
    
    const cleanName = name.toLowerCase().trim();
    const keywords = new Set();
    
    const words = cleanName.split(/\s+/);
    
    words.forEach(word => {
      if (word.length > 0) {
        for (let i = 1; i <= word.length; i++) {
          const substring = word.substring(0, i);
          if (substring.length >= 1) {
            keywords.add(substring);
          }
        }
      }
    });
    
    keywords.add(cleanName);
    
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j <= words.length; j++) {
        const phrase = words.slice(i, j).join(' ');
        if (phrase.length > 0 && phrase !== cleanName) {
          keywords.add(phrase);
        }
      }
    }
    
    return Array.from(keywords).sort((a, b) => a.length - b.length);
  };

  // Initialize form when modal opens or editing product changes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        // Set existing images from the product being edited
        const existingProductImages = editingProduct.images || [];
        setExistingImages(existingProductImages);
        setImagePreviews(existingProductImages);
        
        // Set form data
        setFormData({
          basesku: editingProduct.basesku || '',
          brand: editingProduct.brand || '',
          careinstructions: editingProduct.careinstructions || '',
          category: editingProduct.category || '',
          color: editingProduct.color || '',
          description: editingProduct.description || '',
          gender: editingProduct.gender || '',
          "height(cm)": editingProduct["height(cm)"] || '',
          hsncode: editingProduct.hsncode || '',
          images: existingProductImages,
          "length(cm)": editingProduct["length(cm)"] || '',
          material: editingProduct.material || '',
          name: editingProduct.name || '',
          name_lower: editingProduct.name_lower || '',
          occasion: editingProduct.occasion || '',
          offerprice: editingProduct.offerprice?.toString() || '',
          pattern: editingProduct.pattern || '',
          price: editingProduct.price?.toString() || '',
          productid: editingProduct.productid || '',
          searchkeywords: editingProduct.searchkeywords || [],
          sellerid: editingProduct.sellerid || '',
          seourl: editingProduct.seourl || '',
          sizevariants: editingProduct.sizevariants || [],
          stock: editingProduct.stock?.toString() || '',
          subcategory: editingProduct.subcategory || '',
          "weight(g)": editingProduct["weight(g)"] || '',
          "width(cm)": editingProduct["width(cm)"] || '',
          isFeatured: editingProduct.isFeatured || false,
          featuredProductInfo: editingProduct.featuredProductInfo || {
            title: '',
            description: '',
            displayOrder: ''
          }
        });

        // Ensure size variants have proper numeric types
        setSizeVariants((editingProduct.sizevariants || []).map(variant => ({
          ...variant,
          price: variant.price?.toString() || '',
          stock: variant.stock?.toString() || ''
        })));
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingProduct]);

  // Filter subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      const filtered = subCategories.filter(subCat => 
        subCat.category === formData.category || 
        subCat.categoryId === formData.category ||
        subCat.parentCategory === formData.category
      );
      setFilteredSubCategories(filtered);
      if (!editingProduct) {
        setFormData(prev => ({ ...prev, subcategory: '' }));
      }
    } else {
      setFilteredSubCategories(subCategories);
    }
  }, [formData.category, subCategories, editingProduct]);

  // Update keywords when product name changes
  useEffect(() => {
    if (formData.name && formData.name.trim() !== '') {
      const keywords = generateSearchKeywords(formData.name);
      setFormData(prev => ({
        ...prev,
        searchkeywords: keywords
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        searchkeywords: []
      }));
    }
  }, [formData.name]);

  const resetForm = () => {
    setFormData({
      basesku: '',
      brand: '',
      careinstructions: '',
      category: '',
      color: '',
      description: '',
      gender: '',
      "height(cm)": '',
      hsncode: '',
      images: [],
      "length(cm)": '',
      material: '',
      name: '',
      name_lower: '',
      occasion: '',
      offerprice: '',
      pattern: '',
      price: '',
      productid: '',
      searchkeywords: [],
      sellerid: '',
      seourl: '',
      sizevariants: [],
      stock: '',
      subcategory: '',
      "weight(g)": '',
      "width(cm)": '',
      isFeatured: false,
      featuredProductInfo: {
        title: '',
        description: '',
        displayOrder: ''
      }
    });
    setImagePreviews([]);
    setImageFiles([]);
    setExistingImages([]);
    setSizeVariants([]);
    setActiveTab('basic');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setUploadingImages(true);
      
      // Add new files to imageFiles state
      setImageFiles(prev => [...prev, ...validFiles]);
      
      // Create previews for new files
      const newPreviews = [];
      let loadedCount = 0;

      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          loadedCount++;
          
          // When all previews are loaded, update the state
          if (loadedCount === validFiles.length) {
            setImagePreviews(prev => [...prev, ...newPreviews]);
            setUploadingImages(false);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = ''; // Reset file input
  };

  const removeImage = (index) => {
    // Check if it's an existing image or a new upload
    if (index < existingImages.length) {
      // Remove existing image
      const updatedExistingImages = existingImages.filter((_, i) => i !== index);
      setExistingImages(updatedExistingImages);
      
      // Update both previews and form data
      const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
      setImagePreviews(updatedPreviews);
      
      setFormData(prev => ({
        ...prev,
        images: updatedPreviews
      }));
    } else {
      // Remove new upload (adjust index for imageFiles)
      const newUploadIndex = index - existingImages.length;
      setImageFiles(prev => prev.filter((_, i) => i !== newUploadIndex));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Enhanced image upload function
  const uploadImagesToFirebase = async (files) => {
    if (!files || files.length === 0) return [];
    
    const uploadPromises = files.map(async (file) => {
      try {
        const timestamp = Date.now();
        const fileName = `product_${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const imageRef = ref(storage, `products/${fileName}`);
        
        const snapshot = await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload image: ${file.name}`);
      }
    });

    return await Promise.all(uploadPromises);
  };

  const addSizeVariant = () => {
    setSizeVariants(prev => [...prev, { size: '', price: '', sku: '', stock: '' }]);
  };

  const updateSizeVariant = (index, field, value) => {
    setSizeVariants(prev => 
      prev.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  };

  const removeSizeVariant = (index) => {
    setSizeVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const requiredFields = {
      name: 'Product Name',
      category: 'Category',
      subcategory: 'Subcategory',
      price: 'Price',
      stock: 'Stock Quantity',
      hsncode: 'HSN Code',
      sellerid: 'Seller ID'
    };

    for (const [field, fieldName] of Object.entries(requiredFields)) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        alert(`Please fill in ${fieldName}`);
        return;
      }
    }

    const priceValue = safeNumber(formData.price);
    const stockValue = safeInt(formData.stock);
    const offerPriceValue = formData.offerprice ? safeNumber(formData.offerprice) : 0;

    if (priceValue <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    if (stockValue < 0) {
      alert('Please enter a valid stock quantity');
      return;
    }

    if (offerPriceValue > 0 && offerPriceValue >= priceValue) {
      alert('Offer price should be less than regular price');
      return;
    }

    try {
      setLoading(true);

      // Look up category ID
      const categoryObj = categories.find(cat => cat.name === formData.category);
      const categoryId = categoryObj?.id || '';

      // Look up subcategory ID
      const subcategoryObj = subCategories.find(subCat => subCat.name === formData.subcategory);
      const subcategoryId = subcategoryObj?.id || '';

      // Upload new images to Firebase
      let newImageUrls = [];
      if (imageFiles.length > 0) {
        newImageUrls = await uploadImagesToFirebase(imageFiles);
      }

      // Combine existing images with newly uploaded ones
      const allImageUrls = [...existingImages, ...newImageUrls];

      // Process size variants with proper numeric types
      const processedSizeVariants = sizeVariants
        .filter(variant => variant.size && variant.price)
        .map(variant => ({
          size: variant.size.trim(),
          price: safeNumber(variant.price),
          sku: variant.sku?.trim() || '',
          stock: safeInt(variant.stock)
        }));

      const productData = {
        basesku: formData.basesku.trim() || `BSK${Date.now()}`,
        brand: formData.brand.trim(),
        careinstructions: formData.careinstructions.trim(),
        category: formData.category,
        categoryId: categoryId,
        color: formData.color.trim(),
        description: formData.description.trim(),
        gender: formData.gender,
        "height(cm)": safeNumber(formData["height(cm)"]),
        hsncode: formData.hsncode.trim(),
        "length(cm)": safeNumber(formData["length(cm)"]),
        material: formData.material.trim(),
        name: formData.name.trim(),
        name_lower: formData.name.trim().toLowerCase(),
        occasion: formData.occasion.trim(),
        offerprice: offerPriceValue,
        pattern: formData.pattern.trim(),
        price: priceValue,
        productid: formData.productid || `PID${Date.now()}`,
        searchkeywords: formData.searchkeywords,
        sellerid: formData.sellerid.trim(),
        seourl: formData.seourl.trim() || `${formData.name.replace(/\s+/g, '-')}-${formData.productid || `PID${Date.now()}`}`.toLowerCase(),
        sizevariants: processedSizeVariants,
        stock: stockValue,
        subcategory: formData.subcategory,
        subcategoryId: subcategoryId,
        "weight(g)": safeNumber(formData["weight(g)"]),
        "width(cm)": safeNumber(formData["width(cm)"]),
        images: allImageUrls,
        isFeatured: formData.isFeatured,
        featuredProductInfo: formData.isFeatured ? {
          title: formData.featuredProductInfo.title.trim(),
          description: formData.featuredProductInfo.description.trim(),
          displayOrder: formData.featuredProductInfo.displayOrder ? parseInt(formData.featuredProductInfo.displayOrder) : null
        } : null,
        updatedAt: serverTimestamp()
      };

      // Remove empty fields
      Object.keys(productData).forEach(key => {
        if (productData[key] === '' || 
            productData[key] === null || 
            productData[key] === undefined ||
            (Array.isArray(productData[key]) && productData[key].length === 0)) {
          delete productData[key];
        }
      });

      let result;
      if (editingProduct) {
        // Update existing product
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, productData);
        result = {
          id: editingProduct.id,
          ...productData
        };
      } else {
        // Create new product
        productData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'products'), productData);
        result = {
          id: docRef.id,
          ...productData
        };
      }

      if (result) {
        if (onProductAdded) {
          onProductAdded(result, editingProduct ? 'updated' : 'added');
        }
        
        // Send notification if it's a new featured product or newly marked as featured
        if (productData.isFeatured && (!editingProduct || !editingProduct.isFeatured)) {
          await sendTopicNotification(
            'all_users',
            'New Featured Product!',
            `${productData.name} is now featured! ${productData.featuredProductInfo?.title || ''}`,
            { screen: 'product_details', productId: result.id }
          );
        }

        alert(`Product ${editingProduct ? 'updated' : 'added'} successfully!`);
        handleClose();
      }
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert(`Error saving product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Navigation tabs
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'pricing', label: 'Pricing & Stock', icon: Tag },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'attributes', label: 'Attributes', icon: Ruler },
    { id: 'variants', label: 'Variants', icon: Package },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                    <Info size={16} />
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                    disabled={loading}
                  />
                  {formData.searchkeywords.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Generated Search Keywords ({formData.searchkeywords.length}):
                      </label>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-gray-800/50 rounded-lg">
                        {formData.searchkeywords.slice(0, 20).map((keyword, index) => (
                          <span 
                            key={index} 
                            className="inline-block px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded-md border border-blue-500/30"
                          >
                            {keyword}
                          </span>
                        ))}
                        {formData.searchkeywords.length > 20 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded-md">
                            +{formData.searchkeywords.length - 20} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Write a detailed product description..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
                    rows="5"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Brand
                    </label>
                    <select
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    >
                     {uniqueBrands.map((brand) => (
 <option key={brand.id} value={brand.name}>
    {brand.name}
  </option>
))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      placeholder="Product color"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required
                      disabled={loading}
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Subcategory *
                    </label>
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required
                      disabled={loading}
                    >
                      <option value="">Select Subcategory</option>
                      {filteredSubCategories.map((subCat) => (
                        <option key={subCat.id} value={subCat.name || subCat.subcategory}>
                          {subCat.name || subCat.subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Base SKU
                    </label>
                    <input
                      type="text"
                      name="basesku"
                      value={formData.basesku}
                      onChange={handleInputChange}
                      placeholder="Base SKU code"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Product ID
                    </label>
                    <input
                      type="text"
                      name="productid"
                      value={formData.productid}
                      onChange={handleInputChange}
                      placeholder="Product ID"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                    <User size={16} />
                    Seller ID *
                  </label>
                  <input
                    type="text"
                    name="sellerid"
                    value={formData.sellerid}
                    onChange={handleInputChange}
                    placeholder="Enter Seller ID"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <DollarSign size={20} />
                  Pricing Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Regular Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required
                      min="0"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Offer Price (₹)
                    </label>
                    <input
                      type="number"
                      name="offerprice"
                      value={formData.offerprice}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      min="0"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required
                      min="0"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                      <Hash size={16} />
                      HSN Code *
                    </label>
                    <input
                      type="text"
                      name="hsncode"
                      value={formData.hsncode}
                      onChange={handleInputChange}
                      placeholder="Enter HSN Code"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">SEO & Identification</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    SEO URL
                  </label>
                  <input
                    type="text"
                    name="seourl"
                    value={formData.seourl}
                    onChange={handleInputChange}
                    placeholder="SEO-friendly URL"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    >
                      <option value="">Select Gender</option>
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Unisex">Unisex</option>
                      <option value="Kids">Kids</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Occasion
                    </label>
                    <input
                      type="text"
                      name="occasion"
                      value={formData.occasion}
                      onChange={handleInputChange}
                      placeholder="Occasion"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Camera size={20} />
                Product Images
                {uploadingImages && (
                  <span className="text-blue-400 text-sm ml-2">(Uploading...)</span>
                )}
              </label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Upload Area */}
                <div>
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-2xl cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-all duration-300 hover:border-blue-500 group">
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 p-4 w-full h-full overflow-auto">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group/image">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-28 object-cover rounded-lg shadow-lg transition-transform group-hover/image:scale-105"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-700"
                              disabled={loading}
                            >
                              ×
                            </button>
                            {index < existingImages.length && (
                              <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">
                                Existing
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
                        <Upload className="w-12 h-12 mb-4 opacity-60" />
                        <p className="text-lg font-medium">Upload Product Images</p>
                        <span className="text-sm text-gray-500 mt-2 text-center">
                          Drag & drop or click to browse<br />
                          Multiple images supported
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      disabled={loading || uploadingImages}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Supported formats: JPG, PNG, WEBP • Max size: 5MB per image
                    {imagePreviews.length > 0 && ` • ${imagePreviews.length} image(s) selected`}
                  </p>
                </div>

                {/* Image Guidelines */}
                <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
                  <h4 className="text-sm font-semibold text-white mb-3">Image Guidelines</h4>
                  <ul className="text-xs text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      Use high-quality, clear images
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      Show product from multiple angles
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      Use natural lighting when possible
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      First image will be used as main display
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'attributes':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Ruler size={20} />
                  Dimensions & Weight
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height(cm)"
                      value={formData["height(cm)"]}
                      onChange={handleInputChange}
                      placeholder="Height in cm"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      step="0.1"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      name="width(cm)"
                      value={formData["width(cm)"]}
                      onChange={handleInputChange}
                      placeholder="Width in cm"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      step="0.1"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      name="length(cm)"
                      value={formData["length(cm)"]}
                      onChange={handleInputChange}
                      placeholder="Length in cm"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      step="0.1"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Weight (g)
                    </label>
                    <input
                      type="number"
                      name="weight(g)"
                      value={formData["weight(g)"]}
                      onChange={handleInputChange}
                      placeholder="Weight in grams"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      step="0.1"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Palette size={20} />
                  Product Attributes
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Material
                  </label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleInputChange}
                      placeholder="Product material"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled={loading}
                    />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Pattern
                  </label>
                  <input
                    type="text"
                    name="pattern"
                    value={formData.pattern}
                    onChange={handleInputChange}
                    placeholder="e.g., Gotta Patti, Floral, Geometric"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Care Instructions
                  </label>
                  <textarea
                    name="careinstructions"
                    value={formData.careinstructions}
                    onChange={handleInputChange}
                    placeholder="Care instructions..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
                    rows="3"
                    disabled={loading}
                  />
                </div>

                {/* Featured Product Toggle */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-200">
                      Make this a Featured Product
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        isFeatured: !prev.isFeatured
                      }))}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                        formData.isFeatured
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      disabled={loading}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          formData.isFeatured ? 'translate-x-9' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Featured Product Fields - Show only if isFeatured is true */}
                  {formData.isFeatured && (
                    <div className="mt-6 bg-gray-800/50 rounded-xl p-6 border border-gray-700 border-dashed space-y-4">
                      <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Featured Product Details
                      </h4>

                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">
                          Featured Title *
                        </label>
                        <input
                          type="text"
                          value={formData.featuredProductInfo.title}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            featuredProductInfo: {
                              ...prev.featuredProductInfo,
                              title: e.target.value
                            }
                          }))}
                          placeholder="Enter featured product title"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">
                          Featured Description
                        </label>
                        <textarea
                          value={formData.featuredProductInfo.description}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            featuredProductInfo: {
                              ...prev.featuredProductInfo,
                              description: e.target.value
                            }
                          }))}
                          placeholder="Why is this product featured? (e.g., Best Seller, New Arrival, Trending)"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200"
                          rows="2"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={formData.featuredProductInfo.displayOrder}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            featuredProductInfo: {
                              ...prev.featuredProductInfo,
                              displayOrder: e.target.value
                            }
                          }))}
                          placeholder="Position in featured products list (1, 2, 3...)"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                          min="1"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'variants':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package size={20} />
                Size Variants
              </h3>
              <button
                type="button"
                onClick={addSizeVariant}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 disabled:opacity-50"
                disabled={loading}
              >
                <Plus size={18} />
                Add Size Variant
              </button>
            </div>

            {sizeVariants.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-600">
                <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No size variants added yet</p>
                <p className="text-sm text-gray-500 mt-1">Add your first size variant to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sizeVariants.map((variant, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-semibold text-white">Variant #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeSizeVariant(index)}
                        className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Size</label>
                        <input
                          type="text"
                          placeholder="e.g., S, M, L"
                          value={variant.size}
                          onChange={(e) => updateSizeVariant(index, 'size', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Price (₹)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={variant.price}
                          onChange={(e) => updateSizeVariant(index, 'price', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          step="0.01"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">SKU</label>
                        <input
                          type="text"
                          placeholder="Variant SKU"
                          value={variant.sku}
                          onChange={(e) => updateSizeVariant(index, 'sku', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Stock</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={variant.stock}
                          onChange={(e) => updateSizeVariant(index, 'stock', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          min="0"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 w-full max-w-6xl shadow-2xl border border-gray-700 relative overflow-hidden max-h-[95vh] transition-all duration-300">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700 relative">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p className="text-gray-400 mt-1 text-sm">
              {editingProduct ? 'Update your product information' : 'Create a new product listing'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-all duration-200"
            disabled={loading}
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800/50 rounded-2xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                  disabled={loading}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {renderTabContent()}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-700 relative">
            <div>
              <button
                type="button"
                onClick={handleClose}
                className="px-8 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-4">
              {/* Previous Button - Hidden on first tab */}
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabIds = tabs.map(t => t.id);
                    const currentIndex = tabIds.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabIds[currentIndex - 1]);
                    }
                  }}
                  className="px-8 py-3 rounded-xl bg-gray-600 hover:bg-gray-500 text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  disabled={loading}
                >
                  ← Previous
                </button>
              )}

              {/* Next Button - Hidden on last tab */}
              {activeTab !== 'variants' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabIds = tabs.map(t => t.id);
                    const currentIndex = tabIds.indexOf(activeTab);
                    if (currentIndex < tabIds.length - 1) {
                      setActiveTab(tabIds[currentIndex + 1]);
                    }
                  }}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || uploadingImages}
                >
                  Next →
                </button>
              )}

              {/* Upload Button - Only on last tab */}
              {activeTab === 'variants' && (
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-green-500/30 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading || uploadingImages}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editingProduct ? 'Updating...' : 'Uploading...'}
                    </>
                  ) : uploadingImages ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading Images...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {editingProduct ? 'Update Product' : 'Upload Product'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;

// Add custom scrollbar styles
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(75, 85, 99, 0.3);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.7);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}