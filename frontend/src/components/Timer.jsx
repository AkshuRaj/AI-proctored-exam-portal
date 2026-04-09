import { useState, useEffect } from 'react';

export default function Timer({ durationMinutes, onTimeUp }) {
  const [seconds, setSeconds] = useState(durationMinutes * 60);

  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const isWarning = seconds <= 300; // red when 5 mins left

  return (
    <div style={{
      fontSize: 24,
      fontWeight: 'bold',
      color: isWarning ? 'red' : 'green',
      padding: '8px 16px',
      border: `2px solid ${isWarning ? 'red' : 'green'}`,
      borderRadius: 8,
      display: 'inline-block'
    }}>
      ⏱ {mins}:{secs}
    </div>
  );
}