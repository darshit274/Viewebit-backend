const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const router = require('./routes/index');
const { sequelize } = require('./models'); // Assuming your sequelize export is CommonJS
const errorMiddleware = require('./utils/default/globalErrorHandler')
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

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    // console.error('❌ DB Connection error:', error);
  }
}

startServer();
module.exports = app;