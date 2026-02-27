import api from './axios'

// Get all friends
export const getFriends = () => api.get('/friends')

// Send a friend request
export const sendFriendRequest = (receiverId) =>
  api.post('/friends/requests', { receiverId })

// Cancel a sent friend request
export const cancelFriendRequest = (receiverId) =>
  api.delete(`/friends/requests/${receiverId}`)

// Get incoming friend requests
export const getIncomingRequests = () => api.get('/friends/requests/incoming')

// Get sent friend requests
export const getSentRequests = () => api.get('/friends/requests/sent')

// Accept a friend request
export const acceptFriendRequest = (requestId) =>
  api.post(`/friends/requests/${requestId}/accept`)

// Reject a friend request
export const rejectFriendRequest = (requestId) =>
  api.post(`/friends/requests/${requestId}/reject`)

// Remove a friend
export const removeFriend = (friendshipId) =>
  api.delete(`/friends/${friendshipId}`)
