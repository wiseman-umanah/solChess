import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import CreatePage from './pages/CreatePage'
import JoinPage from './pages/JoinPage'
import HostPage from './pages/HostPage'
import PuzzlesPage from './pages/PuzzlesPage'
import PracticePage from './pages/PracticePage'
import LeaderboardPage from './pages/LeaderboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/puzzles" element={<PuzzlesPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
