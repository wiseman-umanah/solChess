// WebSocket hook — stubbed until backend is ready.
// Re-implement with socket.io-client once the server exists.

export function useWebSocket(_gameId: string | null) {
  function sendMove(_move: { from: string; to: string; promotion?: string }) {
    // no-op until backend
  }

  function sendChat(_content: string) {
    // no-op until backend
  }

  return { sendMove, sendChat }
}
