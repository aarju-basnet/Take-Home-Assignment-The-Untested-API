const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());
const make = (over = {}) => taskService.create({ title: 'Task', ...over });

describe('POST /tasks', () => {
  test('creates a task', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Write tests', priority: 'high', status: 'todo' });
  });

  test.each([
    [{}, 'missing title'],
    [{ title: '   ' }, 'blank title'],
    [{ title: 'a', status: 'bogus' }, 'bad status'],
    [{ title: 'a', priority: 'urgent' }, 'bad priority'],
    [{ title: 'a', dueDate: 'not-a-date' }, 'bad dueDate'],
  ])('rejects %j (%s)', async (body) => {
    const res = await request(app).post('/tasks').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /tasks', () => {
  test('lists all tasks', async () => {
    make(); make();
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by exact status', async () => {
    make({ status: 'todo' }); make({ status: 'done' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('done');
    expect((await request(app).get('/tasks?status=do')).body).toHaveLength(0);
  });

  test('paginates starting at page 1', async () => {
    for (let i = 1; i <= 12; i++) make({ title: `t${i}` });
    const p1 = await request(app).get('/tasks?page=1&limit=5');
    expect(p1.body.map((t) => t.title)).toEqual(['t1', 't2', 't3', 't4', 't5']);
    const p3 = await request(app).get('/tasks?page=3&limit=5');
    expect(p3.body).toHaveLength(2);
  });

  test('invalid page/limit fall back to safe values', async () => {
    for (let i = 0; i < 12; i++) make();
    const res = await request(app).get('/tasks?page=-1&limit=abc');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts and overdue', async () => {
    make(); make({ status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body).toEqual({ todo: 1, in_progress: 0, done: 1, overdue: 0 });
  });
});

describe('PUT /tasks/:id', () => {
  test('updates a task', async () => {
    const t = make();
    const res = await request(app).put(`/tasks/${t.id}`).send({ title: 'Updated', status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Updated', status: 'in_progress' });
  });
  test('400 on invalid body', async () => {
    const t = make();
    expect((await request(app).put(`/tasks/${t.id}`).send({ title: '' })).status).toBe(400);
  });
  test('404 for unknown id', async () => {
    expect((await request(app).put('/tasks/nope').send({ title: 'x' })).status).toBe(404);
  });
});

describe('DELETE /tasks/:id', () => {
  test('204 then 404', async () => {
    const t = make();
    expect((await request(app).delete(`/tasks/${t.id}`)).status).toBe(204);
    expect((await request(app).delete(`/tasks/${t.id}`)).status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks done and keeps priority', async () => {
    const t = make({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'done', priority: 'high' });
    expect(res.body.completedAt).not.toBeNull();
  });
  test('404 for unknown id', async () => {
    expect((await request(app).patch('/tasks/nope/complete')).status).toBe(404);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a user (trimmed)', async () => {
    const t = make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '  Asha ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Asha');
  });
  test('allows reassigning', async () => {
    const t = make();
    await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Asha' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Ravi' });
    expect(res.body.assignee).toBe('Ravi');
  });
  test.each([[{}], [{ assignee: '' }], [{ assignee: '   ' }], [{ assignee: 42 }], [{ assignee: 'x'.repeat(101) }]])(
    '400 for invalid body %j', async (body) => {
      const t = make();
      expect((await request(app).patch(`/tasks/${t.id}/assign`).send(body)).status).toBe(400);
    });
  test('404 for unknown id', async () => {
    expect((await request(app).patch('/tasks/nope/assign').send({ assignee: 'Asha' })).status).toBe(404);
  });
});