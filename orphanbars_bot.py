#!/usr/bin/env python3
"""
OrphanBars Background Simulation Bot
Revives low-activity on orphanbars.space with realistic hip-hop content
Ultra-low volume: max 3 bars/day + 3-8 actions/hour
"""

import requests
import json
import time
import random
import datetime
import os
from typing import Dict, List, Optional, Tuple

# ===== CONFIGURATION =====
BASE_URL = "https://orphanbars.space/api"
GROK_API_KEY = "your_grok_api_key_here"  # TODO: Set your xAI Grok API key
BOT_STATE_FILE = "bot_state.json"

# Fake user accounts (hip-hop themed)
FAKE_ACCOUNTS = [
    {'username': '@WordplayWizard', 'password': 'secretpass123'},
    {'username': '@PunchlinePhantom', 'password': 'secretpass123'},
    {'username': '@RhymeRanger', 'password': 'secretpass123'},
    {'username': '@MetaphorMage', 'password': 'secretpass123'},
    {'username': '@FlowFiend', 'password': 'secretpass123'},
    {'username': '@BarBandit', 'password': 'secretpass123'},
    {'username': '@SyllableSlayer', 'password': 'secretpass123'},
    {'username': '@VerseVandal', 'password': 'secretpass123'},
    {'username': '@HookHustler', 'password': 'secretpass123'},
    {'username': '@CadenceCriminal', 'password': 'secretpass123'},
    {'username': '@BeatBreaker', 'password': 'secretpass123'},
    {'username': '@RapRenegade', 'password': 'secretpass123'},
    {'username': '@LyricLooter', 'password': 'secretpass123'},
    {'username': '@MeterMarauder', 'password': 'secretpass123'},
    {'username': '@RhythmRogue', 'password': 'secretpass123'}
]

# User-Agent rotation for stealth
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0"
]

# ===== STATE MANAGEMENT =====
def load_state() -> Dict:
    """Load bot state from file"""
    default_state = {
        'daily_bar_count': 0,
        'last_reset_date': datetime.datetime.utcnow().date().isoformat(),
        'hourly_action_count': 0,
        'last_hour_reset': datetime.datetime.utcnow().hour,
        'accounts': {}
    }
    
    for account in FAKE_ACCOUNTS:
        default_state['accounts'][account['username']] = {
            'last_action_timestamp': None,
            'last_checked_time': None,
            'auth_token': None,
            'daily_bar_count': 0
        }
    
    try:
        if os.path.exists(BOT_STATE_FILE):
            with open(BOT_STATE_FILE, 'r') as f:
                state = json.load(f)
                # Merge with default for new accounts
                for username in default_state['accounts']:
                    if username not in state.get('accounts', {}):
                        state['accounts'][username] = default_state['accounts'][username]
                return state
    except:
        pass
    
    return default_state

def save_state(state: Dict):
    """Save bot state to file"""
    try:
        with open(BOT_STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Error saving state: {e}")

# ===== AI CONTENT GENERATION =====
def generate_text(prompt: str, api_key: str) -> Optional[str]:
    """Generate text using xAI Grok API"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "grok-beta",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 150,
        "temperature": 0.8
    }
    
    try:
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            print(f"Grok API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Error calling Grok API: {e}")
        return None

def generate_new_bar() -> Optional[str]:
    """Generate original rap bar content"""
    prompt = """Generate fully original orphan rap bar/punchline as hip-hop writer with Asperger's wordplay edge. Raw/gritty/motivational, 1-4 lines, 1-3 #tags (#wordplay #grind #fire). Slang/humor/rare typo/emoji. 100% original—no existing lines/copies."""
    
    content = generate_text(prompt, GROK_API_KEY)
    if content:
        # Add some realistic variation
        if random.random() < 0.1:  # 10% chance of typo
            content = content.replace('wordplay', 'wordpaly')
        if random.random() < 0.2:  # 20% chance of emoji
            content += random.choice([' 🔥', ' 💯', ' ⚡', ' 🚀'])
    
    return content

def generate_comment(bar_text: str, bar_snippet: str) -> Optional[str]:
    """Generate comment/reply to existing bar"""
    prompt = f"""Short rap reaction/reply as hip-hop head. Slang/wordplay/#tags/humor. Reply to "{bar_text}" on bar "{bar_snippet}". <20 words."""
    
    return generate_text(prompt, GROK_API_KEY)

# ===== API INTERACTIONS =====
def login(username: str, password: str) -> Optional[str]:
    """Login and return auth token"""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": random.choice(USER_AGENTS)
    }
    
    data = {
        "username": username,
        "password": password
    }
    
    for attempt in range(3):  # 3 retry attempts
        try:
            response = requests.post(
                f"{BASE_URL}/login",
                headers=headers,
                json=data,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('auth_token')
            else:
                print(f"Login failed for {username}: {response.status_code}")
                time.sleep(random.uniform(1, 3))  # Backoff
                
        except Exception as e:
            print(f"Login error for {username}: {e}")
            time.sleep(random.uniform(1, 3))
    
    return None

def fetch_recent_bars(auth_token: str, limit: int = 20) -> List[Dict]:
    """Fetch recent bars for commenting"""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "User-Agent": random.choice(USER_AGENTS)
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/bars?limit={limit}&sort=recent",
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching bars: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"Error fetching bars: {e}")
        return []

