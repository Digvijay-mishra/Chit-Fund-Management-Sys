import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { connectDB } from './config/db.js';
import { startDailyCron } from './cron/daily.cron.js';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    startDailyCron();
    app.listen(PORT, () => console.log(`API running on ${PORT}`));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
