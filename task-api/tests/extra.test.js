const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());
afterEach(() => jest.restoreAllMocks());
const make = (over = {}) => taskService.create({ title: 'Task', ...over });

describe('error handler', () => {
  test('malformed JSON returns 400, not 500', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{ "title": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  test('unexpected server error returns 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(taskService, 'getAll').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('PUT validation', () => {
  test.each([
    [{ status: 'bogus' }],
    [{ priority: 'urgent' }],
    [{ dueDate: 'not-a-date' }],
  ])('rejects %j with 400', async (body) => {
    const t = make();
    const res = await request(app).put(`/tasks/${t.id}`).send(body);
    expect(res.status).toBe(400);
  });
});

describe('pagination with only one parameter', () => {
  test('only ?limit works and defaults page to 1', async () => {
    for (let i = 0; i < 5; i++) make();
    const res = await request(app).get('/tasks?limit=2');
    expect(res.body).toHaveLength(2);
  });

  test('only ?page works and defaults limit to 10', async () => {
    for (let i = 0; i < 12; i++) make();
    const res = await request(app).get('/tasks?page=2');
    expect(res.body).toHaveLength(2);
  });
});

describe('getStats with an unknown status', () => {
  test('does not crash or count a status it does not know', () => {
    const t = make();
    taskService.update(t.id, { status: 'weird' });
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});

describe('GET /health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});