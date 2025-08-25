from asyncio import Task, create_task, sleep
import time
import random
from typing import Dict, List, Optional, Any

from enums import GamePhase
from player import Player
from roles import Mafia, Doctor, Detective, Villager, NightRole


class Room:
    def __init__(self, room_code: str) -> None:
        self.room_code: str = room_code
        self.players: Dict[str, Player] = {}
        self.phase: GamePhase = GamePhase.WAITING
        self.phase_timer: float = 0
        self.phase_duration: int = 60  # seconds
        self.minimum_players: int = 6
        self.votes: Dict[str, str] = {}
        self.night_actions: Dict[str, str] = {}
        self.event_log: List[Dict[str, Any]] = []
        self.chat_log: List[Dict[str, Any]] = []
        self.host: Optional[str] = None
        self.game_task: Optional[Task[None]] = None
        self.game_result: Optional[str] = None
        self.killed_players: List[Player] = []
        self.protected_players: List[Player] = []

    def add_player(self, player: Player) -> None:
        self.players[player.id] = player
        if self.host is None:
            self.host = player.id

    def remove_player(self, player_id: str) -> None:
        if player_id in self.players:
            del self.players[player_id]
            if self.host == player_id and self.players:
                self.host = next(iter(self.players.keys()))

    async def broadcast(self, event: Dict[str, Any]) -> None:
        for player in self.players.values():
            await player.send(event)

    async def broadcast_to_mafia(self, event: Dict[str, Any]) -> None:
        for player in self.players.values():
            if isinstance(player.role, Mafia) and player.is_alive:
                await player.send(event)

    async def send_to(self, player_id: str, event: Dict[str, Any]) -> None:
        if player_id in self.players:
            await self.players[player_id].send(event)

    def kill_player(self, player: Player) -> None:
        if player not in self.killed_players:
            self.killed_players.append(player)

    def protect_player(self, player: Player) -> None:
        if player not in self.protected_players:
            self.protected_players.append(player)

    def assign_roles(self) -> bool:
        alive_players: List[Player] = list(self.players.values())
        num_players: int = len(alive_players)

        if num_players < self.minimum_players:
            return False

        num_mafia: int = max(1, num_players // 3)
        roles: List[Any] = []

        for _ in range(num_mafia):
            roles.append(Mafia())

        if num_players > 4:
            roles.append(Doctor())
        if num_players > 5:
            roles.append(Detective())

        while len(roles) < num_players:
            roles.append(Villager())

        random.shuffle(roles)
        for i, player in enumerate(alive_players):
            player.set_role(roles[i])

        return True

    async def start_game(self, starter_id: str) -> None:
        if starter_id != self.host:
            raise ValueError("only host can start the game")

        if len(self.players) < self.minimum_players:
            await self.broadcast(
                {
                    "type": "error",
                    "message": f"Need at least {self.minimum_players} players to start",
                }
            )
            return

        if not self.assign_roles():
            await self.broadcast({"type": "error", "message": "Failed to assign roles"})
            return

        self.phase = GamePhase.NIGHT
        await self.add_event("Game started! Night phase begins.")
        await self.broadcast_game_state()

        self.game_task = create_task(self.game_loop())

    async def play_again(self, requester_id: str) -> None:
        if requester_id != self.host:
            await self.send_to(
                requester_id,
                {
                    "type": "error",
                    "message": "Only the host can restart the game",
                },
            )
            return

        if self.phase != GamePhase.FINISHED:
            await self.send_to(
                requester_id, {"type": "error", "message": "Game is not finished yet"}
            )
            return

        self.phase = GamePhase.WAITING
        self.game_result = None
        self.phase_timer = 0
        self.votes = {}
        self.night_actions = {}
        self.killed_players = []
        self.protected_players = []
        self.chat_log = []
        self.event_log = []

        for player in self.players.values():
            player.is_alive = True
            player.role = None

        if self.game_task and not self.game_task.done():
            self.game_task.cancel()

        await self.add_event("Game has been reset. Ready to start again!")
        await self.broadcast_game_state()

    async def disband_room(self, requester_id: str) -> bool:
        if requester_id != self.host:
            await self.send_to(
                requester_id,
                {
                    "type": "error",
                    "message": "Only the host can disband the room",
                },
            )
            return False

        if self.game_task and not self.game_task.done():
            self.game_task.cancel()

        await self.broadcast(
            {
                "type": "room_disbanded",
                "message": "The room has been disbanded by the host",
            }
        )

        self.phase = GamePhase.FINISHED
        return True

    async def game_loop(self) -> None:
        while self.phase != GamePhase.FINISHED:
            if self.phase == GamePhase.NIGHT:
                await self.run_night_phase()
            elif self.phase == GamePhase.DAY:
                await self.run_day_phase()

            if await self.check_win_condition():
                break

    async def run_night_phase(self) -> None:
        self.phase_timer = time.time() + self.phase_duration
        self.night_actions.clear()
        self.chat_log.clear()
        self.killed_players.clear()
        self.protected_players.clear()

        await self.broadcast_game_state()

        while time.time() < self.phase_timer and self.phase != GamePhase.FINISHED:
            await sleep(1)
            if self.all_night_actions_submitted():
                break

        await self.process_night_actions()
        if self.phase != GamePhase.FINISHED:
            self.phase = GamePhase.DAY

        await self.broadcast_game_state()

    async def run_day_phase(self) -> None:
        self.phase_timer = time.time() + self.phase_duration
        self.votes.clear()
        self.chat_log.clear()

        await self.broadcast_game_state()

        while time.time() < self.phase_timer and self.phase != GamePhase.FINISHED:
            await sleep(1)
            if self.all_votes_submitted():
                break

        await self.process_votes()
        if self.phase != GamePhase.FINISHED:
            self.phase = GamePhase.NIGHT

        await self.broadcast_game_state()

    def all_night_actions_submitted(self) -> bool:
        for player in self.players.values():
            if (
                isinstance(player.role, NightRole)
                and player.id not in self.night_actions
            ):
                return False
        return True

    def all_votes_submitted(self) -> bool:
        for player in self.players.values():
            if player.is_alive and player.id not in self.votes:
                return False
        return True

    async def process_night_actions(self) -> None:
        for actor_id, target_id in self.night_actions.items():
            actor = self.players.get(actor_id)
            target = self.players.get(target_id)

            if actor and target and isinstance(actor.role, NightRole):
                actor.role.perform_night_action(self, actor_id, target_id)

        if len(self.killed_players) < 1:
            await self.add_event("No one was killed during the night.")
            return

        for killed_player in self.killed_players:
            if killed_player not in self.protected_players:
                killed_player.is_alive = False
                await self.add_event(
                    f"{killed_player.name} was killed during the night."
                )
            else:
                await self.add_event("Someone was attacked but saved by the doctor!")

    async def process_votes(self) -> None:
        if not self.votes:
            await self.add_event("No votes were cast.")
            return

        vote_counts = {}
        for target_id in self.votes.values():
            vote_counts[target_id] = vote_counts.get(target_id, 0) + 1

        total_voters = sum(1 for p in self.players.values() if p.is_alive)
        required_votes = (total_voters + 1) // 2

        eliminated = [
            id for id, count in vote_counts.items() if count >= required_votes
        ]

        if len(eliminated) == 1:
            eliminated_player = self.players.get(eliminated[0])
            if eliminated_player and eliminated_player.role:
                eliminated_player.is_alive = False
                await self.add_event(
                    f"{eliminated_player.name} ({eliminated_player.role.name}) was voted out and eliminated."
                )
        else:
            await self.add_event("Failed to reach consensus. No one was eliminated.")

    async def check_win_condition(self) -> bool:
        alive_players = [p for p in self.players.values() if p.is_alive]
        mafia_count = sum(1 for p in alive_players if isinstance(p.role, Mafia))
        town_count = len(alive_players) - mafia_count

        if mafia_count == 0:
            await self.add_event("Town wins! All mafia have been eliminated.")
            self.phase = GamePhase.FINISHED
            self.game_result = "Town wins! All mafia have been eliminated."
            await self.broadcast_game_state()
            return True
        elif mafia_count >= town_count:
            await self.add_event("Mafia wins! They equal or outnumber the town.")
            self.phase = GamePhase.FINISHED
            self.game_result = "Mafia wins! They equal or outnumber the town."
            await self.broadcast_game_state()
            return True

        return False

    async def add_event(self, message: str) -> None:
        event = {"message": message, "timestamp": time.time()}
        self.event_log.append(event)

        server_message = {
            "sender": "[Server]",
            "message": message,
            "timestamp": event["timestamp"],
            "is_server": True,
        }
        await self.broadcast({"type": "chat_message", "chat": server_message})

    async def vote(self, player_id: str, target_id: str) -> None:
        if self.phase != GamePhase.DAY:
            raise ValueError("Can only vote during day phase")

        player = self.players.get(player_id)
        target = self.players.get(target_id)

        if not player or not player.is_alive:
            raise ValueError("you're dead")

        if not target or not target.is_alive:
            raise ValueError("invalid target")

        if player_id in self.votes:
            raise ValueError("cannot change vote")

        self.votes[player_id] = target_id
        await self.broadcast(
            {"type": "vote_cast", "voter": player.name, "target": target.name}
        )

    async def night_action(self, player_id: str, target_id: str) -> None:
        if self.phase != GamePhase.NIGHT:
            raise ValueError("can only perform actions during night phase")

        player = self.players.get(player_id)
        target = self.players.get(target_id)

        if not player or not player.is_night_role():
            raise ValueError("you aren't supposed to do that")

        if not target or not target.is_alive:
            raise ValueError("invalid target")

        if player_id in self.night_actions:
            raise ValueError("cannot change action")

        self.night_actions[player_id] = target_id

        if isinstance(player.role, Detective):
            result = "mafia" if isinstance(target.role, Mafia) else "not mafia"

            await self.send_to(
                player_id,
                {
                    "type": "chat_message",
                    "chat": {
                        "sender": "[Server]",
                        "message": f"{target.name} is {result}.",
                        "timestamp": time.time(),
                        "is_server": True,
                    },
                },
            )

    async def send_chat(self, player_id: str, message: str) -> None:
        player = self.players.get(player_id)
        if not player or not player.is_alive:
            return

        chat_message = {
            "sender": player.name,
            "message": message,
            "timestamp": time.time(),
        }

        if self.phase == GamePhase.NIGHT:
            if isinstance(player.role, Mafia):
                self.chat_log.append(chat_message)
                await self.broadcast_to_mafia(
                    {"type": "chat_message", "chat": chat_message}
                )
        elif self.phase == GamePhase.DAY:
            self.chat_log.append(chat_message)
            await self.broadcast({"type": "chat_message", "chat": chat_message})

    async def broadcast_game_state(self) -> None:
        for player in self.players.values():
            await self.send_player_state(player)

    async def send_player_state(self, player: Player) -> None:
        time_remaining = 0
        if self.phase in [GamePhase.NIGHT, GamePhase.DAY]:
            time_remaining = (
                max(0, int(self.phase_timer - time.time()))
                if self.phase_timer > 0
                else 0
            )

        state = {
            "type": "game_state",
            "phase": self.phase.value,
            "time_remaining": time_remaining,
            "game_result": self.game_result
            if self.phase == GamePhase.FINISHED
            else None,
            "is_host": player.id == self.host,
        }
        await player.send(state)

        player_info = {
            "type": "player_info",
            "id": player.id,
            "name": player.name,
            "role": player.role.name if player.role else None,
            "role_description": player.role.description if player.role else None,
            "is_alive": player.is_alive,
            "can_act_at_night": player.is_night_role(),
            "can_chat": isinstance(player.role, Mafia) if GamePhase.NIGHT else True,
            "is_host": player.id == self.host,
            "has_voted": player.id in self.votes,
            "has_acted": player.id in self.night_actions,
        }
        await player.send(player_info)

        alive_players = [
            {"id": p.id, "name": p.name, "is_alive": p.is_alive}
            for p in self.players.values()
        ]
        players_update = {"type": "players_update", "players": alive_players}
        await player.send(players_update)
