const express = require("express");

const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getMyServices
} = require("../controllers/serviceController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", getServices);
router.get("/mine", protect, authorizeRoles("provider", "admin"), getMyServices);
router.get("/:id", getServiceById);
router.post("/", protect, authorizeRoles("provider", "admin"), createService);
router.put("/:id", protect, authorizeRoles("provider", "admin"), updateService);
router.delete("/:id", protect, authorizeRoles("provider", "admin"), deleteService);

module.exports = router;
