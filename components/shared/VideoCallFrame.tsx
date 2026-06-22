'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, PhoneOff, PhoneCall, Loader2, MessageSquare } from 'lucide-react';

interface VideoCallFrameProps {
  channelName: string;
  role: 'nong_dan' | 'thuong_lai';
  onJoinedStateChange?: (joined: boolean, isDemo: boolean) => void;
  onHangUp?: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

export default function VideoCallFrame({ channelName, role, onJoinedStateChange, onHangUp, onToggleChat, isChatOpen }: VideoCallFrameProps) {
  const router = useRouter();
  const [inCall, setInCall] = useState(false);
  const [isDemoCall, setIsDemoCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const rtcClientRef = useRef<any>(null);
  const localTracksRef = useRef<{ videoTrack: any; audioTrack: any } | null>(null);

  const onJoinedStateChangeRef = useRef(onJoinedStateChange);
  useEffect(() => {
    onJoinedStateChangeRef.current = onJoinedStateChange;
  }, [onJoinedStateChange]);

  // Sync inCall state with parent
  useEffect(() => {
    onJoinedStateChangeRef.current?.(inCall, isDemoCall);
  }, [inCall, isDemoCall]);

  // Khởi tạo Agora Client và kết nối cuộc gọi
  const startCall = async () => {
    setIsDemoCall(false);
    setIsJoining(true);
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      AgoraRTC.setLogLevel(4); // Tắt log của Agora (mức NONE) để tránh Next.js bung màn hình đỏ khi test máy thiếu mic/cam
      
      // 1. Chạy song song xin quyền Camera/Micro và lấy Token từ API để tăng tốc độ join
      const tokenPromise = fetch(`/api/agora-token?channelName=${encodeURIComponent(channelName)}`)
        .then(res => res.ok ? res.json() : null)
        .catch(err => {
          console.warn('Lỗi lấy token:', err);
          return null;
        });

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
      client.on('user-joined', (user: any) => {
        setRemoteUsers((prev) => {
          if (prev.find((u) => u.uid === user.uid)) return prev;
          return [...prev, user];
        });
      });

      client.on('user-left', (user: any) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

       client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
         try {
           await client.subscribe(user, mediaType);
           setRemoteUsers((prev) => [...prev]);
           if (mediaType === 'audio') {
             user.audioTrack?.play();
           }
         } catch (subErr) {
           console.error('Lỗi khi subscribe user:', subErr);
         }
       });

      client.on('user-unpublished', (user: any, mediaType: 'video' | 'audio') => {
        if (mediaType === 'audio') {
          user.audioTrack?.stop();
        }
        setRemoteUsers((prev) => [...prev]);
      });

      // 3. Đợi Token API resolve xong và Join Kênh NGAY LẬP TỨC
      const tokenData = await tokenPromise;
      const token = tokenData?.token || null;

      try {
        const uid = await client.join(appId, channelName, token, null);
        console.log(`Đã kết nối cuộc gọi thật thành công, UID: ${uid}`);
        
        // Cho phép vào phòng ngay lập tức (hiển thị UI) ngay khi join channel
        setInCall(true);

        // 4. Bắt đầu xin quyền Camera/Micro SAU KHI đã join (user sẽ thấy mình đã ở trong phòng)
        let audioTrack: any = null;
        let videoTrack: any = null;

        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (audioErr) {
          console.warn('Không thể lấy quyền Micro:', audioErr);
          setMuted(true);
        }

        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack();
        } catch (videoErr) {
          console.warn('Không thể lấy quyền Camera:', videoErr);
          setCameraOff(true);
        }

        localTracksRef.current = { audioTrack, videoTrack };

        const tracksToPublish = [];
        if (audioTrack) tracksToPublish.push(audioTrack);
        if (videoTrack) tracksToPublish.push(videoTrack);

        // Phát sóng các track lên phòng
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }

        // Hiện video lên màn hình của mình
        setTimeout(() => {
          if (localVideoRef.current && videoTrack) {
            videoTrack.play(localVideoRef.current);
          }
        }, 50);

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
        
        // Dọn dẹp client nếu đã tạo nhưng không thể join
        if (rtcClientRef.current) {
          try {
            await rtcClientRef.current.leave();
          } catch (e) {
            // Bỏ qua lỗi khi dọn dẹp
          }
          rtcClientRef.current = null;
        }
      }
      setIsJoining(false);

  } catch (err: any) {
    console.error('Lỗi kết nối Video Call:', err);
    // Thay vì throw lỗi đỏ làm Next.js crash, ta bypass qua luồng giả lập
    setInCall(true);
    setCameraOff(true);
    setMuted(true);
    
    // Dọn dẹp client nếu đã tạo nhưng có lỗi xảy ra trước khi join
    if (rtcClientRef.current) {
      try {
        await rtcClientRef.current.leave();
      } catch (e) {
        // Bỏ qua lỗi khi dọn dẹp
      }
      rtcClientRef.current = null;
    }
    
    // Cung cấp hướng dẫn cụ thể hơn dựa trên lỗi
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let message = 'Không thể kết nối Video Call. Vui lòng kiểm tra kết nối mạng và thử lại.';
    if (err.message?.includes('Failed to execute')) {
      message = 'Lỗi trình duyệt: Vui lòng kiểm tra xem bạn có đang sử dụng chế độ Riêng tư (Private Browsing) không và đảm bảo đã cho phép truy cập Microphone và Camera.';
      if (isSafari) {
        message += ' Trên Safari, vào Safari → Preferences → Privacy & Security và đảm bảo "Prevent cross-site tracking" không được bật.';
      }
    } else if (err.message?.includes('not found') || err.message?.includes('no device')) {
      message = 'Không tìm thấy thiết bị Microphone hoặc Camera. Vui lòng kiểm tra kết nối thiết bị.';
    }
    alert(message);
  } finally {
    setIsJoining(false);
  }
};

  // Vào phòng không cần Camera (Demo Mode an toàn)
  const joinDemoMode = async () => {
    await endCall(); // Dọn dẹp trạng thái hiện tại
    setIsDemoCall(true);
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
    setIsDemoCall(false);
    setMuted(false);
    setCameraOff(false);
  };

  // Rời phòng và quay lại Dashboard
  const handleExitCall = async () => {
    await endCall();
    if (onHangUp) {
      onHangUp();
    } else {
      router.push('/');
    }
  };

  // Mute / Unmute âm thanh
  const handleToggleMute = async () => {
    try {
      if (localTracksRef.current?.audioTrack) {
        const nextState = !muted;
        await localTracksRef.current.audioTrack.setMuted(nextState);
        setMuted(nextState);
      } else {
        // Xin lại quyền tạo Audio Track nếu trước đó chưa có
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        
        // Kiểm tra xem máy tính có cắm Mic thật không
        const mics = await AgoraRTC.getMicrophones();
        if (mics.length === 0) {
          alert("Hệ thống báo cáo: Không tìm thấy bất kỳ Microphone vật lý nào được cắm vào máy tính của bạn. Vui lòng cắm tai nghe có mic hoặc bật mic hệ thống!");
          return;
        }

        const newAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        
        if (!localTracksRef.current) localTracksRef.current = { audioTrack: null, videoTrack: null };
        localTracksRef.current.audioTrack = newAudioTrack;
        
        if (rtcClientRef.current) {
          await rtcClientRef.current.publish([newAudioTrack]);
        }
        setMuted(false);
      }
      } catch (err: any) {
        console.warn("Không thể bật micro:", err);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // Kiểm tra xem có phải lỗi do từ chối quyền không
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          let message = "Lỗi cấp quyền: Bạn đã từ chối quyền truy cập Microphone. Hãy vào cài đặt trang web (icon Ổ khoá trên thanh URL) và cho phép truy cập Microphone.";
          if (isSafari) {
            message += " Trên Safari, bạn có thể cần truy cập vào Safari → Preferences → Websites → Microphone để cho phép.";
          }
          alert(message);
        } else if (err.message?.includes('not found') || err.message?.includes('no device')) {
          alert("Không tìm thấy thiết bị Microphone. Vui lòng kiểm tra xem Microphone đã được cắm và bật đúng cách chưa.");
        } else {
          let message = "Lỗi cấp quyền: Trình duyệt của bạn đang chặn quyền Mic, hoặc tab ẩn danh không cho phép truy cập. Hãy bấm vào icon Ổ khoá trên thanh URL để cho phép!";
          if (isSafari) {
            message += " Trên Safari, hãy kiểm tra xem bạn có đang sử dụng chế độ Riêng tư (Private Browsing) không, vì 이 chế độ иногда limita l 접근 để microphone.";
          }
          alert(message);
        }
      }
  };

  // Bật / Tắt Video Camera
  const handleToggleCamera = async () => {
    try {
      if (localTracksRef.current?.videoTrack) {
        const nextState = !cameraOff;
        await localTracksRef.current.videoTrack.setMuted(nextState);
        setCameraOff(nextState);
        } else {
          // Xin lại quyền tạo Video Track nếu trước đó chưa có
          const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
          const newVideoTrack = await AgoraRTC.createCameraVideoTrack();
          
          if (!localTracksRef.current) localTracksRef.current = { audioTrack: null, videoTrack: null };
          localTracksRef.current.videoTrack = newVideoTrack;
          
          if (rtcClientRef.current) {
            await rtcClientRef.current.publish([newVideoTrack]);
          }
          setCameraOff(false);
          
          // Play video
          setTimeout(() => {
            if (localVideoRef.current && localTracksRef.current?.videoTrack) {
              localTracksRef.current.videoTrack.play(localVideoRef.current);
            }
          }, 100);
        }
      } catch (err: any) {
        console.warn("Không thể bật camera:", err);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // Kiểm tra xem có phải lỗi do từ chối quyền không
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          let message = "Lỗi cấp quyền: Bạn đã từ chối quyền truy cập Camera. Hãy vào cài đặt trang web (icon Ổ khoá trên thanh URL) và cho phép truy cập Camera.";
          if (isSafari) {
            message += " Trên Safari, bạn có thể cần truy cập vào Safari → Preferences → Websites → Camera để cho phép.";
          }
          alert(message);
        } else if (err.message?.includes('not found') || err.message?.includes('no device')) {
          alert("Không tìm thấy thiết bị Camera. Vui lòng kiểm tra xem Camera đã được cắm và bật đúng cách chưa.");
        } else {
          let message = "Không tìm thấy Camera hoặc chưa cấp quyền!";
          if (isSafari) {
            message += " Trên Safari, hãy kiểm tra xem bạn có đang sử dụng chế độ Riêng tư (Private Browsing) không, vì 이 chế độ иногда limita l 접근 đến camera.";
          }
          alert(message);
        }
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

            {/* Nút Lịch Sử Trò Chuyện */}
            <button
              onClick={onToggleChat}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                isChatOpen ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isChatOpen ? 'Ẩn lịch sử đàm thoại' : 'Xem lịch sử đàm thoại'}
            >
              <MessageSquare size={20} />
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
  }, [user, user.videoTrack]); // Theo dõi cả object user để update khi bật/tắt cam

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full object-cover" />
      
      {!user.videoTrack && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900">
          <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <VideoOff size={32} className="text-neutral-500" />
          </div>
          <p className="text-neutral-400 text-sm">Đối tác đã tắt Camera</p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10"></div>
    </div>
  );
}
