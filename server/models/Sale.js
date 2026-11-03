const mongoose = require("mongoose");
const saleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null, index: true },
  productName: { type: String, required: true },
  sku: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  soldAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
saleSchema.index({ owner: 1, soldAt: -1 });
module.exports = mongoose.model("Sale", saleSchema);
