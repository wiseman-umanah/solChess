import React, { useState } from 'react'
import Header from './Header'
import LeftSidebar from './LeftSideBar'
import RightSidebar from './RightSideBar'
import ActionBar from './ActionBar'
import AppTour from '../ui/AppTour'
import { useSocketLifecycle } from '../../hooks/useSocket'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  useSocketLifecycle()
  const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null)
  const [activeChatUsername, setActiveChatUsername] = useState<string | null>(null)

  function handleClickUser(wallet: string, username: string) {
    setActivePrivateChat(wallet)
    setActiveChatUsername(username)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <Header />

      <LeftSidebar onClickUser={handleClickUser} />

      
      <main
        className="min-h-screen pt-[60px] pb-[80px]"
        style={{ marginLeft: 350, marginRight: 350 }}
        id="main-content"
      >
        {children}
      </main>

      <RightSidebar
        activePrivateChat={activePrivateChat}
        activeChatUsername={activeChatUsername}
      />

      <ActionBar />
      <AppTour />
    </div>
  )
}
