import asyncio
from server import MafiaServer


def main() -> None:
    server = MafiaServer()
    asyncio.run(server.start())


if __name__ == "__main__":
    main()
