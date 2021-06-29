import { Server } from 'socket.io'

const io = new Server()

const reserved = [
  'connect',
  'connect_error',
  'disconnect',
  'disconnecting',
  'newListener',
  'removeListener',
]

io.on('connection', async (socket) => {
  socket.onAny((eventName, data) => {
    if (reserved.includes(eventName))
      return

    // socket.
    // socket.emit(eventName, data)
    socket.broadcast.emit(eventName, data)
  })
})

io.listen(4000, {
  cors: {
    origin: '*'
  }
})
