const express = require("express");
const router = express.Router();

const UserRoutes = require("./AuthRoutes/authRoutes");
const AdminRoutes = require("./AdminRoutes/adminRoutes");
const SubscriptionRoutes = require("./SubscriptionRoutes/subscriptionRoutes");
const PDFRoutes = require("./PDFRoutes/pdfRoutes");
const NotificationRoutes = require("./notificationRoutes");
const StudentTestRoutes = require("./TestRoutes/studentTestRoutes");
const TestManagementRoutes = require("./testManagementRoutes");
const ProfileRoutes = require("./profileRoutes");

router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/admin/test-management", TestManagementRoutes); // Admin test management APIs
router.use("/subscriptions", SubscriptionRoutes);
router.use("/pdfs", PDFRoutes);
router.use("/notifications", NotificationRoutes);
router.use("/profile", ProfileRoutes); // User profile management APIs
router.use("/", StudentTestRoutes); // Student-facing test APIs at root level

module.exports = router;
