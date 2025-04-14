const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an express app
const app = express();
const server = http.createServer(app);

// Setup Socket.io on the server
const io = socketIo(server);

// Serve a basic response for GET requests to the root
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Handle video chat signaling
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer); // Broadcast offer to other user
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer); // Broadcast answer to other user
  });

  socket.on('candidate', (candidate) => {
    socket.broadcast.emit('candidate', candidate); // Broadcast ICE candidate to other user
  });
});

// Set up server to listen on port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
