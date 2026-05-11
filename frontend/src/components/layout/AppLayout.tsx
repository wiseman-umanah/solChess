import React, { useState } from 'react'
import Header from './Header'
import LeftSidebar from './LeftSideBar'
import RightSidebar from './RightSideBar'
import ActionBar from './ActionBar'
import BottomTabBar from './BottomTabBar'
import AppTour from '../ui/AppTour'
import { useSocketLifecycle } from '../../hooks/useSocket'
import { useIsMobile } from '../../hooks/useIsMobile'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  useSocketLifecycle()
  const isMobile = useIsMobile()
  const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null)
  const [activeChatUsername, setActiveChatUsername] = useState<string | null>(null)

  function handleClickUser(wallet: string, username: string) {
    setActivePrivateChat(wallet)
    setActiveChatUsername(username)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <Header />

      {!isMobile && <LeftSidebar onClickUser={handleClickUser} />}

      <main
        className="min-h-screen pt-[60px]"
        style={isMobile
          ? { paddingBottom: 60 }
          : { marginLeft: 350, marginRight: 350, paddingBottom: 80 }
        }
        id="main-content"
      >
        {children}
      </main>

      {!isMobile && (
        <RightSidebar
          activePrivateChat={activePrivateChat}
          activeChatUsername={activeChatUsername}
        />
      )}

      {isMobile
        ? <BottomTabBar
            activePrivateChat={activePrivateChat}
            activeChatUsername={activeChatUsername}
            onClickUser={handleClickUser}
          />
        : <ActionBar />
      }

      <AppTour />
    </div>
  )
}
