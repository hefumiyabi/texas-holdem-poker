#!/usr/bin/env python3
"""
玩家持久化系统
Player Persistence System for managing human players and bots
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from enum import Enum
from runtime_paths import data_file

class PlayerType(Enum):
    HUMAN = "human"
    BOT = "bot"

class PlayerPersistence:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or data_file('players.db')
        self.init_database()
    
    def init_database(self):
        """初始化数据库表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 玩家基础信息表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY,
                nickname TEXT NOT NULL,
                player_type TEXT NOT NULL,
                chips INTEGER NOT NULL DEFAULT 1000,
                total_hands_played INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0,
                total_losses INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # 机器人特定信息表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bot_info (
                player_id TEXT PRIMARY KEY,
                bot_level TEXT NOT NULL,
                aggression_level REAL DEFAULT 0.5,
                tightness_level REAL DEFAULT 0.5,
                bluff_frequency REAL DEFAULT 0.1,
                learning_data TEXT,
                FOREIGN KEY (player_id) REFERENCES players (id)
            )
        ''')
        
        # 玩家会话记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS player_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id TEXT NOT NULL,
                table_id TEXT,
                session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_end TIMESTAMP,
                starting_chips INTEGER,
                ending_chips INTEGER,
                hands_played INTEGER DEFAULT 0,
                hands_won INTEGER DEFAULT 0,
                FOREIGN KEY (player_id) REFERENCES players (id)
            )
        ''')
        
        # 玩家统计表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS player_stats (
                player_id TEXT PRIMARY KEY,
                total_games INTEGER DEFAULT 0,
                total_winnings INTEGER DEFAULT 0,
                biggest_win INTEGER DEFAULT 0,
                biggest_loss INTEGER DEFAULT 0,
                win_rate REAL DEFAULT 0.0,
                avg_session_duration INTEGER DEFAULT 0,
                preferred_position TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES players (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("📊 玩家持久化数据库初始化完成")
    
    def create_human_player(self, nickname: str, initial_chips: int = 1000) -> str:
        """创建人类玩家"""
        player_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO players (id, nickname, player_type, chips)
            VALUES (?, ?, ?, ?)
        ''', (player_id, nickname, PlayerType.HUMAN.value, initial_chips))
        
        # 初始化统计数据
        cursor.execute('''
            INSERT INTO player_stats (player_id)
            VALUES (?)
        ''', (player_id,))
        
        conn.commit()
        conn.close()
        
        print(f"👤 创建人类玩家: {nickname} (ID: {player_id})")
        return player_id
    
    def create_bot_player(self, nickname: str, bot_level: str, 
                         initial_chips: int = 1000,
                         aggression: float = 0.5,
                         tightness: float = 0.5,
                         bluff_freq: float = 0.1) -> str:
        """创建机器人玩家"""
        player_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建基础玩家记录
        cursor.execute('''
            INSERT INTO players (id, nickname, player_type, chips)
            VALUES (?, ?, ?, ?)
        ''', (player_id, nickname, PlayerType.BOT.value, initial_chips))
        
        # 创建机器人特定信息
        cursor.execute('''
            INSERT INTO bot_info (player_id, bot_level, aggression_level, 
                                tightness_level, bluff_frequency)
            VALUES (?, ?, ?, ?, ?)
        ''', (player_id, bot_level, aggression, tightness, bluff_freq))
        
        # 初始化统计数据
        cursor.execute('''
            INSERT INTO player_stats (player_id)
            VALUES (?)
        ''', (player_id,))
        
        conn.commit()
        conn.close()
        
        print(f"🤖 创建机器人玩家: {nickname} (ID: {player_id}, 等级: {bot_level})")
        return player_id
    
    def get_player(self, player_id: str) -> Optional[Dict]:
        """获取玩家信息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT p.*, ps.total_games, ps.total_winnings, ps.win_rate
            FROM players p
            LEFT JOIN player_stats ps ON p.id = ps.player_id
            WHERE p.id = ? AND p.is_active = 1
        ''', (player_id,))
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        
        player_data = {
            'id': row[0],
            'nickname': row[1],
            'player_type': row[2],
            'chips': row[3],
            'total_hands_played': row[4],
            'total_wins': row[5],
            'total_losses': row[6],
            'created_at': row[7],
            'last_active': row[8],
            'is_active': bool(row[9]),
            'total_games': row[10] or 0,
            'total_winnings': row[11] or 0,
            'win_rate': row[12] or 0.0
        }
        
        # 如果是机器人，获取机器人特定信息
        if player_data['player_type'] == PlayerType.BOT.value:
            cursor.execute('''
                SELECT bot_level, aggression_level, tightness_level, 
                       bluff_frequency, learning_data
                FROM bot_info WHERE player_id = ?
            ''', (player_id,))
            
            bot_row = cursor.fetchone()
            if bot_row:
                player_data.update({
                    'bot_level': bot_row[0],
                    'aggression_level': bot_row[1],
                    'tightness_level': bot_row[2],
                    'bluff_frequency': bot_row[3],
                    'learning_data': json.loads(bot_row[4]) if bot_row[4] else {}
                })
        
        conn.close()
        return player_data
    
    def update_player_chips(self, player_id: str, new_chips: int):
        """更新玩家筹码"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE players 
            SET chips = ?, last_active = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_chips, player_id))
        
        conn.commit()
        conn.close()
        
        print(f"💰 更新玩家筹码: {player_id} -> {new_chips}")
    
    def start_session(self, player_id: str, table_id: str, starting_chips: int) -> int:
        """开始游戏会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO player_sessions (player_id, table_id, starting_chips)
            VALUES (?, ?, ?)
        ''', (player_id, table_id, starting_chips))
        
        session_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"🎮 开始游戏会话: 玩家{player_id} -> 会话{session_id}")
        return session_id
    
    def end_session(self, session_id: int, ending_chips: int, 
                   hands_played: int, hands_won: int):
        """结束游戏会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE player_sessions 
            SET session_end = CURRENT_TIMESTAMP,
                ending_chips = ?,
                hands_played = ?,
                hands_won = ?
            WHERE id = ?
        ''', (ending_chips, hands_played, hands_won, session_id))
        
        # 更新玩家统计
        cursor.execute('''
            SELECT player_id, starting_chips FROM player_sessions WHERE id = ?
        ''', (session_id,))
        
        row = cursor.fetchone()
        if row:
            player_id, starting_chips = row
            winnings = ending_chips - starting_chips
            
            cursor.execute('''
                UPDATE player_stats 
                SET total_games = total_games + 1,
                    total_winnings = total_winnings + ?,
                    biggest_win = MAX(biggest_win, ?),
                    biggest_loss = MIN(biggest_loss, ?),
                    last_updated = CURRENT_TIMESTAMP
                WHERE player_id = ?
            ''', (winnings, max(0, winnings), min(0, winnings), player_id))
            
            # 更新玩家筹码
            cursor.execute('''
                UPDATE players 
                SET chips = ?, 
                    total_hands_played = total_hands_played + ?,
                    total_wins = total_wins + ?,
                    last_active = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (ending_chips, hands_played, hands_won, player_id))
        
        conn.commit()
        conn.close()
        
        print(f"🏁 结束游戏会话: 会话{session_id}")
    
    def get_player_by_nickname(self, nickname: str) -> Optional[Dict]:
        """通过昵称获取玩家"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id FROM players 
            WHERE nickname = ? AND is_active = 1
            ORDER BY last_active DESC
            LIMIT 1
        ''', (nickname,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self.get_player(row[0])
        return None
    
    def get_available_bots(self, level: str = None, limit: int = 10) -> List[Dict]:
        """获取可用的机器人"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT p.id, p.nickname, p.chips, b.bot_level, 
                   b.aggression_level, b.tightness_level
            FROM players p
            JOIN bot_info b ON p.id = b.player_id
            WHERE p.player_type = ? AND p.is_active = 1
        '''
        params = [PlayerType.BOT.value]
        
        if level:
            query += ' AND b.bot_level = ?'
            params.append(level)
        
        query += ' ORDER BY p.last_active DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        bots = []
        for row in rows:
            bots.append({
                'id': row[0],
                'nickname': row[1],
                'chips': row[2],
                'bot_level': row[3],
                'aggression_level': row[4],
                'tightness_level': row[5]
            })
        
        conn.close()
        return bots
    
    def update_bot_learning_data(self, player_id: str, learning_data: Dict):
        """更新机器人学习数据"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE bot_info 
            SET learning_data = ?
            WHERE player_id = ?
        ''', (json.dumps(learning_data), player_id))
        
        conn.commit()
        conn.close()
    
    def cleanup_inactive_players(self, days: int = 30):
        """清理非活跃玩家"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE players 
            SET is_active = 0
            WHERE last_active < datetime('now', '-{} days')
            AND player_type = ?
        '''.format(days), (PlayerType.HUMAN.value,))
        
        cleaned = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"🧹 清理了 {cleaned} 个非活跃玩家")
        return cleaned

# 全局实例
player_persistence = PlayerPersistence()

# 便捷函数
def create_human_player(nickname: str, initial_chips: int = 1000) -> str:
    return player_persistence.create_human_player(nickname, initial_chips)

def create_bot_player(nickname: str, bot_level: str, initial_chips: int = 1000) -> str:
    return player_persistence.create_bot_player(nickname, bot_level, initial_chips)

def get_player(player_id: str) -> Optional[Dict]:
    return player_persistence.get_player(player_id)

def update_player_chips(player_id: str, chips: int):
    return player_persistence.update_player_chips(player_id, chips)

def get_player_by_nickname(nickname: str) -> Optional[Dict]:
    return player_persistence.get_player_by_nickname(nickname)

def get_available_bots(level: str = None, limit: int = 10) -> List[Dict]:
    return player_persistence.get_available_bots(level, limit)
