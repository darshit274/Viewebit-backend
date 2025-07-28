const express = require("express");
const router = express.Router();

const UserRoutes = require("./AuthRoutes/authRoutes");
const AdminRoutes = require("./AdminRoutes/adminRoutes");
const SubscriptionRoutes = require("./SubscriptionRoutes/subscriptionRoutes");
const PDFRoutes = require("./PDFRoutes/pdfRoutes");
const FreeTestRoutes = require("./FreeTestRoutes/freeTestRoutes");
const TestSeriesRoutes = require("./TestSeriesRoutes/testSeriesRoutes");
const QuizRoutes = require("./QuizRoutes/quizRoutes");
const NotificationRoutes = require("./notificationRoutes");

router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/subscriptions", SubscriptionRoutes);
router.use("/pdfs", PDFRoutes);
router.use("/free-tests", FreeTestRoutes);
router.use("/test-series", TestSeriesRoutes);
router.use("/quiz", QuizRoutes);
router.use("/notifications", NotificationRoutes);

module.exports = router;
