# OrphanBars Bot Setup Instructions

## 🚀 Quick Start

### **1. Configure the Bot**
Edit `orphanbars_bot.py` and set:
```python
GROK_API_KEY = "your_actual_grok_api_key_here"  # Line ~20
```

### **2. Install Dependencies**
```bash
pip install requests
```

### **3. Run the Bot**
```bash
python orphanbars_bot.py
```

For background execution:
```bash
# Using nohup
nohup python orphanbars_bot.py > bot.log 2>&1 &

# Using screen
screen -S orphanbars
python orphanbars_bot.py
# Ctrl+A, D to detach

# Using tmux
tmux new-session -d -s orphanbars 'python orphanbars_bot.py'
```

## 📋 Configuration Details

### **API Keys Required**
- **xAI Grok API Key**: Get from https://console.x.ai/
- **No OrphanBars API key needed** (uses regular login)

### **Fake Accounts (15 pre-configured)**
```
@WordplayWizard, @PunchlinePhantom, @RhymeRanger, @MetaphorMage, @FlowFiend,
@BarBandit, @SyllableSlayer, @VerseVandal, @HookHustler, @CadenceCriminal,
@BeatBreaker, @RapRenegade, @LyricLooter, @MeterMarauder, @RhythmRogue
```

All use password: `secretpass123` (change if needed)

## 🔧 Important TODO Before Running

### **1. Verify Lock Field Name**
The bot uses `"lock_immediately": True` but you should verify the exact field name:

1. **Manually post a locked bar** on OrphanBars
2. **Open browser Network tab** (F12 → Network)
3. **Copy the POST request JSON** for the bar creation
4. **Find the lock checkbox field name** - it might be:
   - `lock_immediately: true`
   - `lock_bar: true` 
   - `claim_original: true`
   - `permanent: true`
   - `lock: true`

5. **Update line ~280** in the bot script:
```python
data = {
    "content": content,
    "lock_immediately": True,  # <-- CHANGE THIS IF NEEDED
    "tags": [],
    "type": "single_bar"
}
```

### **2. Verify API Endpoints**
The bot uses these endpoints - verify they exist:
- `POST /api/login` ✅ (should work)
- `GET /api/bars?limit=20&sort=recent` ✅ (should work)
- `POST /api/bars` ❓ (verify this exists)
- `POST /api/comments` ❓ (verify this exists)

If endpoints differ, update the BASE_URL and function calls.

## 📊 Bot Behavior

### **Volume Limits**
- **New bars**: Max 3 per day total (resets midnight UTC)
- **Total actions**: 3-8 per hour site-wide
- **Per-account cooldown**: 45-90 minutes

### **Action Distribution**
- **40% chance**: New original bar (if daily cap not hit)
- **50% chance**: Comment on random existing bar
- **10% chance**: Skip action

### **Activity Pattern**
- **Sleep cycles**: 1.5-3 hours between actions
- **Account selection**: 50% none, 30% one account, 20% two accounts
- **Random delays**: 10-60 seconds before actions
- **User-Agent rotation**: 5 different browser signatures

### **Content Style**
- **New bars**: Original rap content, 1-4 lines, #tags, occasional typos/emoji
- **Comments**: Short reactions (<20 words), slang, wordplay
- **AI model**: xAI Grok with temperature 0.8

## 🔍 Monitoring

### **Log Output**
The bot prints real-time activity:
```
@PunchlinePhantom dropped locked OC bar: 'Wordplay wizardry, lyrical alchemy 🔥 #wordplay #fire' #fire (proof generated)
@RhymeRanger commented on bar: 'That's heat 🔥 straight bars'
📊 Daily bars: 1/3 | Hourly actions: 2/8
😴 Sleeping for 2.3 hours...
```

### **State File**
`bot_state.json` tracks:
- Daily bar counts
- Last action timestamps  
- Account cooldowns
- Auth tokens

### **Safety Features**
- **Rate limiting**: Respects hourly/daily caps
- **Error handling**: Retry logic with exponential backoff
- **Stealth**: Random delays, User-Agent rotation
- **State persistence**: Survives restarts

## ⚠️ Important Warnings

### **Test First!**
1. **Start with 3-5 accounts** (comment out others in FAKE_ACCOUNTS)
2. **Monitor for 24 hours** before full deployment
3. **Check OrphanBars ToS** for automation rules
4. **Watch rate limits** - reduce volume if flagged

### **API Key Security**
- **Never commit API keys** to git
- **Use environment variables** in production:
```python
import os
GROK_API_KEY = os.getenv('GROK_API_KEY', 'your_key_here')
```

### **Backup State**
- **Copy bot_state.json** before major changes
- **Monitor log files** for unusual activity
- **Have kill switch ready**: `pkill -f orphanbars_bot.py`

## 🚨 Troubleshooting

### **Common Issues**

**Login Failures**:
- Check account credentials
- Verify OrphanBars is accessible
- Try manual login first

**API Errors**:
- Verify endpoint URLs
- Check request JSON format
- Look at browser Network tab

**Rate Limiting**:
- Increase sleep times
- Reduce active accounts
- Monitor hourly action count

**Grok API Issues**:
- Verify API key is valid
- Check xAI service status
- Add fallback to OpenAI if needed

### **Debug Mode**
Add debug prints by modifying logging:
```python
print(f"DEBUG: Posting to {BASE_URL}/bars")
print(f"DEBUG: Data: {json.dumps(data, indent=2)}")
```

## 📈 Scaling Up (If Needed)

### **More Accounts**
Add to `FAKE_ACCOUNTS` list:
```python
{'username': '@NewRapper', 'password': 'password123'},
```

### **Adjust Volume**
Edit constants in `main()`:
```python
# Increase daily limit
if state['daily_bar_count'] < 5:  # Was 3

# Increase hourly limit  
if state['hourly_action_count'] < 12:  # Was 8
```

### **Different AI Models**
Replace `generate_text()` function to use OpenAI, Claude, etc.

## 🎯 Success Indicators

**Healthy Bot**:
- ✅ Regular activity logs
- ✅ No API errors
- ✅ State file updating
- ✅ Bars appearing on site

**Issues**:
- ❌ Repeated login failures
- ❌ Rate limit errors
- ❌ No new content appearing
- ❌ State file not updating

Monitor these indicators for the first 24-48 hours!
