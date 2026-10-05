#!/usr/bin/env python3
"""
游戏日志记录系统
记录所有牌局、动作和事件到数据库
"""

import sqlite3
import json
import time
from runtime_paths import data_file
from datetime import datetime
from typing import Dict, List, Optional, Any

class GameLogger:
    """游戏日志记录器"""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or data_file('game_logs.db')
        self.init_database()
    
    def get_connection(self):
        """获取数据库连接的上下文管理器"""
        return sqlite3.connect(self.db_path)
    
    def init_database(self):
        """初始化数据库表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 游戏会话表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id TEXT NOT NULL,
                table_title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                status TEXT DEFAULT 'active',
                player_count INTEGER,
                bot_count INTEGER,
                total_hands INTEGER DEFAULT 0,
                metadata TEXT
            )
        ''')
        
        # 手牌记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS hands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                hand_number INTEGER,
                table_id TEXT NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                status TEXT DEFAULT 'active',
                stage TEXT,
                pot INTEGER DEFAULT 0,
                current_bet INTEGER DEFAULT 0,
                community_cards TEXT,
                winner_id TEXT,
                winner_nickname TEXT,
                winning_amount INTEGER,
                metadata TEXT,
                FOREIGN KEY (session_id) REFERENCES game_sessions (id)
            )
        ''')
        
        # 玩家动作记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS player_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hand_id INTEGER,
                player_id TEXT NOT NULL,
                player_nickname TEXT,
                action_type TEXT NOT NULL,
                amount INTEGER DEFAULT 0,
                stage TEXT,
                position INTEGER,
                hole_cards TEXT,
                chips_before INTEGER,
                chips_after INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT,
                FOREIGN KEY (hand_id) REFERENCES hands (id)
            )
        ''')
        
        # 游戏事件记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS game_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        print(f"📊 游戏日志数据库初始化完成: {self.db_path}")
    
    def start_game_session(self, table_id: str, table_title: str, 
                          player_count: int, bot_count: int, metadata: Dict = None) -> int:
        """开始游戏会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO game_sessions (table_id, table_title, player_count, bot_count, metadata)
            VALUES (?, ?, ?, ?, ?)
        ''', (table_id, table_title, player_count, bot_count, json.dumps(metadata or {})))
        
        session_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"🎮 游戏会话开始: {table_title} (ID: {session_id})")
        return session_id
    
    def end_game_session(self, session_id: int, total_hands: int):
        """结束游戏会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE game_sessions 
            SET ended_at = CURRENT_TIMESTAMP, status = 'completed', total_hands = ?
            WHERE id = ?
        ''', (total_hands, session_id))
        
        conn.commit()
        conn.close()
        
        print(f"🏁 游戏会话结束: {session_id}, 总手牌数: {total_hands}")
    
    def start_hand(self, session_id: int, hand_number: int, table_id: str, 
                   stage: str = 'pre_flop', metadata: Dict = None) -> int:
        """开始新手牌"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO hands (session_id, hand_number, table_id, stage, metadata)
            VALUES (?, ?, ?, ?, ?)
        ''', (session_id, hand_number, table_id, stage, json.dumps(metadata or {})))
        
        hand_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"🃏 手牌#{hand_number}开始 (Hand ID: {hand_id})")
        return hand_id
    
    def end_hand(self, hand_id: int, winner_id: str = None, winner_nickname: str = None, 
                winning_amount: int = 0, final_pot: int = 0, community_cards: List = None,
                showdown_info: Dict = None):
        """结束手牌，记录详细的摊牌信息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 基本手牌结束信息
        cursor.execute('''
            UPDATE hands 
            SET ended_at = CURRENT_TIMESTAMP, status = 'completed',
                winner_id = ?, winner_nickname = ?, winning_amount = ?, 
                pot = ?, community_cards = ?, showdown_info = ?
            WHERE id = ?
        ''', (winner_id, winner_nickname, winning_amount, final_pot, 
              json.dumps(community_cards or []), json.dumps(showdown_info or {}), hand_id))
        
        # 如果有详细的摊牌信息，记录到专门的摊牌表
        if showdown_info and showdown_info.get('is_showdown') and showdown_info.get('showdown_players'):
            self._record_showdown_details(hand_id, showdown_info)
        
        conn.commit()
        conn.close()
        
        if winner_nickname:
            win_reason = ""
            if showdown_info:
                if showdown_info.get('win_reason') == 'others_folded':
                    win_reason = "（其他玩家弃牌）"
                elif showdown_info.get('win_reason') == 'best_hand':
                    win_reason = "（摊牌获胜）"
            print(f"🏆 手牌结束: {winner_nickname} 获胜 ${winning_amount} {win_reason}")
        else:
            print(f"🏁 手牌结束 (Hand ID: {hand_id})")
    
    def _record_showdown_details(self, hand_id: int, showdown_info: Dict):
        """记录详细的摊牌信息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建摊牌详细记录表（如果不存在）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS showdown_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hand_id INTEGER NOT NULL,
                player_id TEXT NOT NULL,
                nickname TEXT NOT NULL,
                is_bot BOOLEAN NOT NULL,
                hole_cards TEXT NOT NULL,
                hand_rank TEXT NOT NULL,
                hand_description TEXT NOT NULL,
                rank_position INTEGER NOT NULL,
                result TEXT NOT NULL,
                winnings INTEGER NOT NULL,
                final_chips INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hand_id) REFERENCES hands (id)
            )
        ''')
        
        # 插入每个玩家的摊牌详情
        for player_info in showdown_info.get('showdown_players', []):
            cursor.execute('''
                INSERT INTO showdown_details (
                    hand_id, player_id, nickname, is_bot,
                    hole_cards, hand_rank, hand_description,
                    rank_position, result, winnings, final_chips
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                hand_id,
                player_info['player_id'],
                player_info['nickname'],
                player_info['is_bot'],
                json.dumps(player_info['hole_cards']),
                player_info['hand_name'],
                player_info['hand_description'],
                player_info['rank'],
                player_info['result'],
                player_info['winnings'],
                player_info['final_chips']
            ))
        
        conn.commit()
        conn.close()
        print(f"📝 摊牌详情已记录 (Hand ID: {hand_id}, 参与玩家: {len(showdown_info.get('showdown_players', []))})")
        
    def get_hand_showdown_details(self, hand_id: int) -> List[Dict]:
        """获取某手牌的详细摊牌信息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM showdown_details 
            WHERE hand_id = ?
            ORDER BY rank_position ASC
        ''', (hand_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        details = []
        for row in rows:
            details.append({
                'id': row[0],
                'hand_id': row[1],
                'player_id': row[2],
                'nickname': row[3],
                'is_bot': bool(row[4]),
                'hole_cards': json.loads(row[5]),
                'hand_rank': row[6],
                'hand_description': row[7],
                'rank_position': row[8],
                'result': row[9],
                'winnings': row[10],
                'final_chips': row[11],
                'created_at': row[12]
            })
        
        return details
    
    def log_player_action(self, hand_id: int, player_id: str, player_nickname: str,
                         action_type: str, amount: int = 0, stage: str = None,
                         position: int = None, hole_cards: List = None,
                         chips_before: int = None, chips_after: int = None,
                         metadata: Dict = None):
        """记录玩家动作"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO player_actions 
            (hand_id, player_id, player_nickname, action_type, amount, stage, 
             position, hole_cards, chips_before, chips_after, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (hand_id, player_id, player_nickname, action_type, amount, stage,
              position, json.dumps(hole_cards or []), chips_before, chips_after,
              json.dumps(metadata or {})))
        
        conn.commit()
        conn.close()
        
        print(f"📝 动作记录: {player_nickname} {action_type} ${amount}")
    
    def log_game_event(self, table_id: str, event_type: str, event_data: Dict = None):
        """记录游戏事件"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO game_events (table_id, event_type, event_data)
            VALUES (?, ?, ?)
        ''', (table_id, event_type, json.dumps(event_data or {})))
        
        conn.commit()
        conn.close()
        
        print(f"📡 事件记录: {event_type}")
    
    def update_hand_stage(self, hand_id: int, stage: str, pot: int = None, 
                         current_bet: int = None, community_cards: List = None):
        """更新手牌阶段"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        update_fields = ['stage = ?']
        values = [stage]
        
        if pot is not None:
            update_fields.append('pot = ?')
            values.append(pot)
        
        if current_bet is not None:
            update_fields.append('current_bet = ?')
            values.append(current_bet)
        
        if community_cards is not None:
            update_fields.append('community_cards = ?')
            values.append(json.dumps(community_cards))
        
        values.append(hand_id)
        
        cursor.execute(f'''
            UPDATE hands SET {', '.join(update_fields)}
            WHERE id = ?
        ''', values)
        
        conn.commit()
        conn.close()
        
        print(f"🔄 手牌阶段更新: {stage}")
    
    def get_session_stats(self, session_id: int) -> Dict:
        """获取会话统计"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 基本会话信息
        cursor.execute('SELECT * FROM game_sessions WHERE id = ?', (session_id,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return {}
        
        # 手牌统计
        cursor.execute('''
            SELECT COUNT(*) as total_hands,
                   COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_hands
            FROM hands WHERE session_id = ?
        ''', (session_id,))
        hand_stats = cursor.fetchone()
        
        # 玩家动作统计
        cursor.execute('''
            SELECT action_type, COUNT(*) as count
            FROM player_actions pa
            JOIN hands h ON pa.hand_id = h.id
            WHERE h.session_id = ?
            GROUP BY action_type
        ''', (session_id,))
        action_stats = dict(cursor.fetchall())
        
        conn.close()
        
        return {
            'session_info': dict(zip([col[0] for col in cursor.description], session)),
            'hand_stats': dict(zip(['total_hands', 'completed_hands'], hand_stats)),
            'action_stats': action_stats
        }
    
    def get_recent_games(self, limit: int = 10) -> List[Dict]:
        """获取最近的游戏记录"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT gs.*, 
                   COUNT(h.id) as total_hands,
                   COUNT(CASE WHEN h.status = 'completed' THEN 1 END) as completed_hands
            FROM game_sessions gs
            LEFT JOIN hands h ON gs.id = h.session_id
            GROUP BY gs.id
            ORDER BY gs.created_at DESC
            LIMIT ?
        ''', (limit,))
        
        columns = [col[0] for col in cursor.description]
        games = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return games

# 全局日志记录器实例
game_logger = GameLogger()

def log_table_created(table_id: str, title: str, player_count: int, bot_count: int):
    """记录牌桌创建"""
    return game_logger.start_game_session(table_id, title, player_count, bot_count)

def log_hand_started(session_id: int, hand_number: int, table_id: str):
    """记录手牌开始"""
    return game_logger.start_hand(session_id, hand_number, table_id)

def log_hand_ended(hand_id: int, winner_id: str = None, winner_nickname: str = None, 
                  winning_amount: int = 0, final_pot: int = 0, community_cards: List = None,
                  showdown_info: Dict = None):
    """记录手牌结束"""
    game_logger.end_hand(hand_id, winner_id, winner_nickname, winning_amount, final_pot, 
                        community_cards, showdown_info)

def log_player_action(hand_id: int, player_id: str, nickname: str, action: str, 
                     amount: int = 0, stage: str = None, chips_before: int = None, 
                     chips_after: int = None):
    """记录玩家动作"""
    game_logger.log_player_action(hand_id, player_id, nickname, action, amount, 
                                 stage, None, None, chips_before, chips_after)

def log_stage_change(hand_id: int, stage: str, pot: int, current_bet: int, community_cards: List):
    """记录阶段变化"""
    game_logger.update_hand_stage(hand_id, stage, pot, current_bet, community_cards)
