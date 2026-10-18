import { CalendarDays, Camera, Check, Image as ImageIcon, Link2, QrCode, RotateCcw, Share2, UserRound } from 'lucide-react';

export function HowGuideVisual({ audience, index, description }: { audience: 'host' | 'guest'; index: number; description: string }) {
  const host = audience === 'host';
  return <div role="img" aria-label={description} data-guide-visual={`${audience}-${index}`} className={`flex items-center justify-center overflow-hidden bg-[#e9eedc] p-4 dark:bg-[#243020] ${host ? 'aspect-[16/9]' : 'aspect-[4/3] rounded-xl'}`}>
    <div aria-hidden="true" className="flex h-full w-full max-w-64 items-center justify-center">
      {host && index === 0 && <div className="w-full rounded-xl border border-[#b7c3aa] bg-white p-3 shadow-lg">
        <div className="mb-3 flex gap-1 border-b border-[#e2e8dd] pb-2"><span className="size-1.5 rounded-full bg-[#d8ff3d]" /><span className="size-1.5 rounded-full bg-[#d0d8cb]" /><span className="size-1.5 rounded-full bg-[#d0d8cb]" /></div>
        <div className="mb-2 h-2 w-1/2 rounded-full bg-[#283628]" /><div className="mb-3 h-6 rounded-md border border-[#d6dfd0]" />
        <div className="grid grid-cols-2 gap-2"><div className="flex h-8 items-center gap-2 rounded-md border border-[#d6dfd0] px-2"><CalendarDays size={14} className="text-[#526751]" /><span className="h-1.5 flex-1 rounded-full bg-[#d6dfd0]" /></div><div className="h-8 rounded-md border border-[#d6dfd0]" /></div>
        <div className="mt-3 h-5 w-24 rounded-full bg-[#d8ff3d]" />
      </div>}
      {host && index === 1 && <div className="flex w-full items-center gap-4 rounded-xl border border-[#b7c3aa] bg-white p-4 shadow-lg"><div className="flex size-20 shrink-0 items-center justify-center rounded-lg border-2 border-[#1c271d]"><QrCode size={54} className="text-[#1c271d]" /></div><div className="min-w-0 flex-1"><div className="mb-3 h-2 w-3/4 rounded-full bg-[#283628]" /><div className="flex h-7 items-center gap-1 rounded-full bg-[#edf1ea] px-2"><Link2 size={13} className="text-[#526751]" /><span className="h-1.5 flex-1 rounded-full bg-[#b7c3aa]" /></div><Share2 size={20} className="mt-3 text-[#526751]" /></div></div>}
      {host && index === 2 && <div className="w-full rounded-xl border border-[#b7c3aa] bg-white p-3 shadow-lg"><div className="mb-3 flex items-center justify-between"><div className="h-2 w-20 rounded-full bg-[#283628]" /><ImageIcon size={16} className="text-[#526751]" /></div><div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((photo) => <div key={photo} className="relative flex aspect-square items-center justify-center rounded-lg bg-[#d9e6d0]"><ImageIcon size={21} className="text-[#668063]" />{photo === 1 && <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#d8ff3d]"><Check size={13} className="text-[#1c271d]" /></span>}</div>)}</div><div className="mt-3 h-2 w-2/3 rounded-full bg-[#d6dfd0]" /></div>}
      {!host && <div className="flex h-full max-h-48 w-32 flex-col items-center rounded-[22px] border-[5px] border-[#1c271d] bg-white p-2 shadow-lg">
        <span className="mb-2 h-1 w-8 rounded-full bg-[#1c271d]" />
        {index === 0 && <div className="flex flex-1 items-center justify-center"><div className="flex size-20 items-center justify-center rounded-xl border-2 border-dashed border-[#526751]"><QrCode size={53} className="text-[#1c271d]" /></div></div>}
        {index === 1 && <div className="flex w-full flex-1 flex-col items-center justify-center gap-3"><UserRound size={26} className="text-[#526751]" /><div className="h-7 w-full rounded-md border border-[#b7c3aa] bg-[#f7f9f4]" /><div className="h-6 w-3/4 rounded-full bg-[#d8ff3d]" /></div>}
        {index === 2 && <div className="flex w-full flex-1 flex-col items-center justify-between rounded-lg bg-[#283628] py-3"><Camera size={34} className="mt-6 text-white" /><span className="size-8 rounded-full border-[5px] border-[#d8ff3d]" /></div>}
        {index === 3 && <div className="flex w-full flex-1 flex-col justify-end gap-3 rounded-lg bg-[#d9e6d0] p-2"><ImageIcon size={37} className="mx-auto mb-auto mt-5 text-[#668063]" /><div className="flex justify-around"><RotateCcw size={18} className="text-[#283628]" /><span className="flex size-6 items-center justify-center rounded-full bg-[#d8ff3d]"><Check size={16} className="text-[#1c271d]" /></span></div></div>}
      </div>}
    </div>
  </div>;
}
