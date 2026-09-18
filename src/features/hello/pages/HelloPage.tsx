import { useEffect, useState } from 'react';
import { getGreeting } from '../api/helloApi';

type GreetingState =
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error' };

export function HelloPage() {
  const [state, setState] = useState<GreetingState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getGreeting(controller.signal).then(
      (greeting) => {
        if (!controller.signal.aborted) setState({ status: 'success', message: greeting.message });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    );
    return () => controller.abort();
  }, [attempt]);

  return (
    <main>
      <p>Welcome to</p>
      <h1>Mealibrio</h1>
      {state.status === 'loading' && <p role="status">Connecting…</p>}
      {state.status === 'success' && <p role="status">{state.message}</p>}
      {state.status === 'error' && (
        <div role="alert">
          <p>We couldn’t connect. Please try again.</p>
          <button onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }}>
            Try again
          </button>
        </div>
      )}
    </main>
  );
}
