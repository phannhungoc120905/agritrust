// Client kết nối với Agora Real-time Speech-to-Text
// Sử dụng Web Speech API (SpeechRecognition) cho STT tiếng Việt thời gian thực
// Fallback về mock data nếu trình duyệt không hỗ trợ

export class AgoraSTTClient {
  private appId: string;
  private channelName: string;
  private isListening: boolean = false;
  private onTranscriptCallback?: (text: string, userId: string, isFinal: boolean) => void;
  private onErrorCallback?: (errorType: string, message: string) => void;
  private recognition: any = null;
  private currentUserId: string = 'nong_dan';
  private usingMock: boolean = false;
  private mockFallbackAllowed: boolean = false;
  private sentenceBuffer: string = '';
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(channelName: string) {
    this.appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
    this.channelName = channelName;
  }

  /**
   * Bắt đầu lắng nghe và chuyển giọng nói thành văn bản
   * @param onTranscript Callback nhận text + userId khi có transcript mới
   * @param userId Vai trò của người nói hiện tại ('nong_dan' | 'thuong_lai')
   * @param useMock Bắt buộc dùng mock (để giả lập khi demo)
   * @param onError Callback nhận thông báo lỗi nếu STT thất bại
   */
  public async startSTT(
    onTranscript: (text: string, userId: string, isFinal: boolean) => void,
    userId: string = 'nong_dan',
    useMock: boolean = false,
    onError?: (errorType: string, message: string) => void
  ) {
    if (this.isListening) return;
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
    this.currentUserId = userId;
    this.isListening = true;
    this.mockFallbackAllowed = useMock;

    // Kiểm tra kết nối không bảo mật (HTTP) - Chrome chặn hoàn toàn SpeechRecognition nếu không phải HTTPS hoặc localhost
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      console.warn('[STT] Kết nối không bảo mật (HTTP). SpeechRecognition yêu cầu HTTPS/localhost.');
      if (!useMock) {
        this.isListening = false;
        onError?.(
          'insecure-origin',
          'Ứng dụng đang chạy trên kết nối không bảo mật (HTTP). Nhận diện giọng nói (STT) yêu cầu chạy HTTPS hoặc localhost để hoạt động.'
        );
        return;
      }
    }

    if (useMock) {
      console.log(`[STT] Chạy chế độ giả lập hội thoại trong channel: ${this.channelName}`);
      this.usingMock = true;
      this.mockSTT();
      return;
    }

    // Pre-warm: Chỉ gọi getUserMedia để trình duyệt populate list mic nếu là demo giả lập.
    // Đối với phòng thật, ta nhường hoàn toàn quyền mở mic cho Agora RTC trước để tránh tranh chấp phần cứng.
    try {
      if (useMock && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const warmStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        warmStream?.getTracks().forEach(t => t.stop());
        console.log('[STT] Pre-warm mic thành công.');
      }
    } catch (_) {
      console.warn('[STT] Pre-warm mic thất bại, sẽ thử tiếp...');
    }

