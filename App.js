import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000'); // replace with your deployed backend later

function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();

  const [matched, setMatched] = useState(false);
  const [connectedPartner, setConnectedPartner] = useState(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState('');

  const [username, setUsername] = useState('');
  const [genderPreference, setGenderPreference] = useState('any');
  const [userCountry, setUserCountry] = useState('');
  const [countryPreference, setCountryPreference] = useState('any');

  useEffect(() => {
    // Get user location
    axios.get('https://ipapi.co/json/').then(res => {
      setUserCountry(res.data.country_name);
    });

    // Get camera/mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localVideoRef.current.srcObject = stream;

      socket.on('match-found', async ({ room, partner, partnerName, partnerAvatar }) => {
        setMatched(true);
        setConnectedPartner(partner);
        setPartnerName(partnerName);
        setPartnerAvatar(partnerAvatar);

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

  const disconnectAndRematch = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    remoteVideoRef.current.srcObject = null;
    setMatched(false);
    setConnectedPartner(null);
    setPartnerAvatar('');
    setPartnerName('');

    socket.emit('disconnect-request');

    socket.emit('join-queue', {
      genderPreference,
      countryPreference,
      userCountry,
      username
    });
  };

  const startMatching = () => {
    socket.emit('join-queue', {
      genderPreference,
      countryPreference,
      userCountry,
      username
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Azar Clone</h1>

      <div className="mb-4 flex flex-col items-center">
        <input
          placeholder="Enter your name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="text-black px-4 py-2 rounded mb-2"
        />
        <img
          src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${username || 'user'}`}
          alt="avatar"
          className="w-16 h-16 rounded-full"
        />
      </div>

      <div className="mb-4 flex flex-col md:flex-row items-center gap-4">
        <div>
          <label className="mr-2 text-lg">Gender:</label>
          <select
            value={genderPreference}
            onChange={e => setGenderPreference(e.target.value)}
            className="text-black px-3 py-1 rounded"
          >
            <option value="any">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="mr-2 text-lg">Country:</label>
          <select
            value={countryPreference}
            onChange={e => setCountryPreference(e.target.value)}
            className="text-black px-3 py-1 rounded"
          >
            <option value="any">Any</option>
            <option value={userCountry}>{userCountry}</option>
          </select>
        </div>

        <button
          onClick={startMatching}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded"
        >
          Start Matching
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-8 mt-6">
        <div className="text-center">
          <h2 className="text-xl mb-2">You</h2>
          <video ref={localVideoRef} autoPlay muted playsInline className="rounded-lg shadow-md" width="300" />
        </div>

        <div className="text-center">
          <h2 className="text-xl mb-2">Stranger</h2>
          {partnerAvatar && (
            <img src={partnerAvatar} alt="Partner" className="w-16 h-16 mx-auto rounded-full mb-2" />
          )}
          {partnerName && <p className="text-lg font-medium mb-2">{partnerName}</p>}
          <video ref={remoteVideoRef} autoPlay playsInline className="rounded-lg shadow-md" width="300" />
        </div>
      </div>

      {matched && (
        <button
          onClick={disconnectAndRematch}
          className="mt-6 px-4 py-2 bg-red-500 hover:bg-red-600 rounded"
        >
          Disconnect & Rematch
        </button>
      )}
    </div>
  );
}

export default App;
