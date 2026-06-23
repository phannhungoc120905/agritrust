'use client';

import React, { useEffect, useRef } from 'react';

interface TranscriptLine {
  id: string;
  vi_nguoi_noi: string;
  noi_dung: string;
  thoi_gian_noi: string;
  den_canh_bao?: 'binh_thuong' | 'canh_bao_do';
}

interface TranscriptPanelProps {
  lines: TranscriptLine[];
}

export default function TranscriptPanel({ lines }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống khi có transcript mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="flex flex-col h-[300px] w-full p-4 bg-white">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {lines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-400 italic text-xs">
            Đang chờ đàm phán bắt đầu...
          </div>
        ) : (
          lines.map((line) => {
            const isNongDan = line.vi_nguoi_noi === 'nong_dan';
            return (
              <div
                key={line.id}
                className={`flex flex-col max-w-[90%] ${isNongDan ? 'mr-auto items-start' : 'ml-auto items-end'}`}
              >
                <span className="text-[10px] text-neutral-400 font-bold mb-1">
                  {isNongDan ? 'Nông dân' : 'Thương lái'}
                </span>
                <div
                  className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    isNongDan
                      ? 'bg-neutral-100 text-neutral-800 rounded-tl-sm border border-neutral-200'
                      : 'bg-indigo-600 text-white rounded-tr-sm'
                  } ${line.den_canh_bao === 'canh_bao_do' ? 'ring-2 ring-red-500 bg-red-50 text-red-900 border-red-200' : ''}`}
                >
                  <p>{line.noi_dung}</p>
                  {line.den_canh_bao === 'canh_bao_do' && (
                    <span className="text-[10px] text-red-600 font-bold block mt-1 uppercase tracking-wider">
                      ⚠️ Giá chênh lệch nhiều!
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-neutral-400 mt-1 font-mono">
                  {new Date(line.thoi_gian_noi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
