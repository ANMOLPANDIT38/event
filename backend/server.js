require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 3000;
const FORECAST_URL = process.env.FORECAST_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gridlock-backend'
  });
});

app.post('/api/train', async (req, res) => {
  try {
    console.log('Training URL =', `${FORECAST_URL}/train`);

    const response = await axios.post(`${FORECAST_URL}/train`, {}, { timeout: 60000 });
    res.json(response.data);
  } catch (err) {
    console.error('TRAIN ERROR =', err.response?.data || err.message);

    const status = err.response?.status || 502;
    const detail =
      err.response?.data || {
        error: 'Training failed',
        detail: err.message
      };

    res.status(status).json(detail);
  }
});

app.post('/api/forecast', async (req, res) => {
  let {
    event_type,
    duration_minutes,
    priority
  } = req.body || {};

  if (!event_type || typeof event_type !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid field: event_type (string)'
    });
  }

  duration_minutes = Number(duration_minutes);
  priority = Number(priority);

  if (isNaN(duration_minutes) || duration_minutes <= 0) {
    return res.status(400).json({
      error: 'Missing or invalid field: duration_minutes (positive number)'
    });
  }

  if (isNaN(priority) || priority < 1 || priority > 3) {
    return res.status(400).json({
      error: 'Missing or invalid field: priority (1, 2, or 3)'
    });
  }

  // Normalize event_type to match Python backend format
  const normalizedEventType = event_type
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  try {
    console.log('FORECAST_URL =', FORECAST_URL);
    console.log('Calling =', `${FORECAST_URL}/forecast`);
    console.log('Request Body =', {
      event_type: normalizedEventType,
      duration_minutes,
      priority
    });

    const response = await axios.post(
      `${FORECAST_URL}/forecast`,
      {
        event_type: normalizedEventType,
        duration_minutes,
        priority
      },
      { timeout: 15000 }
    );

    console.log('SUCCESS =', response.data);
    res.json(response.data);
  } catch (err) {
    console.error('STATUS =', err.response?.status);
    console.error('DATA =', err.response?.data);
    console.error('MESSAGE =', err.message);

    const status = err.response?.status || 502;
    const detail =
      err.response?.data || {
        error: 'Forecasting service unavailable',
        detail: err.message
      };

    res.status(status).json(detail);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});