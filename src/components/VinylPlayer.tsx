'use client';

import React, { useEffect, useState } from 'react';

interface VinylPlayerProps {
  currentTrack: any;
  isPlaying: boolean;
}

export default function VinylPlayer({ currentTrack, isPlaying }: VinylPlayerProps) {
  const [notes, setNotes] = useState<{ id: number; left: number; symbol: string; delay: number; color: string }[]>([]);

  // Generate floating notes when playing
  useEffect(() => {
    if (!isPlaying) return;

    const symbols = ['♪', '♫', '♬', '♩'];
    const colors = ['#F4A261', '#E76F51', '#2A9D8F', '#E9C46A', '#EF476F'];
    
    const interval = setInterval(() => {
      setNotes((prevNotes) => {
        // Keep at most 12 notes to prevent lag
        const newNote = {
          id: Date.now() + Math.random(),
          left: 10 + Math.random() * 80, // Random position between 10% and 90% width
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
          delay: Math.random() * 0.5, // Slight random delay
          color: colors[Math.floor(Math.random() * colors.length)]
        };
        // Clean up old notes
        return [...prevNotes.slice(-11), newNote];
      });
    }, 600); // New note every 600ms

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="relative w-[300px] h-[340px] sm:w-[340px] sm:h-[380px] flex flex-col items-center justify-end mb-4">
      
      {/* Floating Notes Container */}
      <div className="absolute top-0 left-0 right-0 bottom-40 pointer-events-none overflow-visible z-0">
        {notes.map((note) => (
          <div
            key={note.id}
            className="absolute bottom-0 text-3xl sm:text-4xl font-bold animate-float-up opacity-0 drop-shadow-md"
            style={{
              left: `${note.left}%`,
              animationDelay: `${note.delay}s`,
              color: note.color,
            }}
          >
            {note.symbol}
          </div>
        ))}
      </div>

      {/* Retro Player Casing (Top-down premium view) */}
      <div className="relative w-[280px] h-[300px] sm:w-[320px] sm:h-[340px] bg-gradient-to-br from-[#FFD166] to-[#F4A261] rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.6)] p-5 flex flex-col items-center border-b-[10px] border-r-[10px] border-[#E76F51]/40 z-10 transition-transform">
        
        {/* Pink Accent Line / Inner Bevel */}
        <div className="absolute inset-2 border-2 border-[#EF476F]/20 rounded-[2rem] pointer-events-none"></div>

        {/* Top Panel accents (knobs and buttons) */}
        <div className="absolute bottom-5 left-5 flex gap-3 items-end">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-600 shadow-[0_4px_6px_rgba(0,0,0,0.4)] flex items-center justify-center">
             <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
          </div>
          <div className="flex gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#2A9D8F] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></div>
            <div className="w-4 h-4 rounded-full bg-[#EF476F] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></div>
          </div>
        </div>
        
        {/* Speaker Grill / Vents */}
        <div className="absolute bottom-6 right-7 flex flex-col gap-1.5">
          <div className="w-14 h-1.5 bg-[#E76F51]/60 rounded-full shadow-inner"></div>
          <div className="w-14 h-1.5 bg-[#E76F51]/60 rounded-full shadow-inner"></div>
          <div className="w-14 h-1.5 bg-[#E76F51]/60 rounded-full shadow-inner"></div>
          <div className="w-14 h-1.5 bg-[#E76F51]/60 rounded-full shadow-inner"></div>
        </div>

        {/* The Turntable Platter */}
        <div className="mt-2 relative w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-full bg-[#111] shadow-[0_15px_25px_rgba(0,0,0,0.7)] flex items-center justify-center border-4 border-zinc-800 z-20">
          
          {/* Vinyl Grooves */}
          <div className="absolute inset-[6px] rounded-full border border-zinc-700/50 pointer-events-none"></div>
          <div className="absolute inset-[16px] rounded-full border border-zinc-700/40 pointer-events-none"></div>
          <div className="absolute inset-[26px] rounded-full border border-zinc-700/30 pointer-events-none"></div>
          <div className="absolute inset-[36px] rounded-full border border-zinc-700/20 pointer-events-none"></div>
          <div className="absolute inset-[46px] rounded-full border border-zinc-700/10 pointer-events-none"></div>

          {/* Dynamic Album Art & Vinyl Inner Area */}
          <div 
            className="relative w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-full overflow-hidden shadow-inner flex items-center justify-center border-2 border-zinc-950 animate-spin-slow bg-zinc-900"
            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
          >
            <img 
              src={currentTrack?.thumbnail || '/assets/images/18.jpg'} 
              alt={currentTrack?.title || 'Album Art'} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/assets/images/18.jpg';
              }}
            />
            {/* Center Spindle Hole */}
            <div className="absolute w-5 h-5 bg-zinc-300 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] z-10 border border-zinc-400 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Tonearm */}
        <div className={`absolute top-6 right-5 w-10 h-36 origin-[20px_20px] transition-transform duration-700 ease-in-out z-30 ${isPlaying ? 'rotate-[20deg]' : '-rotate-[15deg]'}`}>
          {/* Base Pivot */}
          <div className="absolute top-0 right-0 w-10 h-10 bg-gradient-to-br from-zinc-200 to-zinc-400 rounded-full shadow-[0_5px_10px_rgba(0,0,0,0.5)] border border-zinc-500 flex items-center justify-center">
             <div className="w-5 h-5 bg-zinc-800 rounded-full border-2 border-zinc-600 shadow-inner"></div>
          </div>
          {/* Arm */}
          <div className="absolute top-8 right-[17px] w-[6px] h-24 bg-gradient-to-r from-zinc-300 to-zinc-500 shadow-md transform -rotate-6 origin-top rounded-full"></div>
          {/* Headshell */}
          <div className="absolute top-[110px] right-[28px] w-5 h-10 bg-zinc-800 rounded-sm shadow-lg transform -rotate-[25deg] border-t-2 border-zinc-600">
             <div className="absolute bottom-1 right-[-2px] w-1 h-3 bg-zinc-400 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
