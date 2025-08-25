export interface Player {
    id: string;
    name: string;
    is_alive: boolean;
    role?: string;
}

export interface PlayerInfo {
    id: string;
    name: string;
    role: string;
    role_description: string;
    is_alive: boolean;
    can_act_at_night: boolean;
    can_chat: boolean;
    is_host: boolean;
    has_voted: boolean;
    has_acted: boolean;
}

export interface GameState {
    phase: "waiting" | "night" | "day" | "finished";
    time_remaining: number;
    game_result?: string;
}

export interface ChatMessage {
    sender: string;
    message: string;
    timestamp: number;
    is_server: boolean;
}

export interface GameData {
    gameState: GameState | null;
    playerInfo: PlayerInfo | null;
    players: Player[];
    chat: ChatMessage[];
}
