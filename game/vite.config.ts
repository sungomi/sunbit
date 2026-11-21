import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 썬빗(../sunbit) 안의 rpg/ 폴더로 빌드해서 iframe으로 띄워요. 상대 경로(base './')라 어느 주소에서도 동작해요.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../rpg',
    emptyOutDir: true,
  },
})
