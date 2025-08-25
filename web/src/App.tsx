import { Button, Input } from "@headlessui/react";
import { useState, useEffect } from "react";
import Game from "./Game";
import { useGameState } from "./hooks/useGameState";

export default function App() {
    const [name, setName] = useState("");
    const [joinCode, setJoinCode] = useState("");

    const {
        connected,
        error,
        gameData,
        roomCode,
        playerId,
        isInGame,
        createRoom,
        joinRoom,
        vote,
        nightAction,
        sendChat,
        startGame,
        replayGame,
        disbandRoom,
    } = useGameState();

    const handleNewGame = () => {
        if (name.trim()) {
            createRoom(name.trim());
        }
    };

    const handleJoinGame = () => {
        if (name.trim() && joinCode.trim()) {
            joinRoom(name.trim(), joinCode.trim());
        }
    };

    useEffect(() => {
        if (error) {
            setJoinCode("");
        }
    }, [error]);

    if (isInGame && connected && roomCode) {
        return (
            <Game
                gameData={gameData}
                roomCode={roomCode}
                playerId={playerId}
                onVote={vote}
                onNightAction={nightAction}
                onSendChat={sendChat}
                onStartGame={startGame}
                onReplayGame={replayGame}
                onDisbandRoom={disbandRoom}
                error={error}
            />
        );
    }

    return (
        <div className="flex justify-center items-center p-4 h-screen">
            <div className="space-y-4">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Mafia Game</h1>
                    <h2 className="text-lg">By Callum Wong</h2>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                        {error}
                    </div>
                )}

                <Input
                    name="name"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <div className="flex gap-2">
                    <Input
                        name="code"
                        className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Room Code"
                        value={joinCode}
                        onChange={(e) =>
                            setJoinCode(e.target.value.toUpperCase())
                        }
                    />
                    <Button
                        className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                        onClick={handleJoinGame}
                        disabled={
                            !connected || !name.trim() || !joinCode.trim()
                        }
                    >
                        Join
                    </Button>
                </div>

                <Button
                    className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    onClick={handleNewGame}
                    disabled={!connected || !name.trim()}
                >
                    {connected ? "Create New Game" : "Connecting..."}
                </Button>

                <p className="text-sm text-gray-500 text-center">
                    {connected ? "Connected" : "Disconnected"}
                </p>
            </div>
        </div>
    );
}
