import * as signalR from '@microsoft/signalr'

let connection = null

// Create and configure the SignalR connection
export const createConnection = () => {
  if (connection) return connection

  connection = new signalR.HubConnectionBuilder()
    .withUrl('/gamehub', {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build()

  // Handle reconnection events
  connection.onreconnecting((error) => {
    console.warn('SignalR reconnecting...', error)
  })

  connection.onreconnected((connectionId) => {
    console.log('SignalR reconnected:', connectionId)
  })

  connection.onclose((error) => {
    console.error('SignalR connection closed:', error)
  })

  return connection
}

// Start the connection
export const startConnection = async () => {
  try {
    const conn = createConnection()
    if (conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start()
      console.log('✅ SignalR connected:', conn.connectionId)
    }
    return conn
  } catch (err) {
    console.error('❌ SignalR connection error:', err)
    throw err
  }
}

// Stop the connection
export const stopConnection = async () => {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop()
    console.log('SignalR disconnected')
  }
}

// Get the current connection
export const getConnection = () => connection

export default { createConnection, startConnection, stopConnection, getConnection }

