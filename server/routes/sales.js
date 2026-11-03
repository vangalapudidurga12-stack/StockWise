const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");
const authMiddleware = require("../middleware/authMiddleware");
router.use(authMiddleware);
function dayBounds(dateText) {
  if (!dateText) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  const start = new Date(`${dateText}T00:00:00.000`); if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start); end.setDate(end.getDate() + 1); return { $gte: start, $lt: end };
}
router.get("/", async (req, res) => {
  try {
    const bounds = dayBounds(req.query.date);
    if (bounds === false) return res.status(400).json({ message: "Date must use YYYY-MM-DD format." });
    const filter = { owner: req.user.id }; if (bounds) filter.soldAt = bounds;
    const sales = await Sale.find(filter).sort({ soldAt: -1 }).limit(2000);
    const summary = sales.reduce((a, s) => ({ count: a.count + 1, units: a.units + s.quantity, revenue: a.revenue + s.total }), { count: 0, units: 0, revenue: 0 });
    res.json({ sales, summary });
  } catch { res.status(500).json({ message: "Unable to load sales history." }); }
});
router.post("/:productId", async (req, res) => {
  try {
    const { productId } = req.params; const quantity = Number(req.body.quantity);
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Invalid product ID." });
    if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ message: "Enter a valid whole-number sale quantity." });
    const product = await Product.findOneAndUpdate({ _id: productId, owner: req.user.id, quantity: { $gte: quantity } }, { $inc: { quantity: -quantity }, $set: { lastSaleDate: new Date() } }, { new: true, runValidators: true });
    if (!product) {
      const existing = await Product.findOne({ _id: productId, owner: req.user.id });
      if (!existing) return res.status(404).json({ message: "Product not found." });
      return res.status(400).json({ message: `Insufficient stock. Available quantity: ${existing.quantity}.` });
    }
    const unitPrice = Number(product.unitPrice || 0);
    const sale = await Sale.create({ owner: req.user.id, product: product._id, productName: product.productName, sku: product.sku, quantity, unitPrice, total: quantity * unitPrice });
    await StockMovement.create({ owner: req.user.id, product: product._id, productName: product.productName, sku: product.sku, type: "sale", change: -quantity, quantityAfter: product.quantity, note: `Sale record ${sale._id}` });
    res.json({ message: "Sale recorded successfully.", product, sale });
  } catch (e) { console.error(e); res.status(500).json({ message: "Unable to record sale." }); }
});
module.exports = router;
