# 🍃 MongoDB Installation Guide for macOS

## Quick Installation (Recommended)

### Method 1: Using Homebrew

```bash
# Step 1: Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Step 2: Add MongoDB tap
brew tap mongodb/brew

# Step 3: Install MongoDB Community Edition
brew install mongodb-community

# Step 4: Start MongoDB service
brew services start mongodb-community

# Step 5: Verify installation
mongosh --version
```

### Method 2: Direct Download

1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: Latest (7.0+)
   - Platform: macOS
   - Package: TGZ
3. Download and extract
4. Add to PATH:
   ```bash
   export PATH="/path/to/mongodb/bin:$PATH"
   ```
5. Create data directory:
   ```bash
   sudo mkdir -p /data/db
   sudo chown -R `id -un` /data/db
   ```
6. Start MongoDB:
   ```bash
   mongod
   ```

### Method 3: Using Docker

```bash
# Pull MongoDB image
docker pull mongo:latest

# Run MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest

# Connect to MongoDB
docker exec -it mongodb mongosh
```

## Verification Steps

### 1. Check if MongoDB is running

```bash
# Check process
ps aux | grep mongod

# Check port
lsof -i :27017

# Or use brew services
brew services list | grep mongodb
```

### 2. Connect to MongoDB

```bash
# Using mongosh
mongosh

# You should see:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017/
# Using MongoDB: 7.x.x
```

### 3. Test connection from Node.js

```bash
cd server
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/test').then(() => console.log('✅ Connected')).catch(err => console.log('❌ Error:', err.message))"
```

## Seed the Database

Once MongoDB is running:

```bash
cd server
npm run seed
```

Expected output:
```
🌱 Starting database seeding...
✅ Connected to MongoDB
✅ Database cleared
✅ Licenses created: 3
✅ Superadmin created
✅ Organization created: EduTech Global
✅ Departments created: 4
✅ Users created: 7
✅ Seeding completed successfully!
```

## Start the ERP System

### Terminal 1: Backend
```bash
cd server
npm run dev
```

### Terminal 2: Frontend
```bash
cd client
npm run dev
```

## Troubleshooting

### Issue: "mongod: command not found"

**Solution**: MongoDB is not in PATH
```bash
# Find MongoDB installation
brew --prefix mongodb-community

# Add to PATH in ~/.zshrc or ~/.bash_profile
export PATH="/opt/homebrew/opt/mongodb-community/bin:$PATH"

# Reload shell
source ~/.zshrc
```

### Issue: "connect ECONNREFUSED 127.0.0.1:27017"

**Solution**: MongoDB is not running
```bash
# Start MongoDB
brew services start mongodb-community

# Or manually
mongod --config /opt/homebrew/etc/mongod.conf
```

### Issue: "Data directory /data/db not found"

**Solution**: Create data directory
```bash
sudo mkdir -p /data/db
sudo chown -R `id -un` /data/db
```

### Issue: "Address already in use"

**Solution**: Port 27017 is occupied
```bash
# Find process using port 27017
lsof -i :27017

# Kill the process
kill -9 <PID>

# Restart MongoDB
brew services restart mongodb-community
```

## MongoDB Configuration

### Default Configuration File
Location: `/opt/homebrew/etc/mongod.conf`

```yaml
systemLog:
  destination: file
  path: /opt/homebrew/var/log/mongodb/mongo.log
  logAppend: true
storage:
  dbPath: /opt/homebrew/var/mongodb
net:
  bindIp: 127.0.0.1
  port: 27017
```

### Custom Configuration for ERP

Create `server/mongod.conf`:

```yaml
systemLog:
  destination: file
  path: ./logs/mongodb.log
  logAppend: true
storage:
  dbPath: ./data/db
  journal:
    enabled: true
net:
  bindIp: 127.0.0.1
  port: 27017
security:
  authorization: enabled
```

## Production Recommendations

### 1. Enable Authentication

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password",
  roles: ["root"]
})

# Create ERP database user
use erp_system
db.createUser({
  user: "erp_user",
  pwd: "erp_password",
  roles: ["readWrite"]
})
```

Update `server/.env`:
```
MONGODB_URI=mongodb://erp_user:erp_password@localhost:27017/erp_system
```

### 2. Enable SSL/TLS

```yaml
# In mongod.conf
net:
  ssl:
    mode: requireSSL
    PEMKeyFile: /path/to/mongodb.pem
```

### 3. Set Up Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --out /backups/mongodb_$DATE

# Add to crontab for daily backups
0 2 * * * /path/to/backup-script.sh
```

### 4. Monitor Performance

```bash
# Enable profiling
mongosh
use erp_system
db.setProfilingLevel(1, { slowms: 100 })

# View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

## MongoDB Atlas (Cloud Alternative)

For production, consider MongoDB Atlas:

1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update `server/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/erp_system
   ```

Benefits:
- Automatic backups
- Scaling
- Monitoring
- Security
- No server maintenance

## Quick Reference

### Start/Stop MongoDB

```bash
# Start
brew services start mongodb-community

# Stop
brew services stop mongodb-community

# Restart
brew services restart mongodb-community

# Status
brew services list | grep mongodb
```

### MongoDB Shell Commands

```bash
# Connect
mongosh

# Show databases
show dbs

# Use database
use erp_system

# Show collections
show collections

# Count documents
db.users.countDocuments()

# Find documents
db.users.find().pretty()

# Drop database (careful!)
db.dropDatabase()
```

## Next Steps

1. ✅ Install MongoDB using one of the methods above
2. ✅ Verify MongoDB is running
3. ✅ Seed the database: `cd server && npm run seed`
4. ✅ Start backend: `cd server && npm run dev`
5. ✅ Start frontend: `cd client && npm run dev`
6. ✅ Run tests: `./test-workflows.sh`
7. ✅ Access application: http://localhost:5173

---

**Need Help?**
- MongoDB Documentation: https://docs.mongodb.com/
- MongoDB Community Forums: https://www.mongodb.com/community/forums/
- Stack Overflow: https://stackoverflow.com/questions/tagged/mongodb
