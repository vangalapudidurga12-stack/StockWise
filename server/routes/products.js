const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const StockMovement = require("../models/StockMovement");
const authMiddleware = require("../middleware/authMiddleware");
router.use(authMiddleware);
const ownerId = (req) => req.user.id;

function clean(body = {}) {
  return {
    productName: String(body.productName || "").trim(), sku: String(body.sku || "").trim(),
    category: String(body.category || "General").trim(), quantity: Number(body.quantity),
    unitPrice: Number(body.unitPrice || 0), dailySales: Number(body.dailySales || 0),
    safetyStock: Number(body.safetyStock ?? 5), leadTimeDays: Number(body.leadTimeDays ?? 7),
    targetStock: Number(body.targetStock ?? 20), expiryDate: body.expiryDate || null,
    lastSaleDate: body.lastSaleDate || null, supplierName: body.supplierName || body.supplier || ""
  };
}
function validate(data) {
  if (!data.productName || !data.sku || !Number.isFinite(data.quantity) || data.quantity < 0) return "Product name, SKU, and valid quantity are required.";
  if (!Number.isFinite(data.unitPrice) || data.unitPrice < 0) return "Enter a valid unit price.";
  return null;
}
router.get("/", async (req, res) => {
  try { res.json(await Product.find({ owner: ownerId(req) }).sort({ createdAt: -1 })); }
  catch { res.status(500).json({ message: "Unable to load products." }); }
});
router.post("/", async (req, res) => {
  try {
    const data = clean(req.body); const invalid = validate(data);
    if (invalid) return res.status(400).json({ message: invalid });
    const product = await Product.create({ ...data, owner: ownerId(req) });
    await StockMovement.create({ owner: ownerId(req), product: product._id, productName: product.productName, sku: product.sku, type: "opening", change: product.quantity, quantityAfter: product.quantity, note: "Product added manually" });
    res.status(201).json({ message: "Product added.", product });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "This SKU already exists in your inventory." });
    res.status(400).json({ message: e.message || "Unable to add product." });
  }
});
router.post("/bulk-import", async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!rows.length) return res.status(400).json({ message: "No product rows were provided." });
    if (rows.length > 5000) return res.status(413).json({ message: "Please import no more than 5,000 rows at a time." });
    const added = [], failed = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const data = clean(rows[i]); const invalid = validate(data);
        if (invalid) throw new Error(invalid);
        const product = await Product.create({ ...data, owner: ownerId(req) });
        added.push(product);
        await StockMovement.create({ owner: ownerId(req), product: product._id, productName: product.productName, sku: product.sku, type: "import", change: product.quantity, quantityAfter: product.quantity, note: "Imported from Excel" });
      } catch (e) { failed.push({ row: i + 2, message: e.code === 11000 ? "This SKU already exists in your inventory." : (e.message || "Invalid row") }); }
    }
    if (added.length) await User.updateOne({ _id: ownerId(req) }, { $set: { hasCompletedInitialImport: true } });
    res.json({ message: `${added.length} products imported.`, addedCount: added.length, failed, hasCompletedInitialImport: added.length > 0 });
  } catch (e) { console.error("Bulk import error:", e); res.status(500).json({ message: "Bulk import failed." }); }
});
router.get("/expiry-alerts", async (req, res) => {
  try {
    const limit = new Date(); limit.setDate(limit.getDate() + 30);
    res.json(await Product.find({ owner: ownerId(req), expiryDate: { $ne: null, $lte: limit } }).sort({ expiryDate: 1 }));
  } catch { res.status(500).json({ message: "Unable to load expiry alerts." }); }
});
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const before = await Product.findOne({ _id: req.params.id, owner: ownerId(req) });
    if (!before) return res.status(404).json({ message: "Product not found." });
    const data = clean({ ...before.toObject(), ...req.body }); const invalid = validate(data);
    if (invalid) return res.status(400).json({ message: invalid });
    const product = await Product.findOneAndUpdate({ _id: req.params.id, owner: ownerId(req) }, data, { new: true, runValidators: true });
    const delta = Number(product.quantity) - Number(before.quantity);
    if (delta !== 0) await StockMovement.create({ owner: ownerId(req), product: product._id, productName: product.productName, sku: product.sku, type: "adjustment", change: delta, quantityAfter: product.quantity, note: "Manual product/stock update" });
    res.json({ message: "Product updated.", product });
  } catch (e) { res.status(400).json({ message: e.message || "Unable to update product." }); }
});
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: ownerId(req) });
    if (!product) return res.status(404).json({ message: "Product not found." });
    await StockMovement.create({ owner: ownerId(req), product: null, productName: product.productName, sku: product.sku, type: "deletion", change: -Number(product.quantity || 0), quantityAfter: null, note: "Product deleted; historical sales retained" });
    res.json({ message: "Product deleted. Historical sales records have been retained." });
  } catch { res.status(500).json({ message: "Unable to delete product." }); }
});
module.exports = router;
