import {
    Button,
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
} from "@headlessui/react";
import type { PlayerInfo, GameState } from "../types";

interface PlayerStatusProps {
    playerInfo: PlayerInfo;
    gameState: GameState;
    roleRevealed: boolean;
    onToggleRole: () => void;
}

export default function PlayerStatus({
    playerInfo,
    gameState,
    roleRevealed,
    onToggleRole,
}: PlayerStatusProps) {
    if (gameState.phase === "waiting" || gameState.phase === "finished") {
        return <></>;
    }

    return (
        <div className="p-4 border-b-1">
            <Disclosure>
                <div className="flex flex-row justify-between">
                    <div className="text-left">
                        <p className="text-2xl">
                            Role:&nbsp;
                            <Button onClick={onToggleRole}>
                                {roleRevealed
                                    ? playerInfo.role || "Unknown"
                                    : "???"}
                            </Button>
                        </p>
                        <p className="text-lg">
                            Phase:{" "}
                            <span className="font-semibold">
                                {gameState.phase}
                            </span>
                        </p>
                        <p className="text-lg">
                            Time remaining:{" "}
                            <span className="font-semibold">
                                {gameState.time_remaining}s
                            </span>
                        </p>
                    </div>
                    <DisclosureButton className="text-blue-600 hover:text-blue-800">
                        What do I do?
                    </DisclosureButton>
                </div>
                <DisclosurePanel className="text-sm text-gray-600 mt-2">
                    <p className="mt-2">{playerInfo.role_description}</p>
                </DisclosurePanel>
            </Disclosure>
        </div>
    );
}
