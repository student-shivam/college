const express = require("express");
const multer = require("multer");

const { authenticate, allowRoles } = require("../middleware/auth");
const {
  uploadSensorData,
  listSensorData,
  deleteSensorData
} = require("../controllers/dataController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post("/upload", authenticate, allowRoles("admin"), upload.single("file"), uploadSensorData);
router.get("/", authenticate, allowRoles("admin"), listSensorData);
router.delete("/:id", authenticate, allowRoles("admin"), deleteSensorData);

module.exports = router;

