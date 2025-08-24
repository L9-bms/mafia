interface RoomInfoProps {
    roomCode: string;
}

export default function RoomInfo({ roomCode }: RoomInfoProps) {
    return (
        <div className="p-4 border-b-1">
            <span className="text-3xl">
                Room Code: <span className="font-bold">{roomCode}</span>
            </span>
        </div>
    );
}
