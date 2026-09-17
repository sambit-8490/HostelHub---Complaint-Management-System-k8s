require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const ssm = new SSMClient({ region: process.env.AWS_REGION || 'eu-west-2' })

async function getConfig() {
  const command = new GetParametersCommand({
    Names: ['/hostelhub/mongo-uri', '/hostelhub/jwt-secret'],
    WithDecryption: true
  })
  const res = await ssm.send(command)
  const params = {}
  res.Parameters.forEach(p => { params[p.Name] = p.Value })

  if (!params['/hostelhub/mongo-uri'] || !params['/hostelhub/jwt-secret']) {
    throw new Error('Missing required parameters in SSM')
  }
  return params
}

async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const cfg = await getConfig()
      process.env.JWT_SECRET = cfg['/hostelhub/jwt-secret']
      await mongoose.connect(cfg['/hostelhub/mongo-uri'])
      console.log('✅ MongoDB connected')
      return
    } catch (err) {
      console.error(`❌ Startup failed (attempt ${i})`, err.message)
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

// ---- Health check routes ----

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend',
    uptime: process.uptime()
  })
})

app.get('/health/db', (req, res) => {
  const state = mongoose.connection.readyState // 1 = connected
  if (state === 1) {
    return res.status(200).json({ status: 'ok', database: 'connected' })
  }
  res.status(500).json({ status: 'error', database: 'disconnected' })
})

const authRoutes = require('./routes/auth')
const studentRoutes = require('./routes/students')
const wardenRoutes = require('./routes/wardens')
const workerRoutes = require('./routes/workers')
const complaintRoutes = require('./routes/complaints')

app.use('/auth', authRoutes)
app.use('/students', studentRoutes)
app.use('/warden', wardenRoutes)
app.use('/workers', workerRoutes)
app.use('/complaints', complaintRoutes)

const PORT = 5000

;(async () => {
  try {
    await connectWithRetry()
    app.listen(PORT, () => console.log('🚀 Server running on', PORT))
  } catch (err) {
    console.error('❌ App failed to start:', err)
    process.exit(1)
  }
})()
