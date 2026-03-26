import numpy as np
from typing import Dict, Optional
import pyaudio
import threading
from collections import deque

class AudioMonitor:
    """
    Monitors audio input to detect suspicious sounds like speech from others or unusual noise.
    """
    
    def __init__(self, sample_rate: int = 44100, chunk_size: int = 1024):
        """
        Initialize audio monitor.
        
        Args:
            sample_rate: Sample rate in Hz
            chunk_size: Number of frames per buffer
        """
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        
        # Audio thresholds
        self.noise_threshold = 30  # dB
        self.speech_threshold = 50  # dB
        self.suspicious_threshold = 60  # dB
        
        self.audio_buffer = deque(maxlen=10)  # Store last 10 frames
        self.stream = None
        self.is_recording = False
    
    def start_recording(self):
        """Start recording audio."""
        try:
            p = pyaudio.PyAudio()
            self.stream = p.open(
                format=pyaudio.paFloat32,
                channels=1,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )
            self.is_recording = True
        except Exception as e:
            print(f"Error starting audio recording: {e}")
            self.is_recording = False
    
    def stop_recording(self):
        """Stop recording audio."""
        self.is_recording = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
    
    def get_audio_frame(self) -> Optional[np.ndarray]:
        """
        Get next audio frame.
        
        Returns:
            Audio frame as numpy array or None
        """
        if not self.is_recording or not self.stream:
            return None
        
        try:
            data = self.stream.read(self.chunk_size, exception_on_overflow=False)
            audio_frame = np.frombuffer(data, dtype=np.float32)
            return audio_frame
        except Exception as e:
            print(f"Error reading audio: {e}")
            return None
    
    def calculate_audio_level(self, audio_frame: np.ndarray) -> float:
        """
        Calculate audio level in dB.
        
        Args:
            audio_frame: Audio frame as numpy array
            
        Returns:
            Sound level in dB
        """
        if len(audio_frame) == 0:
            return 0
        
        rms = np.sqrt(np.mean(audio_frame ** 2))
        if rms == 0:
            return -np.inf
        
        db = 20 * np.log10(rms)
        return max(db, 0)  # Clip to 0 minimum
    
    def detect_speech(self, audio_frame: np.ndarray) -> Dict:
        """
        Detect if speech is present in audio frame.
        
        Args:
            audio_frame: Audio frame
            
        Returns:
            Dictionary with speech detection results
        """
        level = self.calculate_audio_level(audio_frame)
        
        is_speech = level > self.speech_threshold
        is_suspicious = level > self.suspicious_threshold
        
        return {
            'level_db': level,
            'is_speech': is_speech,
            'is_suspicious': is_suspicious,
            'confidence': min(level / 100, 1.0)
        }
    
    def analyze_audio_pattern(self) -> Dict:
        """
        Analyze audio pattern from recent frames.
        
        Returns:
            Dictionary with audio pattern analysis
        """
        if len(self.audio_buffer) == 0:
            return {'pattern': 'no_data', 'average_level': 0, 'variance': 0, 'is_suspicious': False}
        
        levels = list(self.audio_buffer)
        avg_level = np.mean(levels)
        variance = np.var(levels)
        
        is_suspicious = avg_level > self.suspicious_threshold or variance > 10
        
        return {
            'pattern': 'speech' if avg_level > self.speech_threshold else 'noise',
            'average_level': avg_level,
            'variance': variance,
            'is_suspicious': is_suspicious
        }
