import { useState, useEffect } from 'react'
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'

const TOUR_KEY = 'solchess_tour_done'

const STEPS: Step[] = [
  {
    target: '#tour-connect-wallet',
    title: 'Connect Your Wallet',
    content: 'Link your Solana wallet to play, earn SOL, and build your on-chain reputation. You can still spectate and chat without one.',
    placement: 'bottom',
  },
  {
    target: '#tour-nav-games',
    title: 'Browse Live Games',
    content: 'Watch any live match in real time, see prize pools, and spectate without a wallet.',
    placement: 'bottom',
  },
  {
    target: '#tour-nav-leaderboard',
    title: 'Leaderboard',
    content: 'See the top-ranked players, their trust scores, and total SOL earned on SolChess.',
    placement: 'bottom',
  },
  {
    target: '#tour-left-sidebar',
    title: 'Your Stats & World Chat',
    content: 'Track your win rate, games played, and trust score. World chat below lets you talk to the entire SolChess community — tap any username to start a private chat.',
    placement: 'right',
  },
  {
    target: '#tour-right-sidebar',
    title: 'Live Activity',
    content: 'Private messages, ongoing games at a glance, and the top 5 players — all in one panel. Click a game to jump in as a spectator.',
    placement: 'left',
  },
  {
    target: '#tour-create-btn',
    title: 'Create a Game',
    content: 'Start a competitive match. Choose your color (white, black, or random), set a time control, and share the generated code with your opponent.',
    placement: 'top',
  },
  {
    target: '#tour-join-btn',
    title: 'Join a Game',
    content: "Have an invite code? Enter it here to take your seat at the board and face your opponent.",
    placement: 'top',
  },
  {
    target: '#tour-host-btn',
    title: 'Host an Event',
    content: 'Perfect for tournaments, community events, and giveaways. You spectate — share one code with two players, first to join plays white, second plays black.',
    placement: 'top',
  },
  {
    target: '#tour-puzzles-btn',
    title: 'Puzzles',
    content: 'Sharpen your chess skills with hand-picked tactical puzzles. No wallet needed — just show up and play.',
    placement: 'top',
  },
  {
    target: '#tour-practice-ai-btn',
    title: 'Practice vs AI',
    content: 'Play against Stockfish at four difficulty levels: Beginner, Intermediate, Advanced, and Master. Free and instant — no wallet needed.',
    placement: 'top',
  },
  {
    target: '#tour-practice-friend-btn',
    title: 'Play a Friend',
    content: 'Challenge a friend to a private game. Share the code, play head-to-head, undo moves, and set a timer — or play with no clock at all.',
    placement: 'top',
  },
]

export default function AppTour() {
  const [run, setRun] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setRun(true), 2800)
      return () => clearTimeout(t)
    }
  }, [])

  function handleEvent({ status }: EventData) {
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_KEY, '1')
      setRun(false)
    }
  }

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={{
        back: '← Back',
        last: 'Finish ✓',
        next: 'Next →',
        nextWithProgress: 'Next ({current} of {total}) →',
        skip: 'Skip tour',
      }}
      options={{
        // Behavior
        skipBeacon: true,
        skipScroll: true,
        overlayClickAction: false,
        showProgress: true,
        buttons: ['back', 'primary', 'skip'],
        // Colors
        backgroundColor: '#1a1a28',
        arrowColor: '#1a1a28',
        overlayColor: 'rgba(7, 7, 13, 0.68)',
        primaryColor: '#9945FF',
        textColor: '#ffffff',
        // Layout
        spotlightRadius: 0,
        spotlightPadding: 4,
        zIndex: 10000,
        width: 320,
      }}
      styles={{
        tooltip: {
          borderRadius: 0,
          border: '1.5px solid #2a2a3a',
          padding: '20px 20px 16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          backgroundColor: '#1a1a28',
        },
        // Primary = Next/Last button
        buttonPrimary: {
          background: 'linear-gradient(135deg, #9945FF, #14F195)',
          borderRadius: 0,
          color: '#000000',
          fontSize: '11px',
          fontWeight: 700,
          padding: '7px 18px',
          outline: 'none',
          border: 'none',
          letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
        },
        buttonBack: {
          color: '#555577',
          fontSize: '11px',
          fontWeight: 600,
          background: 'transparent',
          border: 'none',
        },
        buttonSkip: {
          color: '#333355',
          fontSize: '11px',
          background: 'transparent',
          border: 'none',
        },
        buttonClose: {
          display: 'none',
        },
      }}
    />
  )
}