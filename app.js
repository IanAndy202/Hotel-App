const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const hbs = require('hbs');
const db = require('./db'); // Your module for JSON file operations

const app = express();
const PORT = process.env.PORT || 3000;

// Set up hbs as the templating engine
app.set('view engine', 'hbs');
// Set views directory to "views"
app.set('views', path.join(__dirname, 'views'));

// Parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure express-session
app.use(session({
  secret: process.env.SECRET_KEY || '345',
  resave: false,
  saveUninitialized: false
}));

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Helper middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// --- Utility function to render with layout ---
function renderWithLayout(res, layoutFile, contentFile, data) {
  // Read and compile the content template
  const contentPath = path.join(__dirname, 'views', 'layouts', contentFile);
  const layoutPath = path.join(__dirname, 'views', 'layouts', layoutFile);
  
  const contentTemplate = hbs.handlebars.compile(fs.readFileSync(contentPath, 'utf8'));
  const layoutTemplate = hbs.handlebars.compile(fs.readFileSync(layoutPath, 'utf8'));
  
  // Generate content HTML
  const contentHtml = contentTemplate(data);
  // Inject content into the layout using the {{{body}}} placeholder
  const fullHtml = layoutTemplate({ title: data.title, body: contentHtml });
  
  res.send(fullHtml);
}

// =========================
// LANDING PAGE (no layout required)
// =========================
app.get('/', (req, res) => {
  // Render landingPage.hbs from the "views" folder directly
  res.render('landingPage', { title: 'Welcome to Sifuna Hotel' });
});

// =========================
// LOGIN
// =========================
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await db.getUsers(); // Reads users.json
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      req.session.userId = user.userId;
      req.session.role = user.role;

      // Redirect based on user role
      if (user.role === 'Receptionist') {
        return res.redirect('/dashboard');
      } else if (user.role === 'Housekeeping') {
        return res.redirect('/cleaning-requests');
      } else {
        return res.redirect('/');
      }
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Internal server error');
  }
});

// =========================
// LOGOUT
// =========================
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

// =========================
// RECEPTIONIST DASHBOARD (Room Status)
// =========================
app.get('/dashboard', isAuthenticated, async (req, res) => {
  if (req.session.role !== 'Receptionist') {
    return res.redirect('/login');
  }

  try {
    const rooms = await db.getRooms(); // Reads rooms.json
    // Render statusRooms.hbs within layout.hbs
    renderWithLayout(res, 'layout.hbs', 'statusRooms.hbs', { title: 'Reception Dashboard', rooms });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// =========================
// CHECK-IN (GET and POST)
// =========================
app.get('/checkin', isAuthenticated, async (req, res) => {
  if (req.session.role !== 'Receptionist') {
    return res.redirect('/login');
  }

  try {
    const rooms = await db.getRooms();
    const availableRooms = rooms.filter(r => r.status === 'vacant' || r.status === 'ready');
    // Render check-in.hbs within layout.hbs
    renderWithLayout(res, 'layout.hbs', 'check-in.hbs', { title: 'Check-In Guests', availableRooms });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/checkin', isAuthenticated, async (req, res) => {
  if (req.session.role !== 'Receptionist') {
    return res.redirect('/login');
  }

  const { guestName, contact, room } = req.body;
  try {
    await db.checkInGuest({ guestName, contact, roomId: room });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Check-In failed');
  }
});

// =========================
// CLEANING REQUESTS (GET, POST, and complete)
// =========================
app.get('/cleaning-requests', isAuthenticated, async (req, res) => {
  try {
    const rooms = await db.getRooms();
    const roomsForCleaning = rooms;
    const cleaningTasks = await db.getCleaningTasks();
    // Render cleaning.hbs within layout.hbs
    renderWithLayout(res, 'layout.hbs', 'cleaningRequests.hbs', { title: 'Cleaning Requests', roomsForCleaning, cleaningTasks });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/cleaning-requests', isAuthenticated, async (req, res) => {
  const { room } = req.body;
  try {
    await db.addCleaningTask({
      roomId: room,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });
    res.redirect('/cleaning-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating cleaning request');
  }
});

app.post('/cleaning-requests/:taskId/complete', isAuthenticated, async (req, res) => {
  const taskId = req.params.taskId;
  try {
    await db.completeCleaningTask(taskId);
    res.redirect('/cleaning-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating cleaning task');
  }
});

// =========================
// START THE SERVER
// =========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
