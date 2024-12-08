function createRoom(rooms, roomId, player, socketId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      host: socketId,
      players: [{ id: socketId, ...player }],
      spectators: [],
      state: "Lobby",
      maxCapacity: 10,
    };
  }
  return rooms;
}

function joinRoom(rooms, roomId, player, socketId) {
  if (!rooms[roomId]) {
    return { error: "Room does not exist" };
  }

  if (rooms[roomId].players.length >= rooms[roomId].maxCapacity) {
    rooms[roomId].spectators.push({ id: socketId, ...player });
    return { message: "Joined as spectator" };
  }

  rooms[roomId].players.push({ id: socketId, ...player });
  return { success: true };
}

function removePlayer(rooms, roomId, playerId) {
  if (rooms[roomId]) {
    rooms[roomId].players = rooms[roomId].players.filter(
      (player) => player.id !== playerId
    );
    rooms[roomId].spectators = rooms[roomId].spectators.filter(
      (player) => player.id !== playerId
    );
  }
  return rooms;
}

module.exports = { createRoom, joinRoom, removePlayer };
