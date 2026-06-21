// Client kết nối với Agora Real-time Speech-to-Text
// Sử dụng Web Speech API (SpeechRecognition) cho STT tiếng Việt thời gian thực
// Fallback về mock data nếu trình duyệt không hỗ trợ

export class AgoraSTTClient {
  private appId: string;
  private channelName: string;
  private isListening: boolean = false;
  private onTranscriptCallback?: (text: string, userId: string) => void;
  private recognition: any = null;
  private currentUserId: string = 'nong_dan';
  private usingMock: boolean = false;

  constructor(channelName: string) {
    this.appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
    this.channelName = channelName;
  }

  /**
   * Bắt đầu lắng nghe và chuyển giọng nói thành văn bản
   * @param onTranscript Callback nhận text + userId khi có transcript mới
   * @param userId Vai trò của người nói hiện tại ('nong_dan' | 'thuong_lai')
   * @param useMock Bắt buộc dùng mock (để giả lập khi demo)
   */
  public async startSTT(
    onTranscript: (text: string, userId: string) => void,
    userId: string = 'nong_dan',
    useMock: boolean = false
  ) {
    if (this.isListening) return;
    this.onTranscriptCallback = onTranscript;
    this.currentUserId = userId;
    this.isListening = true;

    if (useMock) {
      console.log(`[STT] Chạy chế độ giả lập hội thoại trong channel: ${this.channelName}`);
      this.usingMock = true;
      this.mockSTT();
      return;
    }

    // Thử dùng Web Speech API (SpeechRecognition) cho STT thật
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      console.log(`[STT] Khởi tạo Web Speech API (vi-VN) trong channel: ${this.channelName}`);
      this.usingMock = false;
      this.startRealSTT(SpeechRecognition);
    } else {
      console.warn('[STT] Trình duyệt không hỗ trợ Web Speech API. Chuyển sang mock.');
      this.usingMock = true;
      this.mockSTT();
    }
  }

  /**
   * Tích hợp Web Speech API thật cho nhận diện giọng nói tiếng Việt
   */
  private startRealSTT(SpeechRecognition: any) {
    const recognition = new SpeechRecognition();
    this.recognition = recognition;

    // Cấu hình SpeechRecognition
    recognition.lang = 'vi-VN';           // Tiếng Việt
    recognition.continuous = true;         // Liên tục nhận diện
    recognition.interimResults = false;    // Chỉ lấy kết quả cuối cùng (final)
    recognition.maxAlternatives = 1;       // Chỉ lấy 1 kết quả tốt nhất

    // Sự kiện nhận kết quả nhận diện
    recognition.onresult = (event: any) => {
      if (!this.isListening) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript.length > 0 && this.onTranscriptCallback) {
            console.log(`[STT Real] ${this.currentUserId}: "${transcript}"`);
            this.onTranscriptCallback(transcript, this.currentUserId);
          }
        }
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
      console.error('[STT] Lỗi nhận diện:', event.error);
      // Nếu lỗi "not-allowed" (user từ chối mic), chuyển sang mock
      if (event.error === 'not-allowed' || event.error === 'service-not-available') {
        console.warn('[STT] Chuyển sang chế độ mock do lỗi quyền truy cập mic.');
        this.usingMock = true;
        this.mockSTT();
      }
      // Các lỗi khác (no-speech, aborted) sẽ tự restart qua onend
    };

    // Bắt đầu nhận diện
    try {
      recognition.start();
      console.log('[STT] Đã bắt đầu nhận diện giọng nói tiếng Việt.');
    } catch (e) {
      console.error('[STT] Không thể bắt đầu recognition:', e);
      this.usingMock = true;
      this.mockSTT();
    }
  }

  /**
   * Đổi vai trò người nói (khi đang dùng STT thật, mỗi lượt nói có thể đổi người)
   */
  public setSpeaker(userId: string) {
    this.currentUserId = userId;
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

  // Dừng dịch hội thoại
  public stopSTT() {
    this.isListening = false;

    // Dừng Web Speech API nếu đang chạy
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Bỏ qua
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
          this.onTranscriptCallback(item.text, item.user);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 600); // Giả lập siêu tốc (0.6 giây gửi 1 câu để demo diễn ra cực kỳ nhanh chóng)
  }
}