    // Thử dùng Web Speech API (SpeechRecognition) cho STT thật
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      console.log(`[STT] Khởi tạo Web Speech API (vi-VN) trong channel: ${this.channelName}`);
      this.usingMock = false;
      try {
        this.startRealSTT(SpeechRecognition);
      } catch (e: any) {
        console.warn('[STT] Không thể khởi tạo Web Speech API:', e);
        onError?.('init-failed', e.message || 'Không thể khởi tạo bộ nhận diện giọng nói SpeechRecognition.');
        if (useMock) {
          this.usingMock = true;
          this.mockSTT();
        } else {
          this.stopSTT();
        }
      }
    } else {
      console.warn('[STT] Trình duyệt không hỗ trợ Web Speech API.');
      onError?.(
        'not-supported',
        'Trình duyệt này không hỗ trợ bộ nhận diện giọng nói của Web (Web Speech API). Khuyên dùng Google Chrome hoặc Microsoft Edge.'
      );
      if (useMock) {
        this.usingMock = true;
        this.mockSTT();
      } else {
        this.stopSTT();
      }
    }
  }

  private startRealSTT(SpeechRecognition: any) {
    const recognition = new SpeechRecognition();
    this.recognition = recognition;

    // Cấu hình SpeechRecognition
    recognition.lang = 'vi-VN';           // Tiếng Việt
    recognition.continuous = true;          // Giữ kết nối liên tục để nhận diện trôi chảy
    recognition.interimResults = true;     // Lấy kết quả tức thời thời gian thực
    recognition.maxAlternatives = 1;       // Chỉ lấy 1 kết quả tốt nhất

    // Sự kiện nhận kết quả nhận diện
    recognition.onresult = (event: any) => {
      if (!this.isListening) return;

      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        if (result.isFinal) {
          // Gộp vào buffer
          if (this.sentenceBuffer) {
            this.sentenceBuffer += ' ' + transcript;
          } else {
            this.sentenceBuffer = transcript;
          }

          // Restart timer để chờ xem người dùng có nói tiếp không
          if (this.flushTimer) clearTimeout(this.flushTimer);
          this.flushTimer = setTimeout(() => {
            this.flushSentenceBuffer();
          }, 300); // Đợi 0.3s im lặng thì chốt câu (tách cực nhanh)
        } else {
          currentInterim += transcript;
        }
      }

      // Phát phụ đề tạm thời: kết hợp những câu đã chốt trong buffer và phần đang nói dở
      const combinedText = (this.sentenceBuffer + (this.sentenceBuffer && currentInterim ? ' ' : '') + currentInterim).trim();
      
      if (combinedText.length > 0 && this.onTranscriptCallback) {
        this.onTranscriptCallback(combinedText, this.currentUserId, false);
      }
    };

    // Khi STT bị ngắt (do tạm dừng giọng nói), tự động restart nếu vẫn đang lắng nghe
    recognition.onend = () => {
      if (this.isListening) {
        console.log('[STT] Tự động restart recognition...');
        try {
          recognition.start();
        } catch (e) {
          // Bỏ qua lỗi nếu đã start rồi
        }
      }
    };

    // Xử lý lỗi
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Chỉ là warning nhẹ, không làm phiền user
        return;
      }
      console.warn('[STT] Cảnh báo nhận diện:', event.error);
      
      let userFriendlyMessage = `Lỗi nhận diện: ${event.error}`;
      if (event.error === 'not-allowed') {
        userFriendlyMessage = 'Trình duyệt chặn truy cập Mic hoặc kết nối không bảo mật. Hãy chạy trên HTTPS / localhost và cấp quyền truy cập micro.';
      } else if (event.error === 'audio-capture') {
        userFriendlyMessage = 'Không tìm thấy thiết bị Microphone phần cứng hoặc micro đang bị chiếm bởi một ứng dụng khác.';
      } else if (event.error === 'service-not-available') {
        userFriendlyMessage = 'Dịch vụ nhận diện Speech của máy chủ trình duyệt không khả dụng. Vui lòng kiểm tra lại kết nối mạng.';
      } else if (event.error === 'network') {
        userFriendlyMessage = 'Lỗi kết nối mạng khi truyền tải luồng âm thanh nhận dạng.';
      } else if (event.error === 'language-not-supported') {
        userFriendlyMessage = 'Trình duyệt này chưa cài đặt gói ngôn ngữ Tiếng Việt (vi-VN) để nhận dạng.';
      }

      this.onErrorCallback?.(event.error, userFriendlyMessage);
      
      if (this.mockFallbackAllowed) {
        console.warn('[STT] Tắt STT do lỗi và chuyển sang MOCK.');
        this.stopSTT();
        this.usingMock = true;
        this.mockSTT();
      } else {
        this.stopSTT();
      }
    };

    // Bắt đầu nhận diện
    try {
      recognition.start();
      console.log('[STT] Đã bắt đầu nhận diện giọng nói tiếng Việt.');
    } catch (e: any) {
      console.warn('[STT] Không thể bắt đầu recognition:', e);
      this.onErrorCallback?.('start-failed', e.message || 'Không thể bắt đầu phiên nhận dạng giọng nói.');
      if (this.mockFallbackAllowed) {
        this.stopSTT();
        this.usingMock = true;
        this.mockSTT();
      } else {
        this.stopSTT();
      }
    }
  }

  /**
   * Đổi vai trò người nói (khi đang dùng STT thật, mỗi lượt nói có thể đổi người)
   */
  public setSpeaker(userId: string) {
    if (this.currentUserId !== userId) {
      this.flushSentenceBuffer();
    }
    this.currentUserId = userId;
  }

  private flushSentenceBuffer() {
    if (this.sentenceBuffer.length > 0 && this.onTranscriptCallback) {
      console.log(`[STT Buffered Final] ${this.currentUserId}: "${this.sentenceBuffer}"`);
      this.onTranscriptCallback(this.sentenceBuffer, this.currentUserId, true);
      this.sentenceBuffer = '';
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Kiểm tra xem đang dùng STT thật hay mock
   */
  public isUsingMock(): boolean {
    return this.usingMock;
  }

  /**
   * Kiểm tra xem STT có đang lắng nghe không
   */
  public isActive(): boolean {
    return this.isListening;
  }

  // Dừng dịch hội thoại và dọn dẹp các sự kiện
  public stopSTT() {
    this.isListening = false;
    this.flushSentenceBuffer();

    // Dừng Web Speech API nếu đang chạy và gỡ bỏ hoàn toàn sự kiện
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.stop();
      } catch (e) {
        // Bỏ qua lỗi khi cố gắng dừng
      }
      this.recognition = null;
    }

    console.log("[STT] Đã dừng dịch hội thoại.");
  }

  // Giả lập hội thoại để phục vụ debug và chạy thử
  private mockSTT() {
    let index = 0;
    const conversation = [
      { text: "Chào anh, vụ lúa này tôi có khoảng 10 tấn lúa thơm ST25 đạt chuẩn xuất khẩu.", user: "nong_dan" },
      { text: "Chào chị, tôi mua giá 9 triệu một tấn được không? Giao trong 5 ngày tới nhé.", user: "thuong_lai" },
      { text: "Giá 9 triệu thì được, nhưng thỏa thuận tỉ lệ lép dưới 10% nha, lép quá 10% phạt 5% đó.", user: "nong_dan" },
      { text: "Ok thống nhất thế. Độ ẩm dưới 14% nữa nha, ẩm trên 14% thì trừ 2% mỗi % ẩm vượt quá.", user: "thuong_lai" }
    ];

    const interval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(interval);
        return;
      }

      if (index < conversation.length) {
        const item = conversation[index];
        if (this.onTranscriptCallback) {
          // Gửi phụ đề tạm trước (chữ chạy)
          this.onTranscriptCallback(item.text, item.user, false);
          
          // Sau đó 300ms thì xác thực hoàn thành
          setTimeout(() => {
            if (this.isListening && this.onTranscriptCallback) {
              this.onTranscriptCallback(item.text, item.user, true);
            }
          }, 300);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000); // 2 giây mỗi câu để trải nghiệm dễ theo dõi hơn
  }
}
