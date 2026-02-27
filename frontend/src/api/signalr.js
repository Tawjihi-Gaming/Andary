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
    if (error) {
      console.error('SignalR connection lost due to error:', error)
    } else {
      console.log('SignalR connection lost, attempting to reconnect...')
    }

  })

  connection.onreconnected((connectionId) => {
    console.log('SignalR reconnected:', connectionId)
  })

  connection.onclose((error) => {
    if (error) {
      console.error('SignalR connection closed with error:', error)
    } else {
      console.log('SignalR connection closed')
    }
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
    } else if (conn.state === signalR.HubConnectionState.Connecting || 
               conn.state === signalR.HubConnectionState.Reconnecting) {
      // Wait for the connection to finish connecting
      await new Promise((resolve, reject) => {
        const maxWait = setTimeout(() => reject(new Error('Connection timeout')), 5000)
        const check = setInterval(() => {
          if (conn.state === signalR.HubConnectionState.Connected) {
            clearInterval(check)
            clearTimeout(maxWait)
            resolve()
          } else if (conn.state === signalR.HubConnectionState.Disconnected) {
            clearInterval(check)
            clearTimeout(maxWait)
            reject(new Error('Connection failed'))
          }
        }, 50)
      })
      console.log('✅ SignalR connected (waited):', conn.connectionId)
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
