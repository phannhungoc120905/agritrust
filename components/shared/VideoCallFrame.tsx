'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, PhoneOff, PhoneCall, Loader2 } from 'lucide-react';

interface VideoCallFrameProps {
  channelName: string;
  role: 'nong_dan' | 'thuong_lai';
}

export default function VideoCallFrame({ channelName, role }: VideoCallFrameProps) {
  const router = useRouter();
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const rtcClientRef = useRef<any>(null);
  const localTracksRef = useRef<{ videoTrack: any; audioTrack: any } | null>(null);

  // Khởi tạo Agora Client và kết nối cuộc gọi
  const startCall = async () => {
    setIsJoining(true);
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      
      // 1. Tạo Track Micro và Camera nội bộ (Bật cam/mic ngay cả khi chưa có App ID)
      let audioTrack: any = null;
      let videoTrack: any = null;
      try {
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { audioTrack, videoTrack };
      } catch (mediaErr) {
        console.warn('Không thể lấy quyền Camera/Micro:', mediaErr);
        // Vẫn tiếp tục vào phòng nhưng ở trạng thái tắt cam/mic
        setCameraOff(true);
        setMuted(true);
      }

      // Cho phép vào phòng
      setInCall(true);
      
      // Delay play until UI is rendered
      setTimeout(() => {
        if (localVideoRef.current && videoTrack) {
          videoTrack.play(localVideoRef.current);
        }
      }, 300);

      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
      if (!appId || appId === 'YOUR_AGORA_APP_ID') {
        console.warn('Thiếu NEXT_PUBLIC_AGORA_APP_ID. Chạy Demo Video Call cục bộ.');
        setIsJoining(false);
        return;
      }

      // 2. Tạo Client thật nếu có App ID
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      rtcClientRef.current = client;

      // Lắng nghe sự kiện người khác tham gia & stream video/audio
      client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            setRemoteUsers((prev) => {
              if (prev.find((u) => u.uid === user.uid)) return prev;
              return [...prev, user];
            });
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        } catch (subErr) {
          console.error('Lỗi khi subscribe user:', subErr);
        }
      });

      client.on('user-unpublished', (user: any) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      // 3. Lấy token từ API route nếu dự án dùng Secured Mode
      let token: string | null = null;
      try {
        const tokenRes = await fetch(`/api/agora-token?channelName=${encodeURIComponent(channelName)}`);
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.token;
        }
      } catch (tokenFetchErr) {
        console.warn('Không thể lấy Agora Token từ API route, thử dùng null token:', tokenFetchErr);
      }

      // 4. Join Kênh và Publish
      try {
        const uid = await client.join(appId, channelName, token, null);
        
        const tracksToPublish = [];
        if (audioTrack) tracksToPublish.push(audioTrack);
        if (videoTrack) tracksToPublish.push(videoTrack);

        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }
        console.log(`Đã kết nối cuộc gọi thật thành công, UID: ${uid}`);
      } catch (joinErr: any) {
        console.error('Lỗi khi join channel Agora:', joinErr);
        const isTokenError = 
          joinErr.message?.includes('dynamic use static key') || 
          joinErr.code === 'CAN_NOT_GET_GATEWAY_SERVER' ||
          (joinErr.message && joinErr.message.indexOf('static key') !== -1);
          
        if (isTokenError) {
          console.warn('CẢNH BÁO: Agora App ID yêu cầu Token (Secured Mode) nhưng token chưa hợp lệ.');
          alert(
            'LƯU Ý: Agora App ID của bạn yêu cầu Token xác thực (Secured Mode).\n\n' +
            'Để kết nối cuộc gọi Video Call thật giữa hai bên, hãy làm theo 1 trong 2 cách sau:\n' +
            'Cách 1 (Nhanh & Khuyên dùng): Copy dòng "Primary Certificate" trong Agora Console của dự án, mở file .env thêm dòng:\n' +
            '  AGORA_APP_CERTIFICATE=mã_certificate_của_bạn\n' +
            'Sau đó khởi động lại server dev.\n\n' +
            'Cách 2: Nếu Agora cho phép, tạo một dự án mới ở chế độ "Testing Mode: App ID only" (không tạo App Certificate), copy App ID mới dán vào .env.'
          );
        } else {
          console.warn('Không thể kết nối Agora RTC. Chạy ở chế độ cục bộ.');
        }
      }
      setIsJoining(false);

    } catch (err) {
      console.error('Lỗi kết nối Video Call:', err);
      // Thay vì throw lỗi đỏ làm Next.js crash, ta bypass qua luồng giả lập
      setInCall(true);
      setCameraOff(true);
      setMuted(true);
    } finally {
      setIsJoining(false);
    }
  };

  // Vào phòng không cần Camera (Demo Mode an toàn)
  const joinDemoMode = () => {
    setInCall(true);
    setCameraOff(true);
    setMuted(true);
  };

  // Phát lại video sau khi render
  useEffect(() => {
    if (inCall && localTracksRef.current?.videoTrack && localVideoRef.current) {
      localTracksRef.current.videoTrack.play(localVideoRef.current);
    }
  }, [inCall, remoteUsers.length]);

  // Ngắt kết nối cuộc gọi và giải phóng camera/micro
  const endCall = async () => {
    if (localTracksRef.current) {
      localTracksRef.current.videoTrack?.stop();
      localTracksRef.current.videoTrack?.close();
      localTracksRef.current.audioTrack?.stop();
      localTracksRef.current.audioTrack?.close();
      localTracksRef.current = null;
    }

    if (rtcClientRef.current) {
      await rtcClientRef.current.leave();
      rtcClientRef.current = null;
    }

    setRemoteUsers([]);
    setInCall(false);
    setMuted(false);
    setCameraOff(false);
  };

  // Rời phòng và quay lại Dashboard
  const handleExitCall = async () => {
    await endCall();
    router.push('/');
  };

  // Mute / Unmute âm thanh
  const handleToggleMute = async () => {
    if (localTracksRef.current?.audioTrack) {
      const nextState = !muted;
      await localTracksRef.current.audioTrack.setEnabled(!nextState);
      setMuted(nextState);
    }
  };

  // Bật / Tắt Video Camera
  const handleToggleCamera = async () => {
    if (localTracksRef.current?.videoTrack) {
      const nextState = !cameraOff;
      await localTracksRef.current.videoTrack.setEnabled(!nextState);
      setCameraOff(nextState);
    }
  };

  // Dọn dẹp tài nguyên khi Unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const partnerRole = role === 'nong_dan' ? 'Thương lái' : 'Nông dân';

  return (
    <div className="relative w-full h-full bg-neutral-900 overflow-hidden flex flex-col group">
      {/* Vùng hiển thị Video */}
      {!inCall ? (
        // Màn hình chờ tham gia (Before Join)
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white p-6 text-center">
          <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Video size={40} />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight mb-2">Phòng Đàm Phán Sẵn Sàng</h3>
          <p className="text-neutral-400 text-sm max-w-sm mb-8 leading-relaxed">
            Cho phép trình duyệt truy cập Camera và Microphone để bắt đầu cuộc gọi với <span className="font-bold text-white">{partnerRole}</span>.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startCall}
              disabled={isJoining}
              className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-[15px] shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-70 w-full justify-center"
            >
              {isJoining ? (
                <><Loader2 size={20} className="animate-spin" /> Đang kết nối...</>
              ) : (
                <><PhoneCall size={20} /> Tham gia Video Call</>
              )}
            </button>

            <button
              onClick={joinDemoMode}
              className="flex items-center justify-center gap-2 px-8 py-3 w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-sm font-semibold transition-all animate-pulse"
            >
              Vào phòng nhanh (Demo an toàn)
            </button>

            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 px-8 py-3 w-full bg-neutral-900/60 hover:bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white rounded-full text-sm font-semibold transition-all"
            >
              Hủy / Quay lại
            </button>
          </div>
        </div>
      ) : (
        // Màn hình trong cuộc gọi (In Call)
        <div className="flex-1 relative bg-black">
          
          {/* Main View: Đối tác (nếu có) hoặc Tôi (nếu một mình) */}
          {remoteUsers.length > 0 ? (
            // Hiển thị người đầu tiên trong mảng remoteUsers làm màn hình chính
            <div className="absolute inset-0">
              <RemoteVideoPlayer user={remoteUsers[0]} />
            </div>
          ) : (
            // Nếu chưa có ai vào, hiển thị màn hình chờ màu đen
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900">
               <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                 <span className="text-3xl text-neutral-600 font-bold">{partnerRole.charAt(0)}</span>
               </div>
               <p className="text-neutral-400 text-sm animate-pulse">Đang chờ đối tác tham gia...</p>
            </div>
          )}

          {/* Picture-in-Picture (PiP) - Màn hình của tôi */}
          {/* PiP chỉ hiện khi đã có đối tác, HOẶC có thể hiện luôn nếu muốn giống Meet */}
          <div className="absolute top-6 right-6 w-36 h-52 bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 z-20 cursor-move">
            <div ref={localVideoRef} className="w-full h-full object-cover absolute inset-0" />
            {cameraOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-white">
                <VideoOff size={24} className="text-neutral-600" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white z-20">
              Bạn
            </div>
          </div>

          {/* Thông tin kênh ở góc trái */}
          <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl text-white z-20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold">{channelName}</span>
          </div>

          {/* Floating Control Bar (Toolbar) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-xl px-6 py-3 rounded-full z-30 border border-white/10 shadow-2xl transition-transform duration-300 transform group-hover:translate-y-0">
            {/* Nút Micro */}
            <button
              onClick={handleToggleMute}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                muted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={muted ? 'Bật Mic' : 'Tắt Mic'}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Nút Camera */}
            <button
              onClick={handleToggleCamera}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                cameraOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={cameraOff ? 'Bật Camera' : 'Tắt Camera'}
            >
              {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            {/* Nút Tắt Cuộc Gọi */}
            <button
              onClick={handleExitCall}
              className="w-16 h-12 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-transform active:scale-95 shadow-lg ml-2"
              title="Rời cuộc gọi"
            >
              <PhoneOff size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component để render stream của đối tác từ xa
function RemoteVideoPlayer({ user }: { user: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && user.videoTrack) {
      user.videoTrack.play(containerRef.current);
    }
  }, [user.videoTrack]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10"></div>
    </div>
  );
}
