const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { createRoom, joinRoom, removePlayerByName } = require("./room");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.get("/", (req, res) => {
  res.send("Real-Time Tournament Room Manager is Running");
});

let rooms = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create room
  socket.on("create-room", ({ roomId, player }) => {
    console.log(
      `Create room request: roomId=${roomId}, player=${JSON.stringify(player)}`
    );
    try {
      if (!player.name) throw new Error("Player name is required");
      if (rooms[roomId]) throw new Error("Room already exists");

      rooms = createRoom(rooms, roomId, player);
      rooms[roomId].spectators = []; // Initialize spectators array
      socket.join(roomId);

      io.to(roomId).emit("room-update", rooms[roomId]);
      console.log(`Room created: ${roomId}`, rooms[roomId]);
    } catch (error) {
      console.error(`Failed to create room: ${error.message}`);
      socket.emit("create-error", error.message);
    }
  });

  // Check room existence
  socket.on("check-room", (roomId) => {
    const roomExists = !!rooms[roomId];
    console.log(`Check room: ${roomId}, exists: ${roomExists}`);
    socket.emit("room-exists", roomExists);
  });

  socket.on("join-room", ({ roomId, player }) => {
    console.log(
      `Join room request: roomId=${roomId}, player=${JSON.stringify(player)}`
    );
    try {
      if (!player.name) throw new Error("Player name is required");
      if (!rooms[roomId]) throw new Error("Room does not exist");
      console.log(`Player is spectator: ${player.isSpectator}`);
      if (player.isSpectator) {
        if (!rooms[roomId].spectators) rooms[roomId].spectators = [];
        rooms[roomId].spectators.push({
          name: player.name,
          socketId: socket.id,
        });
        console.log(`Spectator joined: ${player.name} in room: ${roomId}`);
      } else {
        const result = joinRoom(rooms, roomId, player);
        if (result.error) throw new Error(result.error);
        console.log(`Player joined: ${player.name} in room: ${roomId}`);
      }
      socket.join(roomId);
      io.to(roomId).emit("room-update", rooms[roomId]);
      return;
    } catch (error) {
      console.error(`Failed to join room: ${error.message}`);
      socket.emit("join-error", error.message);
    }
  });

  // Update room
  socket.on("update-room", (roomId) => {
    console.log(`Update room request: roomId=${roomId}`);
    if (rooms[roomId]) {
      io.to(roomId).emit("room-update", rooms[roomId]);
      console.log(`Room updated: ${roomId}`, rooms[roomId]);
    } else {
      socket.emit("update-error", "Room does not exist");
    }
  });

  // Remove player
  socket.on("remove-player", ({ roomId, name: playerName }, callback) => {
    console.log(
      `Remove player request: roomId=${roomId}, playerName=${playerName}`
    );
    try {
      if (!rooms[roomId]) throw new Error("Room does not exist");

      // Remove player or spectator
      rooms = removePlayerByName(rooms, roomId, playerName);
      rooms[roomId].spectators = rooms[roomId].spectators.filter(
        (spectator) => spectator.name !== playerName
      );

      if (
        rooms[roomId].players.length === 0 &&
        rooms[roomId].spectators.length === 0
      ) {
        delete rooms[roomId];
        console.log(`Room deleted: ${roomId}`);
      } else {
        io.to(roomId).emit("room-update", rooms[roomId]);
        console.log(`Player removed from room: ${roomId}`, rooms[roomId]);
      }
      callback(true);
    } catch (error) {
      console.error(`Failed to remove player: ${error.message}`);
      socket.emit("remove-error", error.message);
    }
  });

  // Start game
  socket.on("start-game", (roomId) => {
    console.log(`Start game request: roomId=${roomId}`);
    if (rooms[roomId]) {
      rooms[roomId].state = "Game Started";
      io.to(roomId).emit("game-started");
      console.log(`Game started in room: ${roomId}`);
    } else {
      socket.emit("start-error", "Room does not exist");
    }
  });

  // Spectator joins room
  socket.on("join-spectator-room", ({ roomId, player }) => {
    console.log(
      `Spectator joining room: roomId=${roomId}, player=${JSON.stringify(
        player
      )}`
    );
    if (!rooms[roomId]) {
      socket.emit("join-error", "Room does not exist");
      return;
    }

    // Add spectator to the room
    if (!rooms[roomId].spectators) rooms[roomId].spectators = [];
    rooms[roomId].spectators.push({ name: player.name, socketId: socket.id });

    socket.join(roomId);
    io.to(roomId).emit("spectator-joined", { roomId, player });
    console.log(`Spectator joined room: ${roomId}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const playerToRemove = rooms[roomId].players.find(
        (p) => p.socketId === socket.id
      );
      const spectatorToRemove = rooms[roomId].spectators.find(
        (s) => s.socketId === socket.id
      );

      if (playerToRemove) {
        rooms = removePlayerByName(rooms, roomId, playerToRemove.name);
      }
      if (spectatorToRemove) {
        rooms[roomId].spectators = rooms[roomId].spectators.filter(
          (s) => s.socketId !== socket.id
        );
      }

      if (
        rooms[roomId].players.length === 0 &&
        rooms[roomId].spectators.length === 0
      ) {
        delete rooms[roomId];
        console.log(`Room deleted due to disconnect: ${roomId}`);
      } else {
        io.to(roomId).emit("room-update", rooms[roomId]);
        console.log(`Room updated due to disconnect: ${roomId}`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
