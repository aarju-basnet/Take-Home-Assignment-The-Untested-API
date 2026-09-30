const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());
const make = (over = {}) => taskService.create({ title: 'Task', ...over });

describe('taskService', () => {
  test('create applies defaults', () => {
    const t = make();
    expect(t).toMatchObject({ status: 'todo', priority: 'medium', dueDate: null, completedAt: null, assignee: null });
    expect(t.id).toBeDefined();
  });

  test('getAll returns a copy, not the internal array', () => {
    make();
    taskService.getAll().pop();
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('getByStatus matches exactly, not by substring', () => {
    make({ status: 'todo' });
    make({ status: 'done' });
    expect(taskService.getByStatus('todo')).toHaveLength(1);
    expect(taskService.getByStatus('do')).toHaveLength(0);
  });

  test('getPaginated is 1-indexed', () => {
    for (let i = 1; i <= 15; i++) make({ title: `t${i}` });
    const p1 = taskService.getPaginated(1, 10);
    expect(p1).toHaveLength(10);
    expect(p1[0].title).toBe('t1');
    expect(taskService.getPaginated(2, 10)).toHaveLength(5);
    expect(taskService.getPaginated(3, 10)).toHaveLength(0);
  });

  test('getStats counts statuses and overdue (ignoring done tasks)', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    make({ dueDate: past });
    make({ status: 'done', dueDate: past });
    make({ status: 'in_progress', dueDate: future });
    expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('update merges fields, returns null for unknown id', () => {
    const t = make();
    expect(taskService.update(t.id, { title: 'New' }).title).toBe('New');
    expect(taskService.update('nope', { title: 'x' })).toBeNull();
  });

  test('remove deletes and reports result', () => {
    const t = make();
    expect(taskService.remove(t.id)).toBe(true);
    expect(taskService.remove(t.id)).toBe(false);
  });

  test('completeTask sets done + completedAt and keeps priority', () => {
    const t = make({ priority: 'high' });
    const done = taskService.completeTask(t.id);
    expect(done.status).toBe('done');
    expect(done.completedAt).not.toBeNull();
    expect(done.priority).toBe('high');
    expect(taskService.completeTask('nope')).toBeNull();
  });

  test('assign sets assignee, returns null for unknown id', () => {
    const t = make();
    expect(taskService.assign(t.id, 'Asha').assignee).toBe('Asha');
    expect(taskService.assign('nope', 'Asha')).toBeNull();
  });
});