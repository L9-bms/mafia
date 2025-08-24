import { useState, useEffect, useRef } from "react";
import type { GameData } from "../types";

interface UseGameStateReturn {
    connected: boolean;
    error: string;

    gameData: GameData;
    roomCode: string;
    playerId: string;
    isInGame: boolean;

    createRoom: (playerName: string) => void;
    joinRoom: (playerName: string, code: string) => void;
    vote: (targetId: string) => void;
    nightAction: (targetId: string) => void;
    sendChat: (message: string) => void;
    startGame: () => void;
    replayGame: () => void;
    disbandRoom: () => void;

    setError: (error: string) => void;
}

export function useGameState(): UseGameStateReturn {
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState("");
    const [gameData, setGameData] = useState<GameData>({
        gameState: null,
        playerInfo: null,
        players: [],
        chat: [],
    });
    const [roomCode, setRoomCode] = useState("");
    const [playerId, setPlayerId] = useState("");
    const [isInGame, setIsInGame] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<number | null>(null);
    const isConnectingRef = useRef(false);

    const sendMessage = (message: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.log("WebSocket is not connected");
        }
    };

    const connect = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
            return;
        }

        isConnectingRef.current = true;
        wsRef.current = new WebSocket("ws://192.168.0.21:8081");

        wsRef.current.onopen = () => {
            isConnectingRef.current = false;
            setConnected(true);
            setError("");
        };

        wsRef.current.onclose = () => {
            isConnectingRef.current = false;
            setConnected(false);
            setTimeout(() => connect(), 3000);
        };

        wsRef.current.onerror = () => {
            isConnectingRef.current = false;
            setError("Connection error");
        };

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Received:", data);
                handleMessage(data);
            } catch (err) {
                console.error("Failed to parse message:", err);
            }
        };
    };

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, []);

    useEffect(() => {
        if (
            gameData.gameState?.time_remaining &&
            gameData.gameState.time_remaining > 0
        ) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                setGameData((prev) => {
                    if (!prev.gameState || prev.gameState.time_remaining <= 0) {
                        return prev;
                    }
                    return {
                        ...prev,
                        gameState: {
                            ...prev.gameState,
                            time_remaining: Math.max(
                                0,
                                prev.gameState.time_remaining - 1,
                            ),
                        },
                    };
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameData.gameState?.time_remaining]);

    const handleMessage = (data: any) => {
        switch (data.type) {
            case "room_created":
                setRoomCode(data.room_code);
                setPlayerId(data.player_id);
                setIsInGame(true);
                setError("");
                break;

            case "room_joined":
                setRoomCode(data.room_code);
                setPlayerId(data.player_id);
                setIsInGame(true);
                setError("");
                break;

            case "game_state":
                setGameData((prev) => ({
                    ...prev,
                    gameState: {
                        phase: data.phase,
                        time_remaining: data.time_remaining,
                        game_result: data.game_result,
                    },
                }));
                break;

            case "player_info":
                setGameData((prev) => ({
                    ...prev,
                    playerInfo: data,
                }));
                break;

            case "players_update":
                setGameData((prev) => ({
                    ...prev,
                    players: data.players,
                }));
                break;

            case "chat_message":
                setGameData((prev) => ({
                    ...prev,
                    chat: [...prev.chat, data.chat],
                }));
                break;

            case "room_disbanded":
                setIsInGame(false);
                setRoomCode("");
                setPlayerId("");
                setGameData({
                    gameState: null,
                    playerInfo: null,
                    players: [],
                    chat: [],
                });
                setError(data.message || "Room was disbanded");
                break;

            case "error":
                setError(data.message);
                break;

            default:
                console.log("Unknown message type:", data.type);
        }
    };

    const createRoom = (playerName: string) => {
        sendMessage({
            type: "new_room",
            name: playerName,
        });
    };

    const joinRoom = (playerName: string, code: string) => {
        sendMessage({
            type: "join_room",
            room_code: code,
            name: playerName,
        });
    };

    const vote = (targetId: string) => {
        sendMessage({
            type: "vote",
            target: targetId,
        });
    };

    const nightAction = (targetId: string) => {
        sendMessage({
            type: "night_action",
            target: targetId,
        });
    };

    const sendChat = (message: string) => {
        sendMessage({
            type: "chat",
            message,
        });
    };

    const startGame = () => {
        sendMessage({
            type: "start_game",
        });
    };

    const replayGame = () => {
        sendMessage({
            type: "replay_game",
        });
    };

    const disbandRoom = () => {
        sendMessage({
            type: "disband_room",
        });
    };

    return {
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
        setError,
    };
}
