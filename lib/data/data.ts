// 這裡放不屬於API的interface (單純跑map需要用的)
// service的data放API會用到的interface
export const historyItems = [
  { id: 1, name: '手術紀錄', description: '' },
  { id: 2, name: '住院/出院紀錄', description: '' },
  { id: 3, name: '住院病歷清單', description: '' },
];

export const sections = [
  { label: "GENERAL CONDITION", key: "generalCondition" },
  { label: "CHEST AND LUNGS", key: "chestAndLungs" },
  { label: "ABDOMEN", key: "abdomen" },
  { label: "HEENT", key: "heent" },
  { label: "NECK", key: "neck" },
  { label: "BACK AND SPINE", key: "backAndSpine" },
  { label: "EXOGENITALIA", key: "exogenitalia" },
  { label: "RECTAL EXAM", key: "rectalExam" },
  { label: "EXTREMITIES", key: "extremities" },
  { label: "NEUROLOGICAL EXAM", key: "neurologicalExam" }
];
export const moduleManage = [
  "外科",
  "內科",
  "兒科",
  "婦科",
  
  "PRESENT ILLNESS",
  "PAST HISTORY",
  "GENERAL CONDITION", 
  "CHEST AND LUNGS", 
  "ABDOMEN", 
  "HEENT", 
  "NECK", 
  "BACK AND SPINE", 
  "EXOGENITALIA", 
  "RECTAL EXAM", 
  "EXTREMITIES", 
  "NEUROLOGICAL EXAM"
]
