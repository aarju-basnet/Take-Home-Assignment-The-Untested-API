const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());

// NEW: root route so opening the base URL returns a response instead of
// Express's default "Cannot GET /". It only returns a simple message.
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Task API is running' });
});

// NEW: health check route. It only returns a simple "ok" so a hosting
// service (like Render) or I can quickly check that the server is running.
// It does not touch any task data.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/tasks', taskRoutes);

// FIX (Bug 6): Before, every error returned 500, even when the client sent
// broken JSON. Now I use the error's own status (express.json() gives 400
// for bad JSON) and only fall back to 500 for real server errors.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err.stack);
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : 'Invalid request body',
  });
});

// process.env.PORT lets a hosting service (like Render) choose the port
// when I deploy. Locally it falls back to 3000.
const PORT = process.env.PORT || 3000;

// The server only starts when this file is run directly (npm start).
// I exclude it from coverage because the tests import "app" and never
// start a real server, so this block is not meant to run under Jest.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

module.exports = app;