import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const [matched, setMatched] = useState(false);

  useEffect(() => {
    // Get camera & mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localVideoRef.current.srcObject = stream;

      socket.on('match-found', async ({ room, partner }) => {
        setMatched(true);
        createPeerConnection(partner);
        stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));
      });

      socket.on('signal', async ({ from, data }) => {
        if (data.type === 'offer') {
          createPeerConnection(from);
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);
          socket.emit('signal', { to: from, data: answer });
        } else if (data.type === 'answer') {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  }, []);

  const createPeerConnection = (partnerId) => {
    peerRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerRef.current.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('signal', { to: partnerId, data: e.candidate });
      }
    };

    peerRef.current.ontrack = e => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    if (!matched) {
      peerRef.current.onnegotiationneeded = async () => {
        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);
        socket.emit('signal', { to: partnerId, data: offer });
      };
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '50px' }}>
      <div>
        <h2>You</h2>
        <video ref={localVideoRef} autoPlay muted playsInline width="300" />
      </div>
      <div>
        <h2>Stranger</h2>
        <video ref={remoteVideoRef} autoPlay playsInline width="300" />
      </div>
    </div>
  );
}

export default App;
