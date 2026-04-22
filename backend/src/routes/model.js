const express = require("express");

const { authenticate, allowRoles } = require("../middleware/auth");
const { getModelStatus, trainModel, updateModel } = require("../controllers/modelController");

const router = express.Router();

router.get("/status", authenticate, allowRoles("admin"), getModelStatus);
router.post("/train", authenticate, allowRoles("admin"), trainModel);
router.post("/update", authenticate, allowRoles("admin"), updateModel);

module.exports = router;

