// index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend for now
    methods: ["GET", "POST"]
  }
});

let availableUsers = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  availableUsers.push(socket);

  // Try to pair users
  if (availableUsers.length >= 2) {
    const user1 = availableUsers.shift();
    const user2 = availableUsers.shift();

    const roomID = `${user1.id}-${user2.id}`;

    user1.join(roomID);
    user2.join(roomID);

    user1.emit('match-found', { room: roomID, partner: user2.id });
    user2.emit('match-found', { room: roomID, partner: user1.id });
  }

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    availableUsers = availableUsers.filter(s => s.id !== socket.id);
  });
});

server.listen(5000, () => {
  console.log('Server running on port 5000');
});
