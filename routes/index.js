const express = require("express");
const router = express.Router();

const UserRoutes = require("./AuthRoutes/authRoutes");
const AdminRoutes = require("./AdminRoutes/adminRoutes");
const SubscriptionRoutes = require("./SubscriptionRoutes/subscriptionRoutes");
const PDFRoutes = require("./PDFRoutes/pdfRoutes");
const TestRoutes = require("./TestRoutes/testRoutes");
const NotificationRoutes = require("./notificationRoutes");

router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/subscriptions", SubscriptionRoutes);
router.use("/pdfs", PDFRoutes);
router.use("/tests", TestRoutes);
router.use("/notifications", NotificationRoutes);

module.exports = router;
