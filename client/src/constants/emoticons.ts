export interface EmoticonSet {
    id: string;
    title: string;
    folder: string;
    emoticons: string[];
}

export const EMOTICON_SETS: EmoticonSet[] = [
    {
        id: 'dog',
        title: '강아지',
        folder: 'dog',
        emoticons: ['1.png', '2.png']
    },
    {
        id: 'cat',
        title: '고양이',
        folder: 'cat',
        emoticons: ['1.png', '2.png']
    }
];
