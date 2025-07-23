const express = require("express");
const router = express.Router();

const UserRoutes = require("./AuthRoutes/authRoutes");
const AdminRoutes = require("./AdminRoutes/adminRoutes");
const SubscriptionRoutes = require("./SubscriptionRoutes/subscriptionRoutes");
// const PDFRoutes = require("./PDFRoutes/pdfRoutes"); // Commented out due to route handler error

router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/subscriptions", SubscriptionRoutes);
// router.use("/pdfs", PDFRoutes); // Temporarily disabled

module.exports = router;
