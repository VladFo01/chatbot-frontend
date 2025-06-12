import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { useAuth } from '../contexts/AuthContext'

type AuthMode = 'login' | 'register'

export const AuthWrapper: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login')
  const { login, register, isLoading } = useAuth()

  const switchToLogin = () => setMode('login')
  const switchToRegister = () => setMode('register')

  if (mode === 'register') {
    return (
      <RegisterForm
        onRegister={register}
        onSwitchToLogin={switchToLogin}
        isLoading={isLoading}
      />
    )
  }

  return (
    <LoginForm
      onLogin={login}
      onSwitchToRegister={switchToRegister}
      isLoading={isLoading}
    />
  )
}

export default AuthWrapper 