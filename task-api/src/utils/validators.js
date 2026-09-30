const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// KNOWN BUG (not fixed): the checks below use "body.status && ..." so an
// empty string like status: "" is treated as "not provided" and skips
// validation. The same happens with priority and dueDate. A fix would be
// to check "body.status !== undefined" instead of relying on truthiness.
const validateCreateTask = (body) => {
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

// Same known bug as above applies here (empty string skips the checks).
const validateUpdateTask = (body) => {
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

// NEW: validation for the assign endpoint.
// assignee must be a real string, not empty or only spaces, and max 100
// characters so someone can't send a huge value. The "!body" check makes
// sure the code does not crash if no body is sent at all.
const validateAssign = (body) => {
  if (!body || typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee is required and must be a non-empty string';
  }
  if (body.assignee.trim().length > 100) {
    return 'assignee must be at most 100 characters';
  }
  return null;
};

// CHANGED: validateAssign is now exported so the route can use it
module.exports = { validateCreateTask, validateUpdateTask, validateAssign };