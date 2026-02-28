import api from './axios'

//  Local auth 
export const signup = (username, email, password, avatarImageName) =>
  api.post('/auth/signup', { username, email, password, avatarImageName })

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

//  Session 

/** Get the currently authenticated player. */
export const getMe = () =>
  api.get('/auth/me')

/** Logout — clears cookies on the server side. */
export const logout = () =>
  api.post('/auth/logout')

//  Profile editing 

export const editPlayer = (fields) =>
  api.post('/auth/edit', fields)

//  Password reset 

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email })

export const resetPassword = (token, newPassword) =>
  api.post('/auth/reset-password', { token, newPassword })

//  Google OAuth 

/** Get the Google OAuth redirect URL from the backend. */
export const getGoogleLoginUrl = () =>
  api.get('/auth/google-login')
