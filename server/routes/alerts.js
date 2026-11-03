const router = require("express").Router();
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");
router.use(authMiddleware);
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user.id });
    const now = new Date(); const expiryLimit = new Date(); expiryLimit.setDate(expiryLimit.getDate() + 30);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30); const alerts = [];
    for (const p of products) {
      if (p.expiryDate && p.expiryDate <= expiryLimit) alerts.push({ type: "expiry", severity: p.expiryDate < now ? "high" : "medium", product: p, message: p.expiryDate < now ? "Product has expired." : "Product is expiring within 30 days." });
      if (p.quantity <= (p.safetyStock ?? 10)) alerts.push({ type: "low-stock", severity: p.quantity === 0 ? "high" : "medium", product: p, message: p.quantity === 0 ? "Product is out of stock." : "Product is below its safety-stock level." });
      if (!p.lastSaleDate || p.lastSaleDate < cutoff) alerts.push({ type: "dead-stock", severity: "medium", product: p, message: "No sale recorded in the last 30 days." });
    }
    res.json(alerts);
  } catch { res.status(500).json({ message: "Unable to load alerts." }); }
});
module.exports = router;
