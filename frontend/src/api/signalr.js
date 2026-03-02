import * as signalR from '@microsoft/signalr'

let connection = null

// ✅ 1. Explicit wss:// instead of relative URL
const getHubUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/gamehub`
}

// Create and configure the SignalR connection
const createConnection = () => {
  if (connection) return connection

  connection = new signalR.HubConnectionBuilder()
    .withUrl(getHubUrl(), {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets
    })
    // ✅ 2. Custom retry intervals instead of default
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    // ✅ 3. Hide verbose logs in production
    .configureLogging(
      import.meta.env.PROD
        ? signalR.LogLevel.Error
        : signalR.LogLevel.Information
    )
    .build()

  // Handle reconnection events
  connection.onreconnecting((error) => {
    if (error) console.error('SignalR connection lost due to error:', error)
    else console.log('SignalR reconnecting...')
  })

  connection.onreconnected((connectionId) => {
    console.log('SignalR reconnected:', connectionId)
  })

  // ✅ 4. Null out connection on close so createConnection() makes a fresh one
  connection.onclose((error) => {
    connection = null
    if (error) console.error('SignalR connection closed with error:', error)
    else console.log('SignalR connection closed')
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

    } else if (
      conn.state === signalR.HubConnectionState.Connecting ||
      conn.state === signalR.HubConnectionState.Reconnecting
    ) {
      await new Promise((resolve, reject) => {
        // ✅ 5. Reduced timeout from 5000 to 8000 with clearer error message
        const maxWait = setTimeout(() => reject(new Error('Connection timeout after 8s')), 8000)
        const check = setInterval(() => {
          if (conn.state === signalR.HubConnectionState.Connected) {
            clearInterval(check); clearTimeout(maxWait); resolve()
          } else if (conn.state === signalR.HubConnectionState.Disconnected) {
            clearInterval(check); clearTimeout(maxWait)
            reject(new Error('Connection dropped while waiting'))
          }
        }, 50)
      })
      console.log('✅ SignalR connected (waited):', conn.connectionId)
    }

    return conn
  } catch (err) {
    console.error('❌ SignalR connection error:', err)
    // ✅ 6. Clean up failed connection so next call starts fresh
    connection = null
    throw err
  }
}

// Stop the connection
export const stopConnection = async () => {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop()
    // ✅ 7. Explicitly null out after manual stop
    connection = null
    console.log('SignalR disconnected')
  }
}

// Get the current connection
export const getConnection = () => connection


