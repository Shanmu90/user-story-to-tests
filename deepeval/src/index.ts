import express from 'express'
import evalRoutes from './routes/evalRoutes'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', evalRoutes)

const PORT = process.env.DEEPEVAL_PORT || 64625
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Deepeval demo server listening on port ${PORT}`)
})

export default app
