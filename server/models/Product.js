const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  productName: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  category: { type: String, default: "General", trim: true },
  quantity: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date, default: null },
  lastSaleDate: { type: Date, default: null },
  unitPrice: { type: Number, required: true, min: 0, default: 0 },
  dailySales: { type: Number, min: 0, default: 0 },
  leadTimeDays: { type: Number, min: 0, default: 7 },
  safetyStock: { type: Number, min: 0, default: 5 },
  targetStock: { type: Number, min: 0, default: 20 },
  supplierName: { type: String, default: "" }
}, { timestamps: true });
productSchema.index({ owner: 1, sku: 1 }, { unique: true });
module.exports = mongoose.model("Product", productSchema);
