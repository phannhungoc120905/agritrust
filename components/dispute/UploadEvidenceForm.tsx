'use client';

import React, { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

interface UploadEvidenceFormProps {
  onUrlsChange: (urls: string[]) => void;
}

export default function UploadEvidenceForm({ onUrlsChange }: UploadEvidenceFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUploadFake = () => {
    setUploading(true);
    // Giả lập lưu vào Supabase Storage trong 1.5 giây
    setTimeout(() => {
      const mockUrl = `https://supabase.co/storage/v1/object/public/evidences/defect_${Math.floor(Math.random() * 1000)}.jpg`;
      const newImages = [...images, mockUrl];
      setImages(newImages);
      onUrlsChange(newImages);
      setUploading(false);
    }, 1200);
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, idx) => idx !== index);
    setImages(newImages);
    onUrlsChange(newImages);
  };

  return (
    <div className="space-y-2 text-xs">
      <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
        Ảnh bằng chứng chất lượng hàng hóa
      </label>
      
      <div className="flex flex-wrap gap-2.5">
        {images.map((url, idx) => (
          <div key={idx} className="relative w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden group">
            <img src={url} alt="Evidence" className="w-full h-full object-cover" />
            <button
              onClick={() => handleRemove(idx)}
              className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        
        <button
          type="button"
          onClick={handleUploadFake}
          disabled={uploading}
          className="w-16 h-16 rounded-lg border border-dashed border-neutral-350 bg-neutral-50 hover:bg-neutral-100 flex flex-col items-center justify-center text-neutral-450 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <span className="text-[9px] animate-pulse font-medium">Tải...</span>
          ) : (
            <>
              <Camera size={16} className="text-neutral-400" />
              <span className="text-[9px] mt-0.5 font-bold">Chụp ảnh</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
