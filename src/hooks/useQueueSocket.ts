import { useEffect, useState, useCallback, useRef } from 'react';
import { QueueState, WebSocketMessage } from '../types';

const defaultState: QueueState = {
  institution: 'Secretaria de Desenvolvimento Agropecuário',
  currentTicket: null,
  history: [],
  waitingQueue: [],
  activeCategory: 'TODAS',
  currentDesk: 'Sala 1',
  counters: { CAF: 0, GERAL: 0, LICENCIAMENTO: 0, INCRA: 0 },
  soundAlertToken: 0,
  speechEnabled: false,
  chimeEnabled: true
};

export function useQueueSocket() {
  const [state, setState] = useState<QueueState>(defaultState);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial state via REST
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const data: QueueState = await res.json();
        setState(data);
      }
    } catch (err) {
      console.warn('Failed to fetch state via API:', err);
    }
  }, []);

  useEffect(() => {
    fetchState();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            if (data.type === 'STATE_UPDATE') {
              setState(data.payload);
            }
          } catch (e) {
            console.error('WS message error:', e);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          // Try reconnecting in 2 seconds
          reconnectTimeout = setTimeout(connect, 2000);
        };

        socket.onerror = () => {
          setIsConnected(false);
          socket?.close();
        };
      } catch (e) {
        console.warn('WS connection failed, falling back to polling:', e);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    // Fallback polling every 3 seconds if WebSocket is disconnected
    const pollingInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchState();
      }
    }, 3000);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pollingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchState]);

  const sendAction = useCallback((msg: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Fallback REST calls
      if (msg.type === 'CALL_NEXT') {
        fetch('/api/queue/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ desk: msg.desk, category: msg.category })
        }).then(res => res.json()).then(d => setState(d.state));
      } else if (msg.type === 'CALL_PREV') {
        fetch('/api/queue/prev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ desk: msg.desk, category: msg.category })
        }).then(res => res.json()).then(d => setState(d.state));
      } else if (msg.type === 'RECALL_CURRENT') {
        fetch('/api/queue/recall', { method: 'POST' }).then(res => res.json()).then(d => setState(d.state));
      } else if (msg.type === 'ADD_TICKET') {
        fetch('/api/queue/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: msg.category })
        }).then(res => res.json()).then(d => setState(d.state));
      } else if (msg.type === 'RESET_QUEUE') {
        fetch('/api/queue/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: msg.category })
        }).then(res => res.json()).then(d => setState(d.state));
      } else if (msg.type === 'CALL_DIRECT') {
        fetch('/api/queue/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: msg.category, number: msg.number, desk: msg.desk })
        }).then(res => res.json()).then(d => setState(d.state));
      } else if (msg.type === 'UPDATE_CATEGORIES') {
        fetch('/api/queue/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories: msg.categories })
        }).then(res => res.json()).then(d => setState(d.state));
      }
    }
  }, []);

  const callNext = useCallback((desk?: string, category?: string) => {
    sendAction({ type: 'CALL_NEXT', desk, category });
  }, [sendAction]);

  const callPrev = useCallback((desk?: string, category?: string) => {
    sendAction({ type: 'CALL_PREV', desk, category });
  }, [sendAction]);

  const callDirect = useCallback((category: string, number: number | string, desk?: string) => {
    sendAction({ type: 'CALL_DIRECT', category, number, desk });
  }, [sendAction]);

  const recallCurrent = useCallback(() => {
    sendAction({ type: 'RECALL_CURRENT' });
  }, [sendAction]);

  const addTicket = useCallback((category: string) => {
    sendAction({ type: 'ADD_TICKET', category });
  }, [sendAction]);

  const resetQueue = useCallback((category?: string) => {
    sendAction({ type: 'RESET_QUEUE', category });
    // Parallel REST request to guarantee instant delivery and immediate state update
    fetch('/api/queue/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    })
      .then(res => res.json())
      .then(d => {
        if (d.state) setState(d.state);
      })
      .catch(err => console.warn('Reset queue REST fallback error:', err));
  }, [sendAction]);

  const updateDesk = useCallback((desk: string) => {
    sendAction({ type: 'UPDATE_DESK', desk });
  }, [sendAction]);

  const updateInstitution = useCallback((institution: string) => {
    sendAction({ type: 'UPDATE_INSTITUTION', institution });
  }, [sendAction]);

  const updateCategories = useCallback((categories: any[]) => {
    sendAction({ type: 'UPDATE_CATEGORIES', categories });
    // Guaranteed direct HTTP persistence in parallel
    fetch('/api/queue/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories })
    }).then(res => res.json()).then(d => {
      if (d.state) setState(d.state);
    }).catch(() => {});
  }, [sendAction]);

  const updateResetAllShortcut = useCallback((shortcut: string) => {
    sendAction({ type: 'UPDATE_RESET_ALL_SHORTCUT', shortcut });
    fetch('/api/queue/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetAllShortcut: shortcut })
    }).then(res => res.json()).then(d => {
      if (d.state) setState(d.state);
    }).catch(() => {});
  }, [sendAction]);

  return {
    state,
    isConnected,
    callNext,
    callPrev,
    callDirect,
    recallCurrent,
    addTicket,
    resetQueue,
    updateDesk,
    updateInstitution,
    updateCategories,
    updateResetAllShortcut,
    refreshState: fetchState
  };
}
