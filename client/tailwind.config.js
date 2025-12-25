/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                pastel: {
                    blue: '#A7C7E7',
                    darkBlue: '#89CFF0',
                    bg: '#F0F8FF',
                    chatMe: '#A7C7E7',
                    chatOther: '#FFFFFF',
                }
            }
        },
    },
    plugins: [],
}
