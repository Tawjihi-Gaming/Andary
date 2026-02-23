import { createContext, useContext, useState, useCallback } from "react";
import {
  startConnection as rawStart,
  stopConnection as rawStop,
  getConnection,
} from '../api/signalr'

const SignalRContext = createContext(null)

export const SignalRProvider = ({ children }) => {
  const [connection, setConnection] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const startConnection = useCallback(async () => {
    const conn = await rawStart()
    setConnection(conn)
    setIsConnected(true)
    return conn
  }, [])

  const stopConnection = useCallback(async () => {
    await rawStop()
    setConnection(null)
    setIsConnected(false)
  }, [])

  return (
    <SignalRContext.Provider value={{ connection, isConnected, startConnection, stopConnection, getConnection }}>
      {children}
    </SignalRContext.Provider>
  )
}

export const useSignalR = () => {
  const context = useContext(SignalRContext)
  if (!context) {
    throw new Error('useSignalR must be used within a SignalRProvider')
  }
  return context
}
