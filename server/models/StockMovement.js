const mongoose = require("mongoose");
const stockMovementSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, required: true },
  sku: { type: String, default: "" },
  type: { type: String, enum: ["opening", "import", "sale", "adjustment", "deletion"], required: true },
  change: { type: Number, required: true },
  quantityAfter: { type: Number, default: null },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true }
});
stockMovementSchema.index({ owner: 1, createdAt: -1 });
module.exports = mongoose.model("StockMovement", stockMovementSchema);
