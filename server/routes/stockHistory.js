const router = require("express").Router();
const StockMovement = require("../models/StockMovement");
const authMiddleware = require("../middleware/authMiddleware");
router.use(authMiddleware);
router.get("/", async (req, res) => {
  try {
    const filter = { owner: req.user.id };
    if (req.query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) return res.status(400).json({ message: "Date must use YYYY-MM-DD format." });
      const start = new Date(`${req.query.date}T00:00:00.000`); const end = new Date(start); end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    const movements = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(3000);
    res.json(movements);
  } catch { res.status(500).json({ message: "Unable to load stock history." }); }
});
module.exports = router;
