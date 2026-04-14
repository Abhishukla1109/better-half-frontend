"use client";

import { useState } from "react";
import { Camera, Mic, Send } from "lucide-react";

interface FeedInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

export default function FeedInput({ onSend, placeholder = "What\u2019s on your mind?" }: FeedInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="feed-input-bar fixed bottom-[68px] left-0 right-0 z-30 lg:left-[240px] xl:left-[280px] lg:bottom-0">
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl px-4 py-2 shadow-sm border border-outline-variant/15">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/50 outline-none min-w-0"
          />
          <div className="flex items-center gap-1">
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors duration-200 cursor-pointer"
              aria-label="Take a photo"
            >
              <Camera className="w-5 h-5 text-on-surface-variant" strokeWidth={1.5} />
            </button>
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors duration-200 cursor-pointer"
              aria-label="Voice input"
            >
              <Mic className="w-5 h-5 text-on-surface-variant" strokeWidth={1.5} />
            </button>
            {value.trim() && (
              <button
                onClick={handleSubmit}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-container transition-colors duration-200 cursor-pointer animate-fade-in-up"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 text-on-primary-container" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
