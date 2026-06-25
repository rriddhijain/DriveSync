const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const FleetSimulator = require('./fleetSimulator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Ensure frontend can connect
});

const registerSocketEvents = require('./socketEvents');
registerSocketEvents(io); 

// Start the Fleet Sensor Engine
new FleetSimulator(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});