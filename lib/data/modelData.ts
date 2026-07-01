import {ICDItem} from '@/lib/data/icdData'
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ModelItem {
  ersbkey: number;    
  name: string;
  department: string;
  chiefComplaint: string; 
  presentIllness: string; 
  pastHistory: string;    
  generalCondition: string;
  heent: string;
  neck: string;
  chestAndLungs: string;
  abdomen: string;
  backAndSpine: string;
  exogenitalia: string;
  rectalExam: string;
  extremities: string;
  neurologicalExam: string;
  doctorId: string;  
  [key: string]: any;  
}
export const ModelValue : ModelItem ={ // 給useForm當初始值的
  ersbkey: 0,    
  name: '',
  department: '',
  chiefComplaint: '', 
  presentIllness: '', 
  pastHistory: '',    
  generalCondition: '',
  heent: '',
  neck: '',
  chestAndLungs: '',
  abdomen: '',
  backAndSpine: '',
  exogenitalia: '',
  rectalExam: '',
  extremities: '',
  neurologicalExam: '',
  doctorId: '',  
}
export interface ModelItemPrint {
  ersbkey: number;    
  name: string;
  department: string;
  chiefComplaint: string; 
  presentIllness: string; 
  pastHistory: string;    
  generalCondition: string;
  heent: string;
  neck: string;
  chestAndLungs: string;
  abdomen: string;
  backAndSpine: string;
  exogenitalia: string;
  rectalExam: string;
  extremities: string;
  neurologicalExam: string;
  doctorId: string;  
  [key: string]: any;  
  icd:ICDItem
  icdList?: ICDItem[]
}
export const ModelPrintValue : ModelItemPrint ={ // 給useForm當初始值的
  ersbkey: 0,    
  name: '',
  department: '',
  chiefComplaint: '', 
  presentIllness: '', 
  pastHistory: '',    
  generalCondition: '',
  heent: '',
  neck: '',
  chestAndLungs: '',
  abdomen: '',
  backAndSpine: '',
  exogenitalia: '',
  rectalExam: '',
  extremities: '',
  neurologicalExam: '',
  doctorId: '',  
  icd: {
    id: '',
    zhName: '',
    enName: '',
    use: 0
  },
  icdList: []
}