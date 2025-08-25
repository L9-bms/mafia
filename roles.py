from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # avoid circular import
    from room import Room


class Role(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass


class NightRole(Role):
    @abstractmethod
    def perform_night_action(self, room: "Room", actor_id: str, target_id: str) -> None:
        pass


# roles


class Villager(Role):
    @property
    def name(self) -> str:
        return "Villager"

    @property
    def description(self) -> str:
        return "Your goal is to eliminate all mafia members. You can only do this by voting during the day."


class Mafia(NightRole):
    @property
    def name(self) -> str:
        return "Mafia"

    @property
    def description(self) -> str:
        return "Your goal is to eliminate all non-mafia. You can kill someone each night and communicate with other mafia. (The chat during the night is only shown to other mafia.)"

    def perform_night_action(self, room: "Room", actor_id: str, target_id: str) -> None:
        if target_id in room.players:
            target_player = room.players[target_id]
            room.kill_player(target_player)


class Doctor(NightRole):
    @property
    def name(self) -> str:
        return "Doctor"

    @property
    def description(self) -> str:
        return "You can protect one person each night from being killed."

    def perform_night_action(self, room: "Room", actor_id: str, target_id: str) -> None:
        if target_id in room.players:
            target_player = room.players[target_id]
            room.protect_player(target_player)


class Detective(NightRole):
    @property
    def name(self) -> str:
        return "Detective"

    @property
    def description(self) -> str:
        return "You can investigate one person each night to learn if they are mafia or not."

    def perform_night_action(self, room: "Room", actor_id: str, target_id: str) -> None:
        # for detective, result is immediately sent to player
        pass
