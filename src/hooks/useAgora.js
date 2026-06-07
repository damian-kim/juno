import AgoraRTC from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef, useState } from 'react';

AgoraRTC.setLogLevel(4);

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || 'YOUR_AGORA_APP_ID';

export function useAgora() {
  // ── ALL refs first, before any useState ──────────────────────────────
  const clientRef = useRef(null);
  const screenClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localScreenTrackRef = useRef(null);

  // Mirror refs for values that callbacks need without creating new deps
  const outputVolumeRef = useRef(100);
  const localVolumeRef = useRef(80);
  const selectedMicRef = useRef('');
  const selectedCameraRef = useRef('');
  const cameraEnabledRef = useRef(false);
  const screenShareEnabledRef = useRef(false);

  // ── ALL useState after refs ───────────────────────────────────────────
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [localVolume, setLocalVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [networkQuality, setNetworkQuality] = useState(null);
  const [error, setError] = useState(null);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');

  // ── Callbacks ─────────────────────────────────────────────────────────
  const applyOutputVolume = useCallback((audioTrack, vol) => {
    if (audioTrack && typeof audioTrack.setVolume === 'function') {
      audioTrack.setVolume(vol);
    }
  }, []);

  const initClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;

    const client = AgoraRTC.createClient({ 
      mode: 'rtc', 
      codec: 'vp8'
    });

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        user.audioTrack?.play();
        applyOutputVolume(user.audioTrack, outputVolumeRef.current);
      }
      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        if (exists) return prev.map(u =>
          u.uid === user.uid ? { ...user, hasAudio: user.hasAudio, hasVideo: user.hasVideo } : u
        );
        return [...prev, user];
      });
    });

    client.on('user-unpublished', (user) => {
      setRemoteUsers(prev =>
        prev.map(u => u.uid === user.uid
          ? { ...u, hasAudio: user.hasAudio, hasVideo: user.hasVideo }
          : u
        )
      );
    });

    client.on('user-left', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on('connection-state-change', (state) => {
  console.log('Connection state:', state); // add this line
  setConnectionState(state);
});
    client.on('network-quality', (stats) => setNetworkQuality(stats));
    client.on('exception', (e) => console.warn('Agora exception:', e));

    clientRef.current = client;
    return client;
  }, [applyOutputVolume]);

  const loadDevices = useCallback(async () => {
    try {
      const [mics, cams, outputs] = await Promise.all([
        AgoraRTC.getMicrophones(),
        AgoraRTC.getCameras(),
        AgoraRTC.getPlaybackDevices ? AgoraRTC.getPlaybackDevices() : Promise.resolve([]),
      ]);
      setAudioDevices(mics);
      setVideoDevices(cams);
      setOutputDevices(outputs);
      if (mics.length > 0) {
        setSelectedMic(mics[0].deviceId);
        selectedMicRef.current = mics[0].deviceId;
      }
      if (cams.length > 0) {
        setSelectedCamera(cams[0].deviceId);
        selectedCameraRef.current = cams[0].deviceId;
      }
      if (outputs.length > 0) setSelectedOutput(outputs[0].deviceId);
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  }, []);

  const join = useCallback(async (channel, uid = null) => {
    try {
      setError(null);
      const client = initClient();

      const response = await fetch(`http://163.192.204.48:8080/api/token?channelName=${channel}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      await client.join(APP_ID, channel, data.token, uid);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: selectedMicRef.current || undefined,
        encoderConfig: 'high_quality',
      });
      localAudioTrackRef.current = audioTrack;
      audioTrack.setVolume(localVolumeRef.current);
      await client.publish(audioTrack);
      console.log('Audio track created:', audioTrack);
      console.log('Audio track enabled:', audioTrack.enabled);
      console.log('Audio track muted:', audioTrack.muted);

      // This will print your mic volume level every second so you can see if signal is coming in
      setInterval(() => {
        const level = audioTrack.getVolumeLevel();
        console.log('Mic volume level:', level); // should go above 0 when you speak
      }, 1000);

      setJoined(true);
      setMicEnabled(true);
    } catch (err) {
      setError(err.message || 'Failed to join channel');
      console.error('Join failed:', err);
    }
  }, [initClient]);

  const leave = useCallback(async () => {
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    localScreenTrackRef.current?.close();
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    localScreenTrackRef.current = null;

    await clientRef.current?.leave();
    clientRef.current = null;
    await screenClientRef.current?.leave();
    screenClientRef.current = null;

    cameraEnabledRef.current = false;
    screenShareEnabledRef.current = false;

    setJoined(false);
    setMicEnabled(true);
    setCameraEnabled(false);
    setScreenShareEnabled(false);
    setRemoteUsers([]);
  }, []);

  const toggleMic = useCallback(async () => {
    const track = localAudioTrackRef.current;
    if (!track) return;
    const newEnabled = !track.enabled;
    await track.setEnabled(newEnabled);
    setMicEnabled(newEnabled);
  }, []);

  const toggleCamera = useCallback(async () => {
  const client = clientRef.current;
  console.log('toggleCamera called, cameraEnabledRef:', cameraEnabledRef.current, 'client:', !!client);
  if (!client) return;

  if (!cameraEnabledRef.current) {
    try {
      console.log('Creating camera track...');
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: selectedCameraRef.current || undefined,
        encoderConfig: { width: 1280, height: 720, frameRate: 30, bitrateMax: 2000 },
      });
      console.log('Camera track created:', videoTrack);
      localVideoTrackRef.current = videoTrack;

      console.log('Publishing camera track...');
      await client.publish(videoTrack);
      console.log('Camera track published successfully');

      // Listen for track ending unexpectedly
      videoTrack.on('track-ended', () => {
        console.log('Camera track ended unexpectedly!');
      });

      cameraEnabledRef.current = true;
      setCameraEnabled(true);
      console.log('Camera enabled set to true');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied');
    }
  } else {
    try {
      console.log('Disabling camera...');
      await client.unpublish(localVideoTrackRef.current);
      localVideoTrackRef.current?.close();
      localVideoTrackRef.current = null;
      cameraEnabledRef.current = false;
      setCameraEnabled(false);
    } catch (err) {
      console.error('Camera unpublish error:', err);
    }
  }
}, []);

  const toggleScreenShare = useCallback(async () => {
    if (!clientRef.current) return;

    if (!screenShareEnabledRef.current) {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: '1080p_1',
          optimizationMode: 'detail',
        }, 'disable');

        const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        const currentChannel = clientRef.current._channelName;

        const response = await fetch(`http://163.192.204.48:8080/api/token?channelName=${currentChannel}`);
        const data = await response.json();

        await screenClient.join(APP_ID, currentChannel, data.token, null);
        await screenClient.publish(screenTrack);

        screenTrack.on('track-ended', () => toggleScreenShare());

        localScreenTrackRef.current = screenTrack;
        screenClientRef.current = screenClient;
        screenShareEnabledRef.current = true;
        setScreenShareEnabled(true);
      } catch (err) {
        if (err.code !== 'PERMISSION_DENIED') setError('Screen share failed');
      }
    } else {
      await screenClientRef.current?.unpublish(localScreenTrackRef.current);
      localScreenTrackRef.current?.close();
      localScreenTrackRef.current = null;
      await screenClientRef.current?.leave();
      screenClientRef.current = null;
      screenShareEnabledRef.current = false;
      setScreenShareEnabled(false);
    }
  }, []);

  const changeMicVolume = useCallback((vol) => {
    localAudioTrackRef.current?.setVolume(vol);
    localVolumeRef.current = vol;
    setLocalVolume(vol);
  }, []);

  const changeOutputVolume = useCallback((vol) => {
    outputVolumeRef.current = vol;
    setRemoteUsers(prev => {
      prev.forEach(user => applyOutputVolume(user.audioTrack, vol));
      return prev;
    });
    setOutputVolume(vol);
  }, [applyOutputVolume]);

  const switchMic = useCallback(async (deviceId) => {
    setSelectedMic(deviceId);
    selectedMicRef.current = deviceId;
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setDevice(deviceId);
    }
  }, []);

  const switchCamera = useCallback(async (deviceId) => {
    setSelectedCamera(deviceId);
    selectedCameraRef.current = deviceId;
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setDevice(deviceId);
    }
  }, []);

  const playLocalVideo = useCallback((element) => {
    if (localVideoTrackRef.current && element) {
      localVideoTrackRef.current.play(element);
    }
  }, []);

  const playLocalScreen = useCallback((element) => {
    if (localScreenTrackRef.current && element) {
      localScreenTrackRef.current.play(element);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    return () => {
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.close();
      localScreenTrackRef.current?.close();
      clientRef.current?.leave();
      screenClientRef.current?.leave();
    };
  }, []);

  return {
    joined, micEnabled, cameraEnabled, screenShareEnabled,
    remoteUsers, connectionState, localVolume, outputVolume,
    networkQuality, error,
    audioDevices, videoDevices, outputDevices,
    selectedMic, selectedCamera, selectedOutput,
    join, leave, toggleMic, toggleCamera, toggleScreenShare,
    changeMicVolume, changeOutputVolume,
    switchMic, switchCamera, setSelectedOutput,
    playLocalVideo, playLocalScreen,
    localVideoTrack: localVideoTrackRef,
    localAudioTrack: localAudioTrackRef,
  };
}