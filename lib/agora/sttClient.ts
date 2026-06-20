// Client kết nối với Agora Real-time Speech-to-Text
export class AgoraSTTClient {
  private appId: string;
  private channelName: string;
  private isListening: boolean = false;
  private onTranscriptCallback?: (text: string, userId: string) => void;

  constructor(channelName: string) {
    this.appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
    this.channelName = channelName;
  }

  // Bắt đầu lắng nghe và chuyển giọng nói thành văn bản
  public async startSTT(onTranscript: (text: string, userId: string) => void) {
    if (this.isListening) return;
    this.onTranscriptCallback = onTranscript;
    this.isListening = true;
    console.log(`Bắt đầu dịch hội thoại trực tiếp trong channel: ${this.channelName}`);
    
    // Giả lập nhận transcript sau mỗi vài giây trong hackathon demo
    this.mockSTT();
  }

  // Dừng dịch hội thoại
  public stopSTT() {
    this.isListening = false;
    console.log("Đã dừng dịch hội thoại.");
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
    }, 8000); // 8 giây gửi 1 câu
  }
}
