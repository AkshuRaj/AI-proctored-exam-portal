import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';

export default forwardRef(function WebcamFeed({ sessionId, onTerminate, onCameraStatusChange }, ref) {
  const videoRef                        = useRef(null);
  const canvasRef                       = useRef(null);
  const socketRef                       = useRef(null);
  const intervalRef                     = useRef(null);
  const lastFrameTimeRef                = useRef(Date.now());
  const cameraWatchdogRef               = useRef(null);
  const prevImgDataRef                  = useRef(null);
  const staticFramesRef                 = useRef(0);
  const shutterBlockedRef               = useRef(false);
  const [status, setStatus]             = useState('Connecting...');
  const [suspicionScore, setSuspicion]  = useState(0);
  const [violations, setViolations]     = useState([]);
  const [camError, setCamError]         = useState('');
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Expose stopAll method and camera status to parent component
  useImperativeHandle(ref, () => ({
    stopWebcam: stopAll,
    isCameraActive: isCameraActive
  }));

  useEffect(() => {
    startCamera();
    connectSocket();
    startCameraWatchdog();

    // Tab visibility detection
    const handleVisibility = () => {
      if (socketRef.current) {
        socketRef.current.emit('frame', {
          session_id:   sessionId,
          frame:        null,
          tab_visible:  !document.hidden
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Cleanup function - DO NOT stop camera on unmount, parent will control this
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (cameraWatchdogRef.current) clearInterval(cameraWatchdogRef.current);
    };
  }, [sessionId]);

  // Monitor if camera is actually sending frames (detect blocking/closure)
  const startCameraWatchdog = () => {
    cameraWatchdogRef.current = setInterval(() => {
      const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
      // If no frames received in 3 seconds, camera is likely blocked/closed
      const cameraBlocked = timeSinceLastFrame > 3000;
      
      if (cameraBlocked && isCameraActive) {
        setIsCameraActive(false);
        setCamError('⚠️ CAMERA BLOCKED! Please open your camera to continue the exam.');
        onCameraStatusChange && onCameraStatusChange(false);
      } else if (!cameraBlocked && !isCameraActive && !camError.includes('SHUTTER')) {
        setIsCameraActive(true);
        setCamError('');
        onCameraStatusChange && onCameraStatusChange(true);
      }
    }, 500); // Check every 500ms
  };

  const startCamera = async () => {
    try {
      setStatus('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('Video play error:', err);
        });
      }
      setCamError('');
      setStatus('Camera initialized');
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCamError('❌ Camera permission denied! Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCamError('❌ No camera device found! Please connect a webcam.');
      } else {
        setCamError(`❌ Camera error: ${err.message}`);
      }
      setStatus('Camera failed');
    }
  };

  const connectSocket = () => {
    try {
      socketRef.current = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 5
      });

      socketRef.current.on('connect', () => {
        setStatus('Connected');
        console.log('Socket connected:', socketRef.current.id);
        socketRef.current.emit('join_session', { session_id: sessionId });
        startSendingFrames();
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setStatus('Connection failed');
      });

      socketRef.current.on('violation', (data) => {
        setSuspicion(data.total_score);
        setViolations(prev => [{
          type:      data.type,
          severity:  data.severity,
          time:      new Date().toLocaleTimeString()
        }, ...prev.slice(0, 4)]);  // keep last 5

        if (data.should_terminate) {
          stopAll();
          onTerminate(data.total_score);
        }
      });

      socketRef.current.on('frame_result', (data) => {
        setSuspicion(data.suspicion_score);
        setStatus(data.face_status === 'ok' ? '✅ Face detected' : '⚠️ ' + data.face_status);
      });

      socketRef.current.on('terminated', (data) => {
        stopAll();
        onTerminate(data.total_score);
      });

      socketRef.current.on('disconnect', () => {
        setStatus('Disconnected');
      });
    } catch (err) {
      console.error('Socket setup error:', err);
      setStatus('Socket setup failed');
    }
  };

  const startSendingFrames = () => {
    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas  = canvasRef.current;
      const video   = videoRef.current;
      const ctx     = canvas.getContext('2d');

      // Check if video is actually ready
      if (video.readyState !== 4) return;

      canvas.width  = 320;
      canvas.height = 240;
      ctx.drawImage(video, 0, 0, 320, 240);

      // Analyze pixel brightness & static frame variance to detect synthetic OS blockers and optical blockers
      const imageData = ctx.getImageData(0, 0, 320, 240);
      const data = imageData.data;
      let colorSum = 0;
      let diffSum = 0;

      // sampling every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) {
        colorSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (prevImgDataRef.current) {
           diffSum += Math.abs(data[i] - prevImgDataRef.current[i]) +
                      Math.abs(data[i+1] - prevImgDataRef.current[i+1]) +
                      Math.abs(data[i+2] - prevImgDataRef.current[i+2]);
        }
      }
      
      const brightness = Math.floor(colorSum / (data.length / 16));
      
      // If prev picture exists, check difference
      if (prevImgDataRef.current) {
        if (diffSum === 0) {
          staticFramesRef.current += 1; // It has held perfectly still for another frame
        } else {
          staticFramesRef.current = 0; // Natural sensor noise detected, reset
        }
      }
      
      prevImgDataRef.current = new Uint8ClampedArray(data);
      
      // 1. Black optical block (brightness < 3) 
      // 2. Or a strictly synthetic driver picture (Lenovo grey hardware shutters) frozen identically for > 2 seconds
      const isShutterClosed = brightness < 3 || staticFramesRef.current > 2;

      if (isShutterClosed) { 
        if (!shutterBlockedRef.current) {
          shutterBlockedRef.current = true;
          setCamError('⚠️ CAMERA SHUTTER CLOSED! Please open the physical shutter covering your lens, or turn on your lights.');
          setIsCameraActive(false);
          onCameraStatusChange && onCameraStatusChange(true); // Tell parent to block UI
        }
        return; // Don't send useless frames to AI engine
      } else {
        // Shutter is open and camera has light & movement
        if (shutterBlockedRef.current) {
          shutterBlockedRef.current = false;
          setCamError('');
          setIsCameraActive(true);
          onCameraStatusChange && onCameraStatusChange(false);
        }
      }

      const frame = canvas.toDataURL('image/jpeg', 0.7);

      if (socketRef.current?.connected) {
        socketRef.current.emit('frame', {
          session_id:  sessionId,
          frame:       frame,
          tab_visible: !document.hidden
        });
        // Update last frame time whenever we successfully send a frame
        lastFrameTimeRef.current = Date.now();
      }
    }, 1000); // every 1 second
  };

  const stopAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (socketRef.current)   socketRef.current.disconnect();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  const scoreColor = suspicionScore < 20 ? 'green' : suspicionScore < 40 ? 'orange' : 'var(--danger-color)';

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, width: 280 }}>

      {/* Camera Feed */}
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '2px solid #1A56DB', background: '#000' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: 'auto', display: 'block', minHeight: '200px' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Status overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.6)', color: 'white',
          padding: '4px 8px', fontSize: 12
        }}>
          {status}
        </div>
      </div>

      {/* Camera error / blocking warning */}
      {camError && (
        <div style={{
          background: camError.includes('BLOCKED') ? '#DC2626' : '#FF6B6B',
          color: 'white',
          padding: 12,
          borderRadius: 6,
          marginTop: 8,
          fontSize: 13,
          fontWeight: 'bold',
          textAlign: 'center',
          animation: camError.includes('BLOCKED') ? 'pulse 1s infinite' : 'none'
        }}>
          {camError}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Suspicion Tracker (Score Hidden from Candidate by Request) */}
      <div style={{
        marginTop: 8, padding: '8px 12px',
        background: 'var(--surface-color)', borderRadius: 6,
        border: `2px solid ${scoreColor}`
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>
          Proctoring Active
        </div>
        
        {suspicionScore >= 20 && (
          <div className="pulse-danger" style={{ fontSize: '0.75rem', color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
            ⚠️ Warning: If you reach a score of 60, you will be automatically eliminated from the exam!
          </div>
        )}
      </div>

      {/* Recent Violations */}
      {violations.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {violations.map((v, i) => (
            <div key={i} style={{
              background: v.severity === 'high' ? '#fee2e2' : v.severity === 'medium' ? '#fef3c7' : '#f0fdf4',
              padding: '4px 8px', borderRadius: 4, marginBottom: 4, fontSize: 11
            }}>
              ⚠️ {v.type.replace('_', ' ')} — {v.time}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});