def post_new_bar(auth_token: str, content: str) -> bool:
    """Post a new bar with lock_immediately=true"""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
        "User-Agent": random.choice(USER_AGENTS)
    }
    
    # TODO: Verify exact field names - these are likely correct based on typical APIs
    data = {
        "content": content,
        "lock_immediately": True,  # This triggers SHA256 hash/certificate
        "tags": [],  # Tags are included in content with # format
        "type": "single_bar"  # Or "snippet" - adjust as needed
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/bars",
            headers=headers,
            json=data,
            timeout=15
        )
        
        if response.status_code in [200, 201]:
            return True
        else:
            print(f"Error posting bar: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"Error posting bar: {e}")
        return False

def post_comment(auth_token: str, bar_id: str, content: str) -> bool:
    """Post a comment on a bar"""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
        "User-Agent": random.choice(USER_AGENTS)
    }
    
    data = {
        "bar_id": bar_id,
        "content": content
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/comments",
            headers=headers,
            json=data,
            timeout=15
        )
        
        if response.status_code in [200, 201]:
            return True
        else:
            print(f"Error posting comment: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"Error posting comment: {e}")
        return False

# ===== MAIN BOT LOGIC =====
def should_reset_daily_count(state: Dict) -> bool:
    """Check if we should reset daily bar count"""
    today = datetime.datetime.utcnow().date().isoformat()
    return state['last_reset_date'] != today

def should_reset_hourly_count(state: Dict) -> bool:
    """Check if we should reset hourly action count"""
    current_hour = datetime.datetime.utcnow().hour
    return state['last_hour_reset'] != current_hour

def get_random_active_accounts(state: Dict) -> List[str]:
    """Select random number of active accounts for this cycle"""
    # 50% chance: 0 accounts, 30%: 1 account, 20%: 2 accounts
    rand = random.random()
    if rand < 0.5:
        return []
    elif rand < 0.8:
        return [random.choice(FAKE_ACCOUNTS)['username']]
    else:
        return random.sample([acc['username'] for acc in FAKE_ACCOUNTS], 2)

def can_account_act(account_state: Dict, min_cooldown_minutes: int = 45) -> bool:
    """Check if account can act based on cooldown"""
    if not account_state.get('last_action_timestamp'):
        return True
    
    last_action = datetime.datetime.fromisoformat(account_state['last_action_timestamp'])
    cooldown_delta = datetime.timedelta(minutes=random.randint(min_cooldown_minutes, min_cooldown_minutes + 45))
    
    return datetime.datetime.utcnow() - last_action > cooldown_delta

def perform_action(username: str, state: Dict) -> bool:
    """Perform a single action for an account"""
    account_state = state['accounts'][username]
    auth_token = account_state.get('auth_token')
    
    # Login if needed
    if not auth_token:
        account_info = next(acc for acc in FAKE_ACCOUNTS if acc['username'] == username)
        auth_token = login(account_info['username'], account_info['password'])
        
        if not auth_token:
            print(f"Failed to login {username}")
            return False
        
        account_state['auth_token'] = auth_token
        time.sleep(random.uniform(2, 5))  # Post-login delay
    
    # Weighted action selection
    action_rand = random.random()
    
    # 40% chance: New bar (if daily cap not hit)
    if action_rand < 0.4 and state['daily_bar_count'] < 3:
        content = generate_new_bar()
        if content:
            success = post_new_bar(auth_token, content)
            if success:
                state['daily_bar_count'] += 1
                account_state['daily_bar_count'] += 1
                print(f"@{username} dropped locked OC bar: '{content}' #fire (proof generated)")
                return True
    
    # 50% chance: Comment on random bar
    elif action_rand < 0.9:
        bars = fetch_recent_bars(auth_token, limit=20)
        if bars:
            bar = random.choice(bars)
            bar_snippet = bar.get('content', '')[:50] + '...' if len(bar.get('content', '')) > 50 else bar.get('content', '')
            comment = generate_comment(bar.get('content', ''), bar_snippet)
            
            if comment:
                success = post_comment(auth_token, bar['id'], comment)
                if success:
                    print(f"@{username} commented on bar: '{comment}'")
                    return True
    
    # 10% chance: Skip action
    else:
        print(f"@{username} skipped action (10% chance)")
        return True
    
    return False

def main():
    """Main bot loop"""
    print("🎤 OrphanBars Bot Starting Up...")
    print(f"📊 {len(FAKE_ACCOUNTS)} fake accounts loaded")
    print(f"🔧 Grok API: {'✅' if GROK_API_KEY != 'your_grok_api_key_here' else '❌ Set API key!'}")
    
    state = load_state()
    
    while True:
        try:
            # Reset counters if needed
            if should_reset_daily_count(state):
                state['daily_bar_count'] = 0
                state['last_reset_date'] = datetime.datetime.utcnow().date().isoformat()
                print("📅 Daily bar count reset")
            
            if should_reset_hourly_count(state):
                state['hourly_action_count'] = 0
                state['last_hour_reset'] = datetime.datetime.utcnow().hour
                print("⏰ Hourly action count reset")
            
            # Check hourly action limit (max 8 actions/hour)
            if state['hourly_action_count'] >= 8:
                print("⚠️ Hourly action limit reached, waiting...")
                time.sleep(3600)  # Wait 1 hour
                continue
            
            # Get random active accounts for this cycle
            active_accounts = get_random_active_accounts(state)
            
            if not active_accounts:
                print("💤 No active accounts this cycle (50% chance)")
            else:
                print(f"🎯 Active accounts this cycle: {active_accounts}")
                
                for username in active_accounts:
                    if state['hourly_action_count'] >= 8:
                        print("⚠️ Hourly limit hit during cycle")
                        break
                    
                    account_state = state['accounts'][username]
                    
                    if can_account_act(account_state):
                        # Random delay before action (10-60 seconds)
                        time.sleep(random.uniform(10, 60))
                        
                        success = perform_action(username, state)
                        if success:
                            state['hourly_action_count'] += 1
                            account_state['last_action_timestamp'] = datetime.datetime.utcnow().isoformat()
                            
                            # Random delay after action
                            time.sleep(random.uniform(5, 15))
                    else:
                        print(f"⏳ @{username} still on cooldown")
            
            # Save state
            save_state(state)
            
            # Log current stats
            print(f"📊 Daily bars: {state['daily_bar_count']}/3 | Hourly actions: {state['hourly_action_count']}/8")
            
            # Sleep until next cycle (1.5-3 hours)
            sleep_time = random.uniform(5400, 10800)
            print(f"😴 Sleeping for {sleep_time/3600:.1f} hours...")
            time.sleep(sleep_time)
            
        except KeyboardInterrupt:
            print("\n🛑 Bot stopped by user")
            save_state(state)
            break
        except Exception as e:
            print(f"💥 Error in main loop: {e}")
            time.sleep(300)  # Wait 5 minutes on error
            save_state(state)

if __name__ == "__main__":
    main()
