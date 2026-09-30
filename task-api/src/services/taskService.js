const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

// FIX (Bug 2): I changed includes() to ===. Before, searching "do" also
// matched "todo" and "done" because includes() checks part of the text.
// Now only an exact status match is returned.
const getByStatus = (status) => tasks.filter((t) => t.status === status);

// FIX (Bug 1): Pages start from 1, but the old code did page * limit,
// so page 1 skipped the first set of tasks. I changed it to (page - 1) * limit.
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    // Overdue only counts tasks that are not done and have a past due date
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    assignee: null, // NEW: added for the assign feature, empty until someone is assigned
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

// KNOWN BUG (not fixed): {...fields} copies everything from the request body,
// so a client can overwrite id, createdAt and completedAt through PUT.
// Also, setting status to "done" here does not set completedAt, but
// completeTask() does, so the two paths behave differently.
// A fix would be to only allow specific fields (title, description, status,
// priority, dueDate) and set completedAt when the status becomes "done".
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    // FIX (Bug 3): I removed "priority: 'medium'" from here. It was quietly
    // resetting the priority every time a task was completed, which is wrong.
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

// NEW: assign feature. Finds the task and saves the assignee name on it.
// Returns null if the task doesn't exist so the route can send a 404.
// If the task already has an assignee, I let it be overwritten (reassigning).
const assign = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], assignee };
  tasks[index] = updated;
  return updated;
};

// Only used by the tests, to start each test with an empty list
const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assign, // NEW: exported so the route and tests can use it
  _reset,
};