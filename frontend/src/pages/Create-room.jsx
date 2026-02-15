import {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios' 

const CreateRoom = (isPrivate, questions) => {
  const [roomName, setRoomName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/room/create', { 
        isPrivate: isPrivate, 
        questions: questions 
      })
      console.log('Room created:', response.data)
      const { roomId, code } = response.data
      
      // Navigate to the room
      navigate(`/room/${roomId}`, {
        state: { roomId, code }
      })
    } catch (err) {
      console.error('Error creating room:', err)
      setError('Failed to create room. Please try again.')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Create a New Room</h1>
      <form onSubmit={handleCreateRoom} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <input
          type="text"
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition duration-200"
        >
          Create Room
        </button>
      </form>
    </div>
  )
}

export default CreateRoom
