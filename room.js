function createRoom(rooms, roomId, player) {
  if (rooms[roomId]) throw new Error("Room already exists");

  rooms[roomId] = {
    host: player.name,
    players: [{ name: player.name, level: player.level }],
    state: "Lobby",
    maxCapacity: 10,
  };

  return rooms;
}

function joinRoom(rooms, roomId, player) {
  const room = rooms[roomId];

  if (room.players.some((p) => p.name === player.name)) {
    return { error: "Player name already exists in this room" };
  }

  if (room.players.length >= room.maxCapacity) {
    return { error: "Room is full" };
  }

  room.players.push({ name: player.name, level: player.level });
  return { success: true };
}

function removePlayerByName(rooms, roomId, playerName) {
  console.log(`1 player ${playerName} from room ${roomId}`, rooms[roomId]);
  const room = rooms[roomId];

  room.players = room.players.filter((p) => p.name !== playerName);

  if (room.players.length === 0) {
    console.log(`Room ${roomId} deleted due to no remaining players.`);
  } else {
    console.log(`2 player ${playerName} from room ${roomId}`, rooms[roomId]);
  }
  return rooms;
}

module.exports = { createRoom, joinRoom, removePlayerByName };
