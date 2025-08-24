interface ErrorProps {
    error: string;
}

export default function Error({ error }: ErrorProps) {
    if (!error) return null;

    return (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
        </div>
    );
}
