"""本地冒烟负载：在进程内创建 10 个私密房和 60 条 Socket 连接。"""

import importlib
import os
from pathlib import Path
import sys
import tempfile
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def run():
    os.environ.setdefault('POKER_ASYNC_MODE', 'threading')
    os.environ.setdefault('POKER_DEBUG', 'false')
    app_module = importlib.import_module('app')
    from database import PokerDatabase

    started = time.perf_counter()
    with tempfile.TemporaryDirectory() as tempdir:
        app_module.db = PokerDatabase(os.path.join(tempdir, 'load.db'))
        app_module.tables.clear()
        app_module.players.clear()
        app_module.v1_socket_sessions.clear()
        app_module._rate_limit_buckets.clear()
        sockets = []
        for room_index in range(10):
            room_clients = []
            for player_index in range(6):
                client = app_module.app.test_client()
                address = f'10.{room_index}.0.{player_index + 1}'
                guest = client.post(
                    '/api/v1/guest-sessions',
                    json={'nickname': f'R{room_index + 1}P{player_index + 1}'},
                    environ_overrides={'REMOTE_ADDR': address},
                )
                assert guest.status_code == 201, guest.get_json()
                room_clients.append((client, address))
            host, host_address = room_clients[0]
            created = host.post(
                '/api/v1/rooms', json={'title': f'Load {room_index + 1}', 'max_players': 6},
                environ_overrides={'REMOTE_ADDR': host_address},
            )
            assert created.status_code == 201, created.get_json()
            code = created.get_json()['room']['join_code']
            for client, address in room_clients[1:]:
                joined = client.post(
                    f'/api/v1/rooms/{code}/join', json={},
                    environ_overrides={'REMOTE_ADDR': address},
                )
                assert joined.status_code == 200, joined.get_json()
            for client, _address in room_clients:
                socket = app_module.socketio.test_client(app_module.app, flask_test_client=client)
                socket.emit('room:join', {'join_code': code})
                assert socket.is_connected()
                sockets.append(socket)
        elapsed = time.perf_counter() - started
        assert len(app_module.tables) == 10
        assert len(sockets) == 60
        print(f'PASS 10 rooms / 60 sockets in {elapsed:.2f}s')


if __name__ == '__main__':
    run()
