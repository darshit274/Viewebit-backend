const express = require("express");
const router = express.Router();

const UserRoutes = require("./AuthRoutes/authRoutes");
const AdminRoutes = require("./AdminRoutes/adminRoutes");
const SubscriptionRoutes = require("./SubscriptionRoutes/subscriptionRoutes");
const PDFRoutes = require("./PDFRoutes/pdfRoutes");
const NotificationRoutes = require("./notificationRoutes");
const StudentTestRoutes = require("./TestRoutes/studentTestRoutes");
const StudentDynamicTestRoutes = require("./TestRoutes/studentDynamicTestRoutes");
const TestManagementRoutes = require("./testManagementRoutes");
const DynamicTestManagementRoutes = require("./dynamicTestManagementRoutes");
const ProfileRoutes = require("./profileRoutes");

router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/admin/test-management", TestManagementRoutes); // Admin test management APIs (old system)
router.use("/admin/dynamic-test", DynamicTestManagementRoutes); // New dynamic hierarchy system
router.use("/subscriptions", SubscriptionRoutes);
router.use("/pdfs", PDFRoutes);
router.use("/notifications", NotificationRoutes);
router.use("/profile", ProfileRoutes); // User profile management APIs
router.use("/", StudentDynamicTestRoutes); // NEW: Student-facing dynamic hierarchy APIs
router.use("/", StudentTestRoutes); // OLD: Student-facing test APIs (kept for backwards compatibility)

module.exports = router;
