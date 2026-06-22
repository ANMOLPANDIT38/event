require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const FORECAST_URL = process.env.FORECAST_URL || 'http://localhost:8000';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gridlock-backend' });
});

app.post('/api/train', async (req, res) => {
  try {
    const response = await axios.post(`${FORECAST_URL}/train`);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const detail = err.response?.data || { error: 'Training failed', detail: err.message };
    res.status(status).json(detail);
  }
});

app.post('/api/forecast', async (req, res) => {
  const { event_type, duration_minutes, priority } = req.body || {};

  if (!event_type || typeof event_type !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid field: event_type (string)' });
  }
  if (duration_minutes == null || typeof duration_minutes !== 'number' || duration_minutes <= 0) {
    return res.status(400).json({ error: 'Missing or invalid field: duration_minutes (positive number)' });
  }
  if (priority == null || typeof priority !== 'number' || priority < 1 || priority > 3) {
    return res.status(400).json({ error: 'Missing or invalid field: priority (1, 2, or 3)' });
  }

  try {
    const response = await axios.post(`${FORECAST_URL}/forecast`, {
      event_type,
      duration_minutes,
      priority,
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const detail = err.response?.data || { error: 'Forecasting service unavailable', detail: err.message };
    res.status(status).json(detail);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
