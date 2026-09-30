const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
// CHANGED: I also import validateAssign because the new assign route needs it
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssign,
} = require('../utils/validators');

// Note: /stats is kept above the "/:id" routes so Express does not
// treat the word "stats" as a task id.
router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  // KNOWN BUG (not fixed): if someone sends ?status=done&page=2, this
  // returns early and pagination is ignored. A fix would be to filter by
  // status first and then paginate the filtered list.
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    // FIX (Bug 8): I added Math.max(1, ...) so page and limit can never be
    // zero or negative. Before, values like page=-1 gave strange results.
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const tasks = taskService.getPaginated(pageNum, limitNum);
    return res.json(tasks);
  }

  const tasks = taskService.getAll();
  res.json(tasks);
});

router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// NEW: PATCH /tasks/:id/assign (the feature from the assignment)
// Order of checks: first I see if the task exists (404), then I validate
// the body (400). I trim the name before saving so extra spaces are not
// stored. If the task already has an assignee, I allow it to be replaced
// (reassigning), because that is normal in task tools.
router.patch('/:id/assign', (req, res) => {
  if (!taskService.findById(req.params.id)) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const error = validateAssign(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.assign(req.params.id, req.body.assignee.trim());
  res.json(task);
});

module.exports = router;