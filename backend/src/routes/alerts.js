const express = require("express");

const { authenticate, allowRoles } = require("../middleware/auth");
const {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listEvents
} = require("../controllers/alertsController");

const router = express.Router();

router.get("/rules", authenticate, allowRoles("admin"), listRules);
router.post("/rules", authenticate, allowRoles("admin"), createRule);
router.patch("/rules/:id", authenticate, allowRoles("admin"), updateRule);
router.delete("/rules/:id", authenticate, allowRoles("admin"), deleteRule);

router.get("/events", authenticate, allowRoles("admin"), listEvents);

module.exports = router;

