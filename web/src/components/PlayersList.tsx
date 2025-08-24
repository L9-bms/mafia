import type { Player } from "../types";

interface PlayersListProps {
    players: Player[];
}

export default function PlayersList({ players }: PlayersListProps) {
    return (
        <div className="flex-1 p-4">
            <h3 className="font-bold mb-4">Players</h3>
            <div className="border p-3 rounded bg-gray-50">
                {players.map((player) => (
                    <div
                        key={player.id}
                        className={`mb-1 ${!player.is_alive ? "text-gray-500 line-through" : ""}`}
                    >
                        {player.name}
                        {!player.is_alive && " (DEAD)"}
                    </div>
                ))}
            </div>
        </div>
    );
}
