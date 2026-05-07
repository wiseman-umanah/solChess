import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import SplashLoader from './components/ui/SplashLoader'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import PuzzlesPage from './pages/PuzzlesPage'
import PracticePage from './pages/PracticePage'
import LeaderboardPage from './pages/LeaderboardPage'
import GamesPage from './pages/GamesPage'

const SPLASH_MIN_MS = 2200

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setSplashVisible(false), SPLASH_MIN_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <SplashLoader visible={splashVisible} />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id" element={<GamePage />} />
            <Route path="/puzzles" element={<PuzzlesPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </>
  )
}
