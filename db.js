const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// Helper: Get the full path to a JSON file
function getDataFilePath(filename) {
  return path.join(dataDir, filename);
}

// Read JSON from a file
async function readJSON(filename) {
  const filePath = getDataFilePath(filename);
  const data = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

// Write JSON to a file
async function writeJSON(filename, data) {
  const filePath = getDataFilePath(filename);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
}

// GET and SAVE functions for users, rooms, guests, and cleaning tasks:
async function getUsers() {
  return (await readJSON('users.json')).users;
}
async function saveUsers(users) {
  await writeJSON('users.json', { users });
}

async function getRooms() {
  return (await readJSON('rooms.json')).rooms;
}
async function saveRooms(rooms) {
  await writeJSON('rooms.json', { rooms });
}

async function getGuests() {
  return (await readJSON('guests.json')).guests;
}
async function saveGuests(guests) {
  await writeJSON('guests.json', { guests });
}

async function getCleaningTasks() {
  return (await readJSON('cleaningTasks.json')).cleaningTasks;
}
async function saveCleaningTasks(cleaningTasks) {
  await writeJSON('cleaningTasks.json', { cleaningTasks });
}

// -------------------------------
// New functions to add:

// 1. checkInGuest: add a guest and update the room status
async function checkInGuest({ guestName, contact, roomId }) {
  // Add new guest
  const guestsData = await readJSON('guests.json');
  const guests = guestsData.guests || [];
  const newGuest = {
    guestId: Date.now().toString(), // Simple unique id based on timestamp
    name: guestName,
    contact,
    roomId
  };
  guests.push(newGuest);
  await writeJSON('guests.json', { guests });

  // Update room status to 'occupied' and assign guest info
  const roomsData = await readJSON('rooms.json');
  const rooms = roomsData.rooms || [];
  const room = rooms.find(r => r.roomId === roomId);
  if (room) {
    room.status = 'occupied';
    room.assignedGuest = { name: guestName };
  }
  await writeJSON('rooms.json', { rooms });
}

// 2. addCleaningTask: add a new cleaning task with a formatted date
async function addCleaningTask(task) {
  const tasksData = await readJSON('cleaningTasks.json');
  const cleaningTasks = tasksData.cleaningTasks || [];
  
  // Format the provided requestedAt date (or use current date)
  const dateToFormat = task.requestedAt ? new Date(task.requestedAt) : new Date();
  const formattedDate = dateToFormat.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const newTask = {
    taskId: Date.now().toString(), // Unique id
    ...task,
    requestedAt: formattedDate  // Use the formatted date here
  };
  cleaningTasks.push(newTask);
  await writeJSON('cleaningTasks.json', { cleaningTasks });
}

// 3. completeCleaningTask: mark a cleaning task as completed
async function completeCleaningTask(taskId) {
  const tasksData = await readJSON('cleaningTasks.json');
  const cleaningTasks = tasksData.cleaningTasks || [];
  const task = cleaningTasks.find(t => t.taskId === taskId);
  if (task) {
    task.status = 'completed';
  }
  await writeJSON('cleaningTasks.json', { cleaningTasks });
}

// -------------------------------
// Export all functions

module.exports = {
  // Users
  getUsers,
  saveUsers,
  // Rooms
  getRooms,
  saveRooms,
  // Guests
  getGuests,
  saveGuests,
  // Cleaning Tasks
  getCleaningTasks,
  saveCleaningTasks,
  // New functions:
  checkInGuest,
  addCleaningTask,
  completeCleaningTask
};
