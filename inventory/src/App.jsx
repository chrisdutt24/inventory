import { useEffect, useMemo, useState } from 'react'
import './App.css'

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const starterLists = [
  {
    id: 'bath',
    name: 'Badezimmer',
    items: [
      { id: 'shampoo', name: 'Shampoo', count: 2 },
      { id: 'towels', name: 'Handtücher', count: 6 },
      { id: 'soap', name: 'Seife', count: 3 },
    ],
  },
  {
    id: 'kitchen',
    name: 'Küche',
    items: [
      { id: 'pasta', name: 'Pasta', count: 4 },
      { id: 'tomatoes', name: 'Passierte Tomaten', count: 3 },
      { id: 'sponges', name: 'Schwämme', count: 5 },
    ],
  },
  {
    id: 'living',
    name: 'Wohnzimmer',
    items: [
      { id: 'candles', name: 'Kerzen', count: 2 },
      { id: 'batteries', name: 'Batterien', count: 8 },
      { id: 'cables', name: 'Ladekabel', count: 3 },
    ],
  },
]

const STORAGE_KEY = 'inventory_lists'

const normalizeCount = (value) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function App() {
  const [lists, setLists] = useState(() => {
    if (typeof window === 'undefined') return starterLists
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return starterLists
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return starterLists
      return parsed
    } catch (error) {
      console.warn('Inventar konnte nicht aus dem Speicher geladen werden.', error)
      return starterLists
    }
  })
  const [activeListId, setActiveListId] = useState(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCount, setNewItemCount] = useState('1')

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) || null,
    [lists, activeListId],
  )

  useEffect(() => {
    setNewItemName('')
    setNewItemCount('1')
  }, [activeListId])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
    } catch (error) {
      console.warn('Inventar konnte nicht gespeichert werden.', error)
    }
  }, [lists])

  const totalPieces = (list) =>
    list.items.reduce((sum, item) => sum + item.count, 0)

  const handleAddList = () => {
    const name = prompt('Wie soll die neue Liste heißen?')
    const trimmed = name?.trim()
    if (!trimmed) return

    const nextList = { id: createId(), name: trimmed, items: [] }
    setLists((prev) => [...prev, nextList])
    setActiveListId(nextList.id)
  }

  const handleRenameList = (id) => {
    const list = lists.find((item) => item.id === id)
    if (!list) return

    const nextName = prompt('Wie soll die Liste heißen?', list.name)
    const trimmed = nextName?.trim()
    if (!trimmed) return

    setLists((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, name: trimmed } : entry,
      ),
    )
  }

  const handleDeleteList = (id) => {
    const list = lists.find((entry) => entry.id === id)
    if (!list) return

    const confirmed = window.confirm(
      `Bereich "${list.name}" wirklich löschen? Die enthaltenen Gegenstände gehen verloren.`,
    )
    if (!confirmed) return

    setLists((prev) => prev.filter((entry) => entry.id !== id))
    if (activeListId === id) {
      setActiveListId(null)
    }
  }

  const handleAddItem = (event) => {
    event.preventDefault()
    if (!activeList) return

    const trimmedName = newItemName.trim()
    if (!trimmedName) return

    const parsedCount = Math.max(1, normalizeCount(parseInt(newItemCount, 10)))

    const newItem = {
      id: createId(),
      name: trimmedName,
      count: parsedCount,
    }

    setLists((prev) =>
      prev.map((list) =>
        list.id === activeList.id
          ? { ...list, items: [...list.items, newItem] }
          : list,
      ),
    )

    setNewItemName('')
    setNewItemCount('1')
  }

  const updateItemCount = (itemId, nextValue, { removeIfZero = false } = {}) => {
    const safeValue = normalizeCount(nextValue)

    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== activeListId) return list

        const changed = list.items.map((item) =>
          item.id === itemId ? { ...item, count: safeValue } : item,
        )

        const nextItems = removeIfZero
          ? changed.filter((item) => item.count > 0)
          : changed

        return { ...list, items: nextItems }
      }),
    )
  }

  const decrementItem = (itemId) => {
    const list = lists.find((entry) => entry.id === activeListId)
    const item = list?.items.find((entry) => entry.id === itemId)
    if (!item) return

    const nextValue = Math.max(0, item.count - 1)
    updateItemCount(itemId, nextValue, { removeIfZero: true })
  }

  const handleManualChange = (itemId, rawValue) => {
    const parsed = parseInt(rawValue, 10)
    updateItemCount(itemId, Number.isNaN(parsed) ? 0 : parsed, {
      removeIfZero: false,
    })
  }

  if (!activeList) {
    return (
      <div className="app-frame">
        <header className="page-head">
          <div>
            <p className="eyebrow">Inventar</p>
            <h1>Deine Bereiche</h1>
            <p className="subhead">
              Wähle einen Raum oder lege einen neuen Bereich an, um die
              Gegenstände dahinter zu pflegen.
            </p>
          </div>
          <button className="primary" onClick={handleAddList}>
            + Neuer Bereich
          </button>
        </header>

        <div className="list-stack">
          {lists.map((list) => (
            <button
              key={list.id}
              className="list-card"
              onClick={() => setActiveListId(list.id)}
            >
              <div className="list-title">
                <div>
                  <p className="eyebrow muted">
                    {list.items.length} Gegenstände · {totalPieces(list)} Stück
                  </p>
                  <h3>{list.name}</h3>
                </div>
                <span className="pill">{totalPieces(list)}</span>
              </div>
              <div className="chip-row">
                {list.items.slice(0, 4).map((item) => (
                  <span key={item.id} className="chip">
                    {item.name}
                  </span>
                ))}
                {list.items.length > 4 && (
                  <span className="chip muted">+{list.items.length - 4} mehr</span>
                )}
              </div>
              <div className="card-actions">
                <span className="tap-hint">Tippen zum Öffnen</span>
                <button
                  className="ghost"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRenameList(list.id)
                  }}
                >
                  Umbenennen
                </button>
                <button
                  className="ghost"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDeleteList(list.id)
                  }}
                >
                  Löschen
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <header className="page-head">
        <div className="back-row">
          <button className="ghost back" onClick={() => setActiveListId(null)}>
            ← Übersicht
          </button>
          <span className="pill soft">
            {activeList.items.length} Gegenstände · {totalPieces(activeList)}{' '}
            Stück
          </span>
        </div>
        <div className="title-row">
          <div>
            <p className="eyebrow">Inventar</p>
            <h1>{activeList.name}</h1>
            <p className="subhead">
              Tippe auf eine Kachel, um den Bestand zu verringern. Den Zähler
              kannst du auch direkt anpassen.
            </p>
          </div>
          <div className="header-actions">
            <button
              className="ghost"
              onClick={() => handleRenameList(activeList.id)}
            >
              Umbenennen
            </button>
            <button
              className="ghost"
              onClick={() => handleDeleteList(activeList.id)}
            >
              Löschen
            </button>
            <button className="primary" onClick={handleAddList}>
              Neuer Bereich
            </button>
          </div>
        </div>
      </header>

      <form className="new-item" onSubmit={handleAddItem}>
        <div className="input-group">
          <label htmlFor="itemName">Gegenstand</label>
          <input
            id="itemName"
            name="itemName"
            placeholder="z. B. Spülmaschinentabs"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            required
          />
        </div>
        <div className="input-group narrow">
          <label htmlFor="itemCount">Anzahl</label>
          <input
            id="itemCount"
            name="itemCount"
            type="number"
            min="1"
            inputMode="numeric"
            value={newItemCount}
            onChange={(event) => setNewItemCount(event.target.value)}
            required
          />
        </div>
        <button type="submit" className="primary">
          Hinzufügen
        </button>
      </form>

      <div className="tile-grid">
        {activeList.items.map((item) => (
          <button
            key={item.id}
            className="tile"
            onClick={() => decrementItem(item.id)}
          >
            <div className="tile-count">{item.count}</div>
            <h3>{item.name}</h3>
            <p className="muted">Tippen verringert den Bestand um eins</p>
            <div
              className="manual-row"
              onClick={(event) => event.stopPropagation()}
            >
              <label htmlFor={`count-${item.id}`}>Manuell</label>
              <input
                id={`count-${item.id}`}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder=""
                value={item.count === 0 ? '' : item.count}
                onChange={(event) =>
                  handleManualChange(item.id, event.target.value)
                }
              />
            </div>
          </button>
        ))}
        {activeList.items.length === 0 && (
          <div className="empty-state">
            <p className="eyebrow muted">Noch leer</p>
            <p>Lege unten einen Gegenstand an, um loszulegen.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
