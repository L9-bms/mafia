from enum import Enum


class GamePhase(Enum):
    WAITING = "waiting"
    NIGHT = "night"
    DAY = "day"
    FINISHED = "finished"
