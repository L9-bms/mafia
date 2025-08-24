import json
import uuid
from typing import Optional, Dict, Any
from websockets import ServerConnection
from roles import Role, NightRole


class Player:
    def __init__(self, websocket: ServerConnection, name: str) -> None:
        self.id: str = str(uuid.uuid4())
        self.name: str = name
        self.websocket: ServerConnection = websocket
        self.role: Optional[Role] = None
        self.is_alive: bool = True

    async def send(self, event: Dict[str, Any]) -> None:
        try:
            await self.websocket.send(json.dumps(event))
        except Exception as e:
            print(f"Failed to send to player {self.name}: {e}")

    def set_role(self, role: Role) -> None:
        self.role = role

    def is_night_role(self) -> bool:
        return isinstance(self.role, NightRole)
