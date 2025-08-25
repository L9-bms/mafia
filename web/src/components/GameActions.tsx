import { Button, Select } from "@headlessui/react";
import type { Player, PlayerInfo, GameState } from "../types";

interface GameActionsProps {
    gameState: GameState;
    playerInfo: PlayerInfo;
    players: Player[];
    playerId: string;
    selectedTarget: string;
    onTargetChange: (target: string) => void;
    onAction: () => void;
    onStartGame: () => void;
    onReplayGame: () => void;
    onDisbandRoom: () => void;
    actionSubmitted: boolean;
}

export default function GameActions({
    gameState,
    playerInfo,
    players,
    playerId,
    selectedTarget,
    onTargetChange,
    onAction,
    onStartGame,
    onReplayGame,
    onDisbandRoom,
    actionSubmitted,
}: GameActionsProps) {
    const getActionButtonText = () => {
        if (gameState.phase === "day") return "Vote";
        if (gameState.phase === "night") {
            if (playerInfo.role === "Mafia") return "Kill";
            if (playerInfo.role === "Doctor") return "Protect";
            if (playerInfo.role === "Detective") return "Investigate";
        }
        return "Confirm";
    };

    const getPhaseDescription = () => {
        if (gameState.phase === "waiting") {
            return "Waiting for host to start game...";
        } else if (!playerInfo.is_alive) {
            return "You are dead.";
        } else if (gameState.phase === "day") {
            return "Vote on one person to eliminate. Discuss with everyone in chat.";
        } else if (gameState.phase === "night") {
            if (playerInfo.role === "Mafia") {
                return "Choose someone to kill. You can conspire with other mafia in chat.";
            } else if (playerInfo.role === "Doctor") {
                return "Choose someone to protect from being killed tonight.";
            } else if (playerInfo.role === "Detective") {
                return "Choose someone to investigate. You'll learn if they are mafia.";
            } else {
                return "Zzz...";
            }
        } else if (gameState.phase === "finished") {
            return "Game over!";
        }
        return "";
    };

    const aliveTargets = players.filter((p) => p.is_alive && p.id !== playerId);

    const hasAlreadyActed =
        actionSubmitted ||
        (gameState.phase === "day" && playerInfo.has_voted) ||
        (gameState.phase === "night" && playerInfo.has_acted);

    return (
        <div className="p-4">
            <p className="text-lg mb-3">{getPhaseDescription()}</p>

            {gameState.phase === "finished" && gameState.game_result && (
                <p className="text-lg text-green-600 font-bold">
                    {gameState.game_result}
                </p>
            )}

            <div className="flex flex-col gap-3">
                {playerInfo.can_act_at_night &&
                    playerInfo.is_alive &&
                    aliveTargets.length > 0 && (
                        <div className="flex flex-row gap-2">
                            {hasAlreadyActed ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <p className="text-green-600 font-semibold">
                                        ✓{" "}
                                        {gameState.phase === "day"
                                            ? "Vote cast!"
                                            : "Action completed!"}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {gameState.phase === "day"
                                            ? "You have cast your vote. Waiting for others..."
                                            : "You have performed your action. Waiting for others..."}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <Select
                                        name="target"
                                        aria-label="Target"
                                        className="border border-gray-300 p-2 grow rounded"
                                        value={selectedTarget}
                                        onChange={(e) =>
                                            onTargetChange(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Select target...
                                        </option>
                                        {aliveTargets.map((player) => (
                                            <option
                                                key={player.id}
                                                value={player.id}
                                            >
                                                {player.name}
                                            </option>
                                        ))}
                                    </Select>
                                    <Button
                                        className="p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
                                        onClick={onAction}
                                        disabled={!selectedTarget}
                                    >
                                        {getActionButtonText()}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                {gameState.phase === "waiting" && (
                    <div className="text-center">
                        <p className="text-lg">Players: {players.length}</p>
                        <div className="flex flex-wrap gap-2">
                            {players.map((player) => (
                                <span
                                    key={player.id}
                                    className={`px-2 py-1 rounded ${
                                        player.is_alive
                                            ? "bg-gray-200"
                                            : "bg-red-200 text-red-700 line-through"
                                    }`}
                                >
                                    {player.name}
                                </span>
                            ))}
                        </div>
                        {players.length >= 6 && playerInfo.is_host && (
                            <Button
                                className="mt-2 p-2 bg-green-500 text-white rounded hover:bg-green-600"
                                onClick={onStartGame}
                            >
                                Start Game
                            </Button>
                        )}
                        {players.length < 6 && (
                            <p className="text-sm text-gray-500">
                                Need at least 6 players to start
                            </p>
                        )}
                        {players.length >= 6 && !playerInfo.is_host && (
                            <p className="text-sm text-gray-500">
                                Waiting for host to start the game
                            </p>
                        )}
                    </div>
                )}

                {gameState.phase === "finished" && playerInfo.is_host && (
                    <div className="text-center">
                        <div className="flex flex-col gap-2">
                            <Button
                                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={onReplayGame}
                            >
                                Replay Game
                            </Button>
                            <Button
                                className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                                onClick={onDisbandRoom}
                            >
                                Disband Room
                            </Button>
                        </div>
                    </div>
                )}

                {gameState.phase === "finished" && !playerInfo.is_host && (
                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            Waiting for host to replay or disband...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
