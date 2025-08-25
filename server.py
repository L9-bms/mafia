import json
import secrets
import string
from websockets import ServerConnection
from websockets.asyncio.server import serve
from typing import Dict, Any, Optional

from enums import GamePhase

from room import Room
from player import Player


class MafiaServer:
    def __init__(self) -> None:
        self.rooms: Dict[str, Room] = {}

    async def error(self, websocket: ServerConnection, message: str) -> None:
        event: Dict[str, Any] = {
            "type": "error",
            "message": message,
        }
        await websocket.send(json.dumps(event))

    async def play(
        self, websocket: ServerConnection, room: Room, player: Player
    ) -> None:
        try:
            async for message in websocket:
                print(f"Player {player.name} sent: {message}")
                event: Dict[str, Any] = json.loads(message)

                if event["type"] == "vote":
                    target_id: str = event["target"]
                    await room.vote(player.id, target_id)
                elif event["type"] == "night_action":
                    target_id: str = event["target"]
                    await room.night_action(player.id, target_id)
                elif event["type"] == "chat":
                    message_text: str = event["message"]
                    await room.send_chat(player.id, message_text)
                elif event["type"] == "start_game":
                    await room.start_game(player.id)
                elif event["type"] == "replay_game":
                    await room.play_again(player.id)
                elif event["type"] == "disband_room":
                    room_disbanded: bool = await room.disband_room(player.id)
                    if room_disbanded:
                        if room.room_code and room.room_code in self.rooms:
                            del self.rooms[room.room_code]
                        break

                await room.send_player_state(player)
        except Exception as e:
            print(f"Error: {e}")

    async def new_room(self, websocket: ServerConnection, name: str) -> None:
        room_code: str = "".join(
            secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4)
        )
        room: Room = Room(room_code)
        self.rooms[room_code] = room
        print(f"Created room {room_code}")

        player: Player = Player(websocket, name[:20])
        room.add_player(player)

        try:
            event: Dict[str, Any] = {
                "type": "room_created",
                "room_code": room_code,
                "player_id": player.id,
            }
            await websocket.send(json.dumps(event))
            await room.send_player_state(player)
            await self.play(websocket, room, player)
        finally:
            room.remove_player(player.id)
            if len(room.players) == 0:
                del self.rooms[room_code]

    async def join_room(
        self, websocket: ServerConnection, room_code: str, name: str
    ) -> bool:
        try:
            room: Room = self.rooms[room_code.upper()]
        except KeyError:
            await self.error(websocket, "Game not found.")
            return False

        if room.phase != GamePhase.WAITING:
            await self.error(websocket, "Game in progress.")
            return False

        player: Player = Player(websocket, name[:20])
        room.add_player(player)

        await room.broadcast(
            {
                "type": "player_joined",
                "message": f"{player.name} joined the room.",
            }
        )

        try:
            event: Dict[str, Any] = {
                "type": "room_joined",
                "room_code": room_code,
                "player_id": player.id,
            }
            await websocket.send(json.dumps(event))
            await room.broadcast_game_state()
            await self.play(websocket, room, player)
        finally:
            room.remove_player(player.id)
            if len(room.players) > 0:
                await room.broadcast(
                    {
                        "type": "player_left",
                        "message": f"{player.name} left the room.",
                    }
                )
                await room.broadcast_game_state()
        return True

    async def handler(self, websocket: ServerConnection) -> None:
        try:
            async for message in websocket:
                print(f"Received message: {message}")
                event: Dict[str, Any] = json.loads(message)

                if event["type"] == "new_room":
                    name: Optional[str] = event.get("name")
                    if name:
                        print(f"Creating new room for {name}")
                        await self.new_room(websocket, name)
                        break
                elif event["type"] == "join_room":
                    room_code: str = event["room_code"]
                    name: Optional[str] = event.get("name")
                    if name:
                        print(f"Joining room {room_code} for {name}")
                        success: bool = await self.join_room(websocket, room_code, name)
                        if success:
                            break
        except Exception as e:
            print(f"Error: {e}")

    async def start(self) -> None:
        async with serve(self.handler, "", 8081) as server:
            print("Running on port 8081")
            await server.serve_forever()
