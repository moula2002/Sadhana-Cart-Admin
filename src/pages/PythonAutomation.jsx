import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Play, CheckCircle, FileSpreadsheet, Trash2, RefreshCw, Eye, EyeOff, Settings, AlertCircle, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const PythonAutomation = () => {
  const [file, setFile] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [sellerId, setSellerId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Column mappings (from Node.js code)
  const COLUMN_MAPPINGS = {
    name: ["title", "name", "product name", "product", "product title"],
    description: ["description", "product description", "body (html)", "details"],
    stock: ["stock", "quantity", "qty", "available stock"],
    sku: ["sku", "variant sku", "baseSku"],
    category: ["category", "product category", "Type"],
    subcategory: ["subcategory", "sub category"],
    brand: ["brand", "vendor"],
     productId: ["product id", "productid", "id", "product_id"],
    price: ["price", "mrp", "selling price", "sale price"],
    offerPrice: ["offerprice", "offer price", "msrp", "compare at price", "discount price"],
    image: ["image1", "image 1", "img1", "image2", "image 2", "img2", "image3", "image4", "image5", "photo", "pic", "url", "gallery"],
    size: ["size"]
  };

  const CORE_FIELDS = new Set([
    "productId", "name", "name_lower", "description", "category", "subcategory",
    "baseSku", "brand", "price", "offerPrice", "stock", "timestamp", "images",
    "sellerId", "sizeVariants"
  ]);

  // Aliases
  const ALIASES = Object.values(COLUMN_MAPPINGS).flat().map(v => v.toLowerCase().trim());

  // HTML cleaner
  const cleanHtml = (text) => {
    if (!text || text === "NaN" || text === 'undefined' || text === 'null') return "";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(text), 'text/html');
      return doc.body.textContent || "";
    } catch {
      return String(text).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    }
  };

  const pickColumn = (possibleNames, availableColumns) => {
    for (const name of possibleNames) {
      for (const col of availableColumns) {
        if (col.trim().toLowerCase() === name.trim().toLowerCase()) return col;
      }
    }
    return null;
  };

  const safeNumber = (val) => {
    try {
      const str = String(val ?? "");
      const cleaned = str.replace(/[^0-9.-]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : Math.floor(num);
    } catch {
      return 0;
    }
  };
  const safeStr = (val) => {
    if (val === undefined || val === null) return "";
    const s = String(val).trim();
    return (s.toLowerCase() === "nan") ? "" : s;
  };

  // Normalizer
  const normalizeKeys = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(i => normalizeKeys(i));
    } else if (typeof obj === "object" && obj !== null) {
      const normalized = {};
      Object.entries(obj).forEach(([k, v]) => {
        normalized[k.toLowerCase().replace(/\s+/g, '')] = normalizeKeys(v);
      });
      return normalized;
    }
    return obj;
  };

  // ----------------- KEYWORD GENERATOR (JS) -----------------
  const CATEGORY_SYNONYMS = {
    // Clothing & Fashion
    tshirt: ["tee", "t-shirt", "tee shirt", "round neck", "crew neck"],
    shirt: ["formal shirt", "casual shirt", "kurta", "topwear"],
    pant: ["pants", "trousers", "chinos", "bottoms"],
    jeans: ["denim", "denims", "skinny jeans", "slim fit"],
    shorts: ["half pant", "bermuda", "capri"],
    jacket: ["coat", "blazer", "hoodie", "sweater", "sweatshirt"],
    saree: ["sari", "ethnic wear", "traditional wear"],
    dress: ["frock", "gown", "maxi dress", "one piece"],
    lehenga: ["chaniya choli", "ghagra", "ethnic skirt"],
    kurti: ["ethnic top", "tunic"],
    shoes: ["footwear", "sneakers", "boots", "sandals", "slippers"],
    bag: ["handbag", "backpack", "purse", "sling bag"],
    cap: ["hat", "baseball cap", "beanie"],

    // Electronics
    mobile: ["phone", "cellphone", "smartphone", "android", "iphone"],
    tv: ["television", "led tv", "smart tv", "oled", "lcd"],
    laptop: ["notebook", "pc", "computer", "macbook"],
    tablet: ["ipad", "tab"],
    fridge: ["refrigerator", "freezer"],
    ac: ["air conditioner", "cooler"],
    watch: ["smartwatch", "wristwatch", "analog watch", "digital watch"],
    headphones: ["earphones", "earbuds", "headset"],
    camera: ["dslr", "mirrorless", "camcorder"],
    speaker: ["bluetooth speaker", "soundbar", "home theater"],
    charger: ["adapter", "power brick"],
    powerbank: ["portable charger", "battery bank"],

    // Home & Furniture
    sofa: ["couch", "seating", "settee"],
    bed: ["cot", "bunk bed", "mattress", "king bed", "queen bed"],
    chair: ["stool", "armchair", "recliner", "rocking chair"],
    table: ["desk", "dining table", "study table", "coffee table"],
    almirah: ["wardrobe", "closet", "cupboard"],

    // Grocery
    rice: ["grains", "basmati", "raw rice", "brown rice"],
    atta: ["flour", "wheat flour"],
    dal: ["pulses", "lentils", "toor dal", "moong dal"],
    oil: ["cooking oil", "mustard oil", "sunflower oil", "groundnut oil"],
    milk: ["dairy", "curd", "yogurt", "paneer"],
    spices: ["masala", "chilli powder", "turmeric"],

    // Beauty & Personal Care
    lipstick: ["lip color", "makeup"],
    foundation: ["makeup base", "concealer"],
    cream: ["lotion", "moisturizer", "ointment"],
    perfume: ["deo", "fragrance", "body spray"],
    shampoo: ["hair wash", "conditioner"],
    soap: ["body wash", "cleanser"],

    // Baby & Kids
    toys: ["games", "playthings", "action figure", "doll", "lego"],
    diaper: ["nappy", "pamper"],
    stroller: ["pram", "baby carriage"],
    kidswear: ["baby dress", "infant clothes", "frock"],

    // Sports & Fitness
    bat: ["cricket bat"],
    ball: ["football", "soccer ball", "basketball", "tennis ball"],
    cycle: ["bicycle", "bike"],
    "yoga mat": ["fitness mat", "exercise mat"],
    dumbbell: ["weights", "gym equipment"],

    // Kitchen & Appliances
    mixer: ["grinder", "blender", "juicer"],
    cooker: ["pressure cooker", "rice cooker"],
    utensils: ["pots", "pans", "kitchenware", "cutlery"],
    microwave: ["oven", "baking oven"],

    // Automobiles
    bike: ["motorcycle", "scooter", "two-wheeler"],
    car: ["automobile", "four-wheeler", "vehicle"],
    helmet: ["headgear", "riding helmet"],
    tyre: ["tire", "wheel"],

    // Accessories
    belt: ["waist belt"],
    wallet: ["purse", "card holder"],
    sunglasses: ["goggles", "shades", "glasses"],
    jewellery: ["jewelry", "earring", "ring", "necklace", "bracelet"],
  };

  const generateKeywords = (text) => {
    if (!text) return [];
    const lower = String(text).toLowerCase();
    const words = lower.match(/\w+/g) || [];
    const keywords = new Set(words);

    // Prefixes for autocomplete
    for (const word of words) {
      for (let i = 1; i <= word.length; i++) {
        keywords.add(word.slice(0, i));
      }
      // plural/singular versions
      if (!word.endsWith('s')) keywords.add(word + 's');
      if (word.endsWith('s')) keywords.add(word.slice(0, -1));
    }

    // Join word combinations
    if (words.length > 1) {
      for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j <= words.length; j++) {
          keywords.add(words.slice(i, j).join(' '));
        }
      }
    }

    return Array.from(keywords);
  };

  const generateProductKeywords = (name, category, subcategory) => {
    const keywords = new Set();
    generateKeywords(name).forEach(k => keywords.add(k));
    generateKeywords(category).forEach(k => keywords.add(k));
    generateKeywords(subcategory).forEach(k => keywords.add(k));

    const allText = `${name || ''} ${category || ''} ${subcategory || ''}`.toLowerCase();
    Object.entries(CATEGORY_SYNONYMS).forEach(([key, syns]) => {
      if (allText.includes(key)) {
        keywords.add(key);
        syns.forEach(s => keywords.add(s));
      }
    });
    return Array.from(keywords);
  };

  // File upload with drag and drop
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    validateAndSetFile(uploadedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const uploadedFile = e.dataTransfer.files[0];
    if (!uploadedFile) return;
    validateAndSetFile(uploadedFile);
  };

  const validateAndSetFile = (uploadedFile) => {
    const fileName = uploadedFile.name.toLowerCase();
    if (fileName.endsWith(".csv") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      setFile(uploadedFile);
    } else {
      alert("Please upload only CSV or Excel files");
    }
  };

  const removeFile = () => {
    setFile(null);
    setProcessedData(null);
    setOriginalData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Excel → CSV
  const convertExcelToCSV = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_csv(ws));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // CSV parser using XLSX to handle quoted commas robustly
  const parseCSV = (csvText) => {
    try {
      const wb = XLSX.read(csvText, { type: "string" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const headers = Object.keys(json[0] || {});
      return { headers, data: json };
    } catch (e) {
      // Fallback to simple parser if XLSX fails
      const lines = csvText.split("\n").filter(l => l.trim());
      if (!lines.length) return { headers: [], data: [] };
      const headers = lines[0].split(",").map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(",");
        const row = {};
        headers.forEach((h, i) => row[h] = values[i] || "");
        return row;
      });
      return { headers, data };
    }
  };

  // Process CSV/Excel with progress tracking
  const processCSV = async () => {
    if (!file) return alert("Upload file first");
    setProcessing(true);
    setProcessingProgress(0);

    try {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
      
      let workbook;
      if (isExcel) {
        const data = await file.arrayBuffer();
        workbook = XLSX.read(data, { type: 'array' });
      } else {
        const text = await file.text();
        workbook = XLSX.read(text, { type: 'string' });
      }

      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      
      // Extract images from .xlsx if applicable
      let extractedImagesByRow = {};
      if (fileName.endsWith(".xlsx")) {
        try {
          const zip = await JSZip.loadAsync(file);

          // 1. Get drawing relationships to map rId to media path
          const relFiles = Object.keys(zip.files).filter(path => path.includes("xl/drawings/_rels/drawing"));
          const drawingRels = {};
          for (const relFile of relFiles) {
            const relXml = await zip.file(relFile).async("text");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(relXml, "text/xml");
            const rels = xmlDoc.getElementsByTagName("Relationship");
            const drawingNum = relFile.match(/drawing(\d+)\.xml\.rels/)?.[1] || "1";
            drawingRels[drawingNum] = {};
            for (let i = 0; i < rels.length; i++) {
              const target = rels[i].getAttribute("Target");
              if (target) {
                // Handle different relative path formats
                const mediaPath = target.startsWith("../media/") 
                  ? target.replace("../media/", "xl/media/") 
                  : target.includes("media/") 
                    ? `xl/media/${target.split("media/").pop()}`
                    : target;
                drawingRels[drawingNum][rels[i].getAttribute("Id")] = mediaPath;
              }
            }
          }

          // 2. Get drawing anchors to map row to rId
          const drawingFiles = Object.keys(zip.files).filter(path => path.startsWith("xl/drawings/drawing") && !path.includes("_rels"));
          const rowMappings = {};
          for (const drawFile of drawingFiles) {
            const drawXml = await zip.file(drawFile).async("text");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(drawXml, "text/xml");
            const drawingNum = drawFile.match(/drawing(\d+)\.xml/)?.[1] || "1";

            // Use comprehensive selectors for all anchor types
            const anchors = xmlDoc.querySelectorAll("twoCellAnchor, oneCellAnchor, absoluteAnchor, xdr\\:twoCellAnchor, xdr\\:oneCellAnchor, xdr\\:absoluteAnchor");
            for (const anchor of anchors) {
              let fromRow = null;
              let rId = null;

              // 1. Find the 'from' row (for aligned anchors)
              const fromTags = anchor.getElementsByTagNameNS("*", "from") || anchor.getElementsByTagName("from");
              if (fromTags.length > 0) {
                const rowTags = fromTags[0].getElementsByTagNameNS("*", "row") || fromTags[0].getElementsByTagName("row");
                if (rowTags.length > 0) fromRow = rowTags[0].textContent;
              }

              // 2. Find the blip ID (r:embed or r:link)
              const blipTags = anchor.getElementsByTagNameNS("*", "blip") || anchor.getElementsByTagName("blip");
              if (blipTags.length > 0) {
                rId = blipTags[0].getAttribute("r:embed") || blipTags[0].getAttribute("embed") || 
                      blipTags[0].getAttribute("r:link") || blipTags[0].getAttribute("link");
              }

              if (fromRow !== null && rId && drawingRels[drawingNum] && drawingRels[drawingNum][rId]) {
                const rowIdx = parseInt(fromRow);
                const mediaPath = drawingRels[drawingNum][rId];
                if (!rowMappings[rowIdx]) rowMappings[rowIdx] = [];
                if (!rowMappings[rowIdx].includes(mediaPath)) {
                  rowMappings[rowIdx].push(mediaPath);
                }
              }
            }
          }

          // 3. Upload images and group by row (deduplicate uploads)
          const mediaCache = {}; 
          for (const rowIdx in rowMappings) {
            for (const mediaPath of rowMappings[rowIdx]) {
              if (mediaCache[mediaPath]) {
                if (!extractedImagesByRow[rowIdx]) extractedImagesByRow[rowIdx] = [];
                extractedImagesByRow[rowIdx].push(mediaCache[mediaPath]);
                continue;
              }

              const imgFile = zip.file(mediaPath);
              if (imgFile) {
                const blob = await imgFile.async("blob");
                // Check if blob is too small (likely a tiny icon/logo, e.g. < 1KB)
                if (blob.size < 1000) continue;

                const imageRef = ref(storage, `products/extracted_${Date.now()}_${mediaPath.split('/').pop()}`);
                const snapshot = await uploadBytes(imageRef, blob);
                const url = await getDownloadURL(snapshot.ref);

                mediaCache[mediaPath] = url;
                if (!extractedImagesByRow[rowIdx]) extractedImagesByRow[rowIdx] = [];
                extractedImagesByRow[rowIdx].push(url);
              }
            }
          }
        } catch (mediaErr) {
          console.error("Failed to extract media carefully:", mediaErr);
        }
      }

      // 4. Parse Rows and maintain original row indices
      const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      
      // Find the header row (first non-empty row)
      let headerIdx = 0;
      while (headerIdx < allRows.length && allRows[headerIdx].every(v => v === "")) {
        headerIdx++;
      }
      
      if (headerIdx >= allRows.length) return alert("Empty sheet or no data found");
      
      const rawHeaders = allRows[headerIdx];
      const dataRows = allRows.slice(headerIdx + 1);
      
      // Filter out completely empty rows but keep their original index
      const processedRows = dataRows.map((rowArr, i) => {
        if (rowArr.every(v => v === "")) return null;
        
        const obj = { __rowIdx__: headerIdx + 1 + i }; // This is 0-indexed row for drawing mapping
        rawHeaders.forEach((h, j) => {
          if (h) {
            obj[h.toString().trim()] = rowArr[j];
          }
        });
        return obj;
      }).filter(Boolean);

      setOriginalData(processedRows);

      const products = {};
      const totalRows = processedRows.length;

      processedRows.forEach((row, idx) => {
        if (idx % 10 === 0) {
          setProcessingProgress(Math.round((idx / totalRows) * 100));
        
        }
// Create grouping key using name + category


        const headers = Object.keys(row);
        const nameCol = pickColumn(COLUMN_MAPPINGS.name, headers);
        const descCol = pickColumn(COLUMN_MAPPINGS.description, headers);
        const stockCol = pickColumn(COLUMN_MAPPINGS.stock, headers);
        const skuCol = pickColumn(COLUMN_MAPPINGS.sku, headers);
        const categoryCol = pickColumn(COLUMN_MAPPINGS.category, headers);
        const subcategoryCol = pickColumn(COLUMN_MAPPINGS.subcategory, headers);
        const brandCol = pickColumn(COLUMN_MAPPINGS.brand, headers);
        const priceCol = pickColumn(COLUMN_MAPPINGS.price, headers);
        const offerCol = pickColumn(COLUMN_MAPPINGS.offerPrice, headers);
        const sizeCol = pickColumn(COLUMN_MAPPINGS.size, headers);
const productIdCol = pickColumn(COLUMN_MAPPINGS.productId, headers);
        const size = safeStr(row[sizeCol] || "");
        const variantStock = safeNumber(row[stockCol] || 0);


       const normalizedName = safeStr(row[nameCol] || "").toLowerCase().replace(/\s+/g, '');
const normalizedCategory = safeStr(row[categoryCol] || "").toLowerCase().replace(/\s+/g, '');

let productId = safeStr(productIdCol ? row[productIdCol] : "");

if (!productId) {
  productId = `${normalizedName}_${normalizedCategory}_${idx}`;
}

        if (!products[productId]) {
          products[productId] = {
            productId,
            name: safeStr(row[nameCol] || "Untitled"),
            name_lower: safeStr(row[nameCol] || "untitled").toLowerCase(),
            description: descCol ? cleanHtml(row[descCol]) : "",
            category: safeStr(row[categoryCol] || ""),
            subcategory: safeStr(row[subcategoryCol] || ""),
            baseSku: safeStr(row[skuCol] || ""),
            brand: safeStr(row[brandCol] || ""),
            price: safeNumber(row[priceCol] || 0),
            offerPrice: offerCol ? safeNumber(row[offerCol]) : safeNumber(row[priceCol] || 0),
            stock: 0,
            timestamp: new Date().toISOString(),
            images: [],
            sellerId,
            sizeVariants: []
          };
          
          // Image columns identification with stricter keyword matching
          const imageCols = headers.filter(c => {
            const low = c.toLowerCase().trim();
            // Avoid false positives like "pickup address"
            if (low.includes("pickup") || low.includes("address")) return false;
            
            return low.includes("image") || low.includes("img") || low === "photo" || 
                   low === "pic" || low === "picture" || low === "url" || low.includes("gallery");
          });
          
          // Validation to ensure the value is actually an image URL or path
          const isImageUrl = (val) => {
            const s = String(val).toLowerCase().trim();
            if (!s) return false;
            // Matches http, https, or common image extensions
            return s.startsWith("http") || 
                   s.startsWith("https") || 
                   s.includes("firebasestorage") ||
                   /\.(jpg|jpeg|png|gif|webp|svg|bmp|emf)$/i.test(s);
          };

          const rowImages = imageCols.map(c => safeStr(row[c] || ""))
            .filter(val => isImageUrl(val));

          // Add XML-extracted images using the absolute row index
          const xmlImages = extractedImagesByRow[row.__rowIdx__] || [];

          // Final images with deduplication
          const allImages = [...rowImages, ...xmlImages];
          products[productId].images = Array.from(new Set(allImages));
        }

        if (size) {
          products[productId].sizeVariants.push({
            size,
            stock: variantStock,
            sku: safeStr(row[skuCol] || ""),
            price: safeNumber(row[priceCol] || 0)
          });
        }
        products[productId].stock += variantStock;

        // Extra fields
        headers.forEach(col => {
          const cleanCol = col.trim();
          if (
            !ALIASES.includes(cleanCol.toLowerCase()) &&
            !CORE_FIELDS.has(cleanCol) &&
            !["image", "img", "photo", "pic", "url", "gallery"].some(k => cleanCol.toLowerCase().includes(k)) &&
            cleanCol.toLowerCase() !== "size" &&
            cleanCol !== "__rowIdx__"
          ) {
            const val = safeStr(row[cleanCol]);
            if (val) products[productId][cleanCol] = val;
          }
        });
      });

      // Append search keywords
      Object.values(products).forEach(p => {
        p.searchKeywords = generateProductKeywords(p.name, p.category, p.subcategory);
      });

      setProcessingProgress(100);
      const productList = Object.values(products);
      setProcessedData(productList);

      setTimeout(() => {
        alert(`✅ Successfully processed ${productList.length} products from ${totalRows} rows`);
        setProcessingProgress(0);
      }, 500);

    } catch (err) {
      console.error(err);
      alert("Processing Error: " + err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setProcessingProgress(0), 1000);
    }
  };

  // Download JSON
  const downloadJSON = () => {
    if (!processedData) return;
    const normalized = processedData.map(p => normalizeKeys(p));
    const dataStr = JSON.stringify(normalized, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Product Data Converter
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Transform your CSV/Excel files into structured JSON data with intelligent column mapping,
            HTML cleaning, and variant processing
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <Upload className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Upload Data File</h2>
              </div>

              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {!file ? (
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Drop your CSV or Excel file here
                      </p>
                      <p className="text-gray-500 mb-4">
                        or click to browse and select a file
                      </p>
                      <div className="text-sm text-gray-400">
                        Supports .csv, .xlsx, .xls formats
                      </div>
                      <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        File Selected Successfully
                      </p>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-600 mr-2" />
                            <span className="font-medium text-gray-900">{file.name}</span>
                          </div>
                          <button
                            onClick={removeFile}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Change File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <Settings className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    placeholder="Enter seller ID for product attribution"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty if you don't need seller attribution
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Actions & Results */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <Play className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Actions</h2>
              </div>

              <div className="space-y-4">
                <button
                  onClick={processCSV}
                  disabled={processing || !file}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${processing || !file
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                    }`}
                >
                  <div className="flex items-center justify-center">
                    {processing ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Convert File
                      </>
                    )}
                  </div>
                </button>

                {processingProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Processing progress</span>
                      <span>{processingProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={downloadJSON}
                  disabled={!processedData}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${!processedData
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl'
                    }`}
                >
                  <div className="flex items-center justify-center">
                    <Download className="w-5 h-5 mr-2" />
                    Download JSON
                  </div>
                </button>
              </div>
            </div>

            {/* Results Card */}
            {processedData && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Results</h2>
                  </div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Products Processed:</span>
                    <span className="font-semibold text-gray-900">{processedData.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Original Rows:</span>
                    <span className="font-semibold text-gray-900">{originalData?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">File Format:</span>
                    <span className="font-semibold text-gray-900">JSON</span>
                  </div>
                </div>

                {showPreview && processedData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Product</h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-auto max-h-32">
                      <pre>{JSON.stringify(processedData[0], null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default PythonAutomation;