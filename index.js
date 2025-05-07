// index.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5174' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });
    res.status(201).json({ message: 'User created', user: { id: user.id, email, name } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Email already exists or invalid data' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email, name: user.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.userId,
      },
    });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Read all projects for the user
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.userId },
          { members: { some: { id: req.user.userId } } },
        ],
      },
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Read single project
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: { rows: { include: { workItems: true } } },
    });
    if (!project || (project.ownerId !== req.user.userId && !project.members.some(m => m.id === req.user.userId))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const project = await prisma.project.update({
      where: { id: parseInt(id), ownerId: req.user.userId },
      data: { name, description },
    });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Project not found or unauthorized' });
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.project.delete({
      where: { id: parseInt(id), ownerId: req.user.userId },
    });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Project not found or unauthorized' });
  }
});

// Create row
app.post('/api/projects/:projectId/rows', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;
  try {
    const project = await prisma.project.findUnique({ where: { id: parseInt(projectId), ownerId: req.user.userId } });
    if (!project) return res.status(403).json({ error: 'Unauthorized' });
    const row = await prisma.row.create({
      data: { name, projectId: parseInt(projectId) },
    });
    res.status(201).json(row);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

// Create work item
app.post('/api/rows/:rowId/work-items', authenticateToken, async (req, res) => {
  const { rowId } = req.params;
  const { title, description } = req.body;
  try {
    const row = await prisma.row.findUnique({
      where: { id: parseInt(rowId) },
      include: { project: true },
    });
    if (!row || row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const workItem = await prisma.workItem.create({
      data: { title, description, rowId: parseInt(rowId) },
    });
    res.status(201).json(workItem);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.delete('/api/work-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const workItem = await prisma.workItem.findUnique({
      where: { id: parseInt(id) },
      include: { row: { include: { project: true } } },
    });
    if (!workItem || workItem.row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete associated comments
    await prisma.comment.deleteMany({
      where: { workItemId: parseInt(id) },
    });

    // Delete associated files
    await prisma.file.deleteMany({
      where: { workItemId: parseInt(id) },
    });

    // Delete the work item
    await prisma.workItem.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Work item and associated data deleted' });
  } catch (error) {
    console.error('Error deleting work item:', error);
    res.status(400).json({ error: 'Work item not found or server error' });
  }
});

app.delete('/api/rows/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const row = await prisma.row.findUnique({
      where: { id: parseInt(id) },
      include: { project: true },
    });
    if (!row || row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await prisma.row.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Row deleted' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Row not found' });
  }
});

app.put('/api/rows/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const row = await prisma.row.findUnique({
      where: { id: parseInt(id) },
      include: { project: true },
    });
    if (!row || row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updatedRow = await prisma.row.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.json(updatedRow);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Row not found or invalid data' });
  }
});

// Update in index.js
app.put('/api/work-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, rowId } = req.body; // Include rowId from request body
  try {
    console.log(`Updating work item ${id} with title: ${title}, description: ${description}, rowId: ${rowId}`);
    const workItem = await prisma.workItem.findUnique({
      where: { id: parseInt(id) },
      include: { row: { include: { project: true } } },
    });
    if (!workItem || workItem.row.project.ownerId !== req.user.userId) {
      console.error('Unauthorized or work item not found:', { id, userId: req.user.userId });
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.workItem.update({
      where: { id: parseInt(id) },
      data: { 
        title, 
        description, 
        rowId: rowId ? parseInt(rowId) : workItem.rowId // Update rowId if provided
      },
    });
    console.log('Updated work item:', updated);
    res.json(updated);
  } catch (error) {
    console.error('Error updating work item:', error);
    res.status(400).json({ error: 'Work item not found or invalid data' });
  }
});

// Upload file to work item
app.post('/api/work-items/:id/files', authenticateToken, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  try {
    const workItem = await prisma.workItem.findUnique({
      where: { id: parseInt(id) },
      include: { row: { include: { project: true } } },
    });
    if (!workItem || workItem.row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        workItemId: parseInt(id),
      },
    });
    res.status(201).json(file);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to upload file' });
  }
});

// Create comment on work item
app.post('/api/work-items/:id/comments', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const workItem = await prisma.workItem.findUnique({
      where: { id: parseInt(id) },
      include: { row: { include: { project: true } } },
    });
    if (!workItem || workItem.row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.user.userId,
        workItemId: parseInt(id),
      },
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.get('/api/rows/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const row = await prisma.row.findUnique({
      where: { id: parseInt(id) },
      include: { project: true },
    });
    if (!row || row.project.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized or row not found' });
    }
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get work item details
app.get('/api/work-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const workItem = await prisma.workItem.findUnique({
      where: { id: parseInt(id) },
      include: { files: true, comments: { include: { user: true } } },
    });
    if (!workItem) return res.status(404).json({ error: 'Work item not found' });
    res.json(workItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (req, res) => res.send('Obsidian Backend Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));