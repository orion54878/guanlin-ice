/*
 * 冠霖冰行 ─ 網站基本設定
 * ------------------------------------------------------------
 * 只要改這個檔案，全站的 LINE 按鈕、QR Code、詢問表單都會一起更新。
 */
window.GL_SITE = {
  line: {
    // LINE 官方帳號 ID（含 @），例如 "@123abcde"
    // 填了之後：加好友按鈕、QR Code、「用 LINE 傳送詢問」都會自動啟用
    officialId: "",

    // 個人 LINE 的 ID（不含 @）。目前使用這個。
    // 注意：LINE App 裡「設定 → 個人檔案 → 允許利用 ID 加入好友」要打開，客人才加得到
    personalId: "0968275562",

    // （選填）加好友連結，有填的話優先使用這個網址。
    // LINE App「加入好友 → 行動條碼 → 複製連結」可以取得，
    // 例如 "https://line.me/ti/p/xxxxxxxx" 或 "https://lin.ee/xxxxxx"
    addFriendUrl: ""
  },

  // 電話（表單在 LINE 尚未設定時會請客人改撥這支）
  phone: "0968-275-562"
};
