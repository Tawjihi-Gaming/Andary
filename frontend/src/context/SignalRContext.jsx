import { createContext, useContext, useCallback } from "react";
import {
  startConnection as rawStart,
  stopConnection as rawStop,
  getConnection,
} from '../api/signalr'

const SignalRContext = createContext(null)

export const SignalRProvider = ({ children }) => {
  const startConnection = useCallback(async () => {
    const conn = await rawStart()
    return conn
  }, [])

  const stopConnection = useCallback(async () => {
    await rawStop()
  }, [])

  return (
    <SignalRContext.Provider value={{ startConnection, stopConnection, getConnection }}>
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
