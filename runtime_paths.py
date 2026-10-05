"""运行时文件路径。生产环境把所有 SQLite 文件放在同一持久目录中。"""

import os
from typing import Mapping, Optional


def data_file(filename: str, environment: Optional[Mapping[str, str]] = None) -> str:
    env = environment if environment is not None else os.environ
    data_dir = str(env.get('POKER_DATA_DIR', '')).strip()
    if not data_dir:
        return filename
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, filename)

