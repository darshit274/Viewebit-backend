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
const TestResponseRoutes = require("./testResponseRoutes");
const DashboardRoutes = require("./dashboardRoutes");
const TestSeriesRoutes = require("./testSeriesRoutes");
const WebPDFRoutes = require("./webPDFRoutes");
const LeaderboardRoutes = require("./leaderboardRoutes");
const PaymentRoutes = require("./PaymentRoutes/paymentRoutes");
const { router: SubscriptionAccessRoutes } = require("./SubscriptionRoutes/subscriptionAccess");
const DebugRoutes = require("./debug");
const TestSimulationRoutes = require("./testSimulation");
const QuizSubmissionRoutes = require("./quizSubmissionRoutes");
const DebugLeaderboardRoutes = require("./debugLeaderboard");
const SampleDataRoutes = require("./sampleDataRoutes");

router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/admin/test-management", TestManagementRoutes); // Admin test management APIs (old system)
router.use("/admin/dynamic-test", DynamicTestManagementRoutes); // New dynamic hierarchy system
router.use("/subscriptions", SubscriptionRoutes);
router.use("/pdfs", PDFRoutes); // Original PDF APIs with /secure endpoint
// router.use("/pdfs", WebPDFRoutes); // Web app compatible PDF APIs (disabled in favor of original)
router.use("/notifications", NotificationRoutes);
router.use("/profile", ProfileRoutes); // User profile management APIs
router.use("/test-response", TestResponseRoutes); // Test response and leaderboard APIs
router.use("/dashboard", DashboardRoutes); // Dashboard stats and user summary APIs
router.use("/tests", TestSeriesRoutes); // Test series APIs (web app compatibility)
router.use("/leaderboard", LeaderboardRoutes); // Leaderboard APIs
router.use("/payments", PaymentRoutes); // Razorpay payment gateway APIs
router.use("/subscription-access", SubscriptionAccessRoutes); // Subscription access control APIs
router.use("/debug", DebugRoutes); // Debug APIs for checking database state
router.use("/test-simulation", TestSimulationRoutes); // Temporary test simulation APIs for testing
router.use("/quiz", QuizSubmissionRoutes); // Simple quiz submission APIs for frontend
router.use("/debug-leaderboard", DebugLeaderboardRoutes); // Debug leaderboard queries
router.use("/sample-data", SampleDataRoutes); // Temporary sample data creation routes
router.use("/", StudentDynamicTestRoutes); // NEW: Student-facing dynamic hierarchy APIs
router.use("/", StudentTestRoutes); // OLD: Student-facing test APIs (kept for backwards compatibility)

module.exports = router;
