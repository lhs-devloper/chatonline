import { useState } from 'react';
import { motion } from 'framer-motion';
import { EMOTICON_SETS, type EmoticonSet } from '../constants/emoticons';

interface Props {
    onSelect: (emoticonUrl: string) => void;
    onClose: () => void;
}

export default function EmoticonPicker({ onSelect, onClose }: Props) {
    const [selectedSet, setSelectedSet] = useState<EmoticonSet>(EMOTICON_SETS[0]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 left-4 w-72 bg-white rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden border border-gray-100"
        >
            {/* Header / Tabs */}
            <div className="flex border-b overflow-x-auto scrollbar-hide">
                {EMOTICON_SETS.map((set) => (
                    <button
                        key={set.id}
                        onClick={() => setSelectedSet(set)}
                        className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${selectedSet.id === set.id
                            ? 'text-pastel-blue border-b-2 border-pastel-blue bg-pastel-blue/5'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {set.title}
                    </button>
                ))}
            </div>

            {/* Emoticon Grid */}
            <div className="flex-1 p-3 h-64 overflow-y-auto grid grid-cols-3 gap-2 bg-gray-50/50">
                {selectedSet.emoticons.map((emo, idx) => {
                    const url = `/emoticons/${selectedSet.folder}/${emo}`;
                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                onSelect(url);
                                onClose();
                            }}
                            className="aspect-square bg-white rounded-xl shadow-sm border border-gray-100 p-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
                        >
                            <img
                                src={url}
                                alt={`Emoticon ${idx}`}
                                className="max-w-full max-h-full object-contain group-hover:brightness-105"
                            />
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t bg-white flex justify-end">
                <button onClick={onClose} className="text-[11px] text-gray-400 font-bold hover:text-gray-600 px-2 py-1">닫기</button>
            </div>
        </motion.div>
    );
}
