# Smart-Medical-Records

> **這是刪去機密資料後的DEMO版專案，並不會實際與後端對話以及進行查詢，只會回傳假資料。**  

本系統由 [陳泓毓](https://hyc.eshachem.com/) 進行全端開發。
[點擊此處](https://emergency.ntubimdbirc.tw/)可前往DEMO版網站。

本專案為 **Next.js 14 + TypeScript + App Router (RSC)** 全端專案，急診病歷輔助書寫系統。

## 技術架構

- **Frontend**：React 18、Next.js App Router、SCSS Modules
- **Backend**：Server Actions（`app/actions/*`）為主要後端入口
- **對外 API**：僅保留院方整合與語音等必要 Route Handlers（`app/api/*/route.ts`）
- **資料庫**
  - MySQL（ICD / Model / 分析紀錄）
  - DB2（HIS，透過 Python 腳本 `scripts/*.py` 查詢）
- **AI / 語音**：院方 Gemma API、飛利浦 AI Gateway、Whisper ASR

## 安裝與啟動（開發模式）

```bash
npm install
npm run dev
```

預設網址：`http://localhost:3000`

## DB2（Python 微服務）

DB2 與 Next.js 不相容，改以 Python 子程序查詢，腳本位於 `scripts/`：

```bash
python scripts/db2_pbasinfo.py <histno> <caseno> <docid>
python scripts/query_db2.py <histno> [docid]
python scripts/db2_vitals.py <histno> <caseno>
```

正式部署可選用 PyInstaller 打包（部署環境腳本不可 print 中文到 stderr）：

```bash
pyinstaller -F scripts/query_db2.py
```

## Next.js、PM2 部署

```bash
pm2 stop 0
npm run build
pm2 restart 0
pm2 log
pm2 list
```

`next.config.mjs` 需設定 Server Actions 白名單：

```javascript
experimental: {
  serverActions: {
    allowedOrigins: [
      '10.97.241.160',
      'localhost:3000',
      'localhost:3001',
      '127.0.0.1:3001',
      'smarters.vghtpe.gov.tw',
    ],
    bodySizeLimit: '25mb',
  },
},
```

## 語法與分層規則

- `app/*` 預設是 **Server Component**
- 有 `useState` / `useEffect` / `onClick` / `window` / `localStorage` 的檔案，必須加 `"use client"`
- 內部後端邏輯寫在 `app/actions/*Actions.ts`（`"use server"`）
- 前端元件呼叫 Server Action，不直接連 DB
- 對外整合 API 寫在 `app/api/*/route.ts`（如 `external-session`、`session-handoff`、`whisper/*`）

## npm 指令

```bash
npm install      # 安裝依賴
npm run dev      # 開發模式
npm run build    # 正式建置
npm start        # 啟動正式伺服器（需先 build）
npm run lint     # ESLint 檢查
```
