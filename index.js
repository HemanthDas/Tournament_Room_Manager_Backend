const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { createRoom, joinRoom, removePlayer } = require("./room");
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

    socket.on("create-room", ({ roomId, player }) => {
        rooms = createRoom(rooms, roomId, player, socket.id);
        socket.join(roomId);
        io.to(roomId).emit("room-update", rooms[roomId]);
    });

    socket.on("join-room", ({ roomId, player }) => {
        if (!rooms[roomId]) {
            socket.emit("join-error", "Room does not exist");
            return;
        }
        const result = joinRoom(rooms, roomId, player, socket.id);
        if (result.error) {
            socket.emit("join-error", result.error);
        } else {
            socket.join(roomId);
            io.to(roomId).emit("room-update", rooms[roomId]);
        }
    });

    socket.on("remove-player", ({ roomId, playerId }) => {
        if (!rooms[roomId]) {
            socket.emit("remove-error", "Room does not exist");
            return;
        }
        rooms = removePlayer(rooms, roomId, playerId);
        if (rooms[roomId].players.length === 0) {
            delete rooms[roomId];
        } else {
            io.to(roomId).emit("room-update", rooms[roomId]);
        }
    });

    socket.on("start-game", (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].state = "Game Started";
            io.to(roomId).emit("game-started");
        } else {
            socket.emit("start-error", "Room does not exist");
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in rooms) {
            rooms = removePlayer(rooms, roomId, socket.id);
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            } else {
                io.to(roomId).emit("room-update", rooms[roomId]);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
