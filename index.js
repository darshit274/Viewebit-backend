const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const router = require('./routes/index');
const serverless = require("serverless-http");

const { sequelize } = require('./models'); // Assuming your sequelize export is CommonJS
const errorMiddleware = require('./utils/default/globalErrorHandler');
const { initializeFirebase } = require('./config/firebase');
const NotificationScheduler = require('./services/NotificationScheduler');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/', (req, res) => {
  res.send('🚀 API is running...');
});
app.use(errorMiddleware);
sequelize.authenticate().then(() => {
  console.log('✅ Database connected.');
}).catch((error) => {
  console.error('❌ DB Connection error:', error);
});

async function startServer() {
  try {
    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Initialize Notification Scheduler
    NotificationScheduler.initialize();

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`🔔 Notification system initialized with automated triggers`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
  }
}

startServer();
module.exports = app;
module.exports.handler = serverless(app);
