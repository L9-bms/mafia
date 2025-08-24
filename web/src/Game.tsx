import { useState, useEffect } from "react";
import type { GameData } from "./types";
import RoomInfo from "./components/RoomInfo";
import PlayerStatus from "./components/PlayerStatus";
import GameActions from "./components/GameActions";
import PlayersList from "./components/PlayersList";
import ChatPanel from "./components/ChatPanel";
import Error from "./components/Error";

interface GameProps {
    gameData: GameData;
    roomCode: string;
    playerId: string;
    onVote: (targetId: string) => void;
    onNightAction: (targetId: string) => void;
    onSendChat: (message: string) => void;
    onStartGame: () => void;
    onReplayGame: () => void;
    onDisbandRoom: () => void;
    error: string;
}

export default function Game({
    gameData,
    roomCode,
    playerId,
    onVote,
    onNightAction,
    onSendChat,
    onStartGame,
    onReplayGame,
    onDisbandRoom,
    error,
}: GameProps) {
    const [selectedTarget, setSelectedTarget] = useState("");
    const [roleRevealed, setRoleRevealed] = useState(false);
    const [actionSubmitted, setActionSubmitted] = useState(false);

    const { gameState, playerInfo, players, chat } = gameData;

    useEffect(() => {
        if (gameState?.phase === "waiting") {
            setSelectedTarget("");
            setActionSubmitted(false);
        }
    }, [gameState?.phase]);

    useEffect(() => {
        if (gameState?.phase === "day" || gameState?.phase === "night") {
            setActionSubmitted(false);
        }
    }, [gameState?.phase]);

    if (!gameState || !playerInfo) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl">Loading game...</div>
            </div>
        );
    }

    const handleAction = () => {
        if (!selectedTarget) return;

        if (gameState.phase === "day" && playerInfo.is_alive) {
            onVote(selectedTarget);
            setActionSubmitted(true);
        } else if (gameState.phase === "night" && playerInfo.can_act_at_night) {
            onNightAction(selectedTarget);
            setActionSubmitted(true);
        }
        setSelectedTarget("");
    };

    return (
        <div
            className={`flex flex-col h-screen ${!playerInfo.is_alive ? "opacity-75 bg-gray-50" : ""}`}
        >
            <div className="border-b">
                <RoomInfo roomCode={roomCode} />

                <PlayerStatus
                    playerInfo={playerInfo}
                    gameState={gameState}
                    roleRevealed={roleRevealed}
                    onToggleRole={() => setRoleRevealed(!roleRevealed)}
                />

                <GameActions
                    gameState={gameState}
                    playerInfo={playerInfo}
                    players={players}
                    playerId={playerId}
                    selectedTarget={selectedTarget}
                    onTargetChange={setSelectedTarget}
                    onAction={handleAction}
                    onStartGame={onStartGame}
                    onReplayGame={onReplayGame}
                    onDisbandRoom={onDisbandRoom}
                    actionSubmitted={actionSubmitted}
                />

                <Error error={error} />
            </div>

            <div className="flex flex-1 bg-gray-50">
                <div className="w-1/3 border-r">
                    <PlayersList players={players} />
                </div>
                <div className="w-2/3">
                    <ChatPanel
                        chat={chat}
                        playerInfo={playerInfo}
                        onSendChat={onSendChat}
                    />
                </div>
            </div>
        </div>
    );
}
