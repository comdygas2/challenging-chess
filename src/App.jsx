import './App.css'
import ChessGame from './components/ChessGame'
import PieceGuide from './components/PieceGuide'

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <h1>Challenging chess!!!</h1>
        <p className="tagline">A simple chess app you play against the computer.</p>
      </header>

      <div className="layout">
        <ChessGame />
        <PieceGuide />
      </div>
    </main>
  )
}

export default App
