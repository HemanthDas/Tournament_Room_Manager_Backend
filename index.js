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

  // Join room
  socket.on("join-room", ({ roomId, player }) => {
    console.log(
      `Join room request: roomId=${roomId}, player=${JSON.stringify(player)}`
    );
    try {
      if (!player.name) throw new Error("Player name is required");
      if (!rooms[roomId]) throw new Error("Room does not exist");

      const result = joinRoom(rooms, roomId, player);
      if (result.error) throw new Error(result.error);

      socket.join(roomId);
      io.to(roomId).emit("room-update", rooms[roomId]);
      console.log(`Player joined room: ${roomId}`, rooms[roomId]);
    } catch (error) {
      console.error(`Failed to join room: ${error.message}`);
      socket.to().emit("join-error", error.message);
    }
  });

  socket.on("remove-player", ({ roomId, name: playerName }, callback) => {
    console.log(
      `Remove player request: roomId=${roomId}, playerName=${playerName}`
    );
    try {
      if (!rooms[roomId]) throw new Error("Room does not exist");

      rooms = removePlayerByName(rooms, roomId, playerName);
      if (rooms[roomId] && rooms[roomId].players.length > 0) {
        io.to(roomId).emit("room-update", rooms[roomId]);
        console.log(`Player removed from room: ${roomId}`, rooms[roomId]);
      } else {
        delete rooms[roomId];
        console.log(`Room deleted: ${roomId}`);
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

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const playerToRemove = Object.values(rooms[roomId].players).find(
        (p) => p.socketId === socket.id
      );

      if (playerToRemove) {
        rooms = removePlayerByName(rooms, roomId, playerToRemove.name);
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
          console.log(`Room deleted due to disconnect: ${roomId}`);
        } else {
          io.to(roomId).emit("room-update", rooms[roomId]);
          console.log(
            `Player removed from room due to disconnect: ${roomId}`,
            rooms[roomId]
          );
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
