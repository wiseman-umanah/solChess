import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import PuzzlesPage from './pages/PuzzlesPage'
import PracticePage from './pages/PracticePage'
import LeaderboardPage from './pages/LeaderboardPage'
import GamesPage from './pages/GamesPage'

export default function App() {
  return (
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
  )
}
