/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        legend: {
          bg: '#0a0a0c',
          panel: '#151318',
          border: '#3c3226',
          'border-gold': '#c49a45',
          gold: '#f3c258',
          'gold-light': '#fae588',
          'gold-dark': '#8a6524',
          hp: '#dc2626',
          mp: '#2563eb',
          exp: '#10b981',
          // 品质配色
          q0: '#cbd5e1', // 普通 白
          q1: '#22c55e', // 优秀 绿
          q2: '#3b82f6', // 精良 蓝
          q3: '#a855f7', // 史诗 紫
          q4: '#f97316', // 传说 橙
        }
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(243, 194, 88, 0.4)',
        'blue-glow': '0 0 15px rgba(59, 130, 246, 0.5)',
        'purple-glow': '0 0 18px rgba(168, 85, 247, 0.6)',
        'orange-glow': '0 0 20px rgba(249, 115, 22, 0.7)',
        'panel': '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 0 0 1px #3c3226',
      }
    },
  },
  plugins: [],
}
