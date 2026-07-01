import os
import sys
import json
import io

import re
from datetime import date, datetime

from typing import List, Dict, Any
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# --- DB2 環境配置 ---
if os.name == 'nt':
    clidriver_path = r'C:\temp\clidriver\bin'
    if os.path.exists(clidriver_path):
        os.add_dll_directory(clidriver_path)

import ibm_db

# 資料庫連線字串
DB2_CONFIG = "DATABASE=DBHIS;HOSTNAME=lnxdb2p.vghtpe.gov.tw;PORT=51031;PROTOCOL=TCPIP;UID=XVGH99;PWD=Phi1ips1;"

# 欄位對照表 (保持不變)
SP_COLUMN_MAPS = {
    "OPSORAQ1": {
        "OPAMANNM": "醫生姓名", "OPAENDDT": "手術日期", "OPADIAGA": "術後診斷", "OPADIAGN": "術前診斷",
        "OPANAM1": "術式一", "OPANAM2": "術式二", "OPANAM3": "術式三",
    },
    "DTAROTQ4":{
        "DTPDATE": "門診日期", "DTPDEPT":"科別",
        "DTPDOCNM": "醫師姓名", "SECTNM": "次專科名","ICD10":"ICD 10"
    },
    "RESLAB01": {
        "RSV07": "Cr", "RSV08": "T.Bili", "RSV11": "ALT", "RSV12": "AST",
        "RSV13": "Na", "RSV14": "K", "RSV16": "Glucose", "RSV18": "CK",
        "RSV29": "Troponin I", "RSV30": "CRP", "RSV31": "eGFR", "RSV42": "PCT",
        "RSV44": "AMONIA", "RSV48": "NT-pro-BNP", "RSV49": "PROCALCITONIN", "RSV50": "NH3","ORRESDT":"報告時間",
    },
    "RESLAB02": {
        "RSV01": "WBC","RSV03": "Hb","RSV09": "Platelet", "RSV10": "INR",
        "RSV11": "PT", "RSV12": "aPTT", "RSV13": "Band", "RSV14": "Seg","RSV19": "D-Dimer","ORRESDT":"報告時間",
    },
    "DISLIST": {
        "DADMSECT": "入院科別", "DDATEIN": "住院日期", "DDISSECT": "出院科別",
        "DDATEOUT": "出院日期"
    },

}

import os
from pathlib import Path

def setup_db2_environment() -> None:
    # 這是院方要求的 Ubuntu 驅動程式路徑
    driver_path = Path("/home/ubuntu/SP/dsdriver")
    
    if driver_path.exists():
        # 設定 DB2 必要的環境變數
        os.environ.setdefault("DB2DIR", str(driver_path))
        os.environ.setdefault("DB2_CLI_DRIVER_INSTALL_PATH", str(driver_path))
        os.environ.setdefault("IBM_DB_HOME", str(driver_path))
        
        # 設定動態庫路徑 (Linux 抓取 dll/so 的關鍵)
        lib_path = f"{driver_path}/lib"
        current_ld = os.environ.get("LD_LIBRARY_PATH", "")
        if lib_path not in current_ld.split(":"):
            os.environ["LD_LIBRARY_PATH"] = f"{lib_path}:{current_ld}" if current_ld else lib_path
            
        # 設定執行檔路徑
        bin_path = f"{driver_path}/bin"
        current_path = os.environ.get("PATH", "")
        if bin_path not in current_path.split(":"):
            os.environ["PATH"] = f"{bin_path}:{current_path}" if current_path else bin_path

    # 設定語系，這對處理中文字很重要
    os.environ.setdefault("DB2TERRITORY", "88")
    os.environ.setdefault("DB2CODEPAGE", "950")

def get_db_conn():
    setup_db2_environment()
    return ibm_db.connect(DB2_CONFIG, "", "")


def fetch_all_result_sets(stmt, proc_name=None):
    all_results = []
    current_map = SP_COLUMN_MAPS.get(proc_name, {})
    # limit_date = datetime.now() - relativedelta(months=5)
    date_fields = ["報告時間", "手術日期", "門診日期", "住院日期", "出院日期", "日期"]

    # 預先編譯正則表達式：匹配 [半形-, 全形－, 波浪號~] 後接上下午，或是單純的上下午
    # 這裡的 '－' 為全形連接號
    ampm_regex = re.compile(r'([-－~]?(上午|下午))')

    while True:
        aggregated_rows = {} 
        num_fields = ibm_db.num_fields(stmt)
        if num_fields > 0:
            raw_columns = [ibm_db.field_name(stmt, i) for i in range(num_fields)]
            row = ibm_db.fetch_tuple(stmt)
            while row:
                row_data = {}
                sort_key_dt = None 
                for i, v in enumerate(row):
                    orig_col = raw_columns[i]
                    if orig_col in current_map:
                        display_col = current_map[orig_col]
                        val = v
                        if isinstance(v, (date, datetime)):
                            if isinstance(v, date): 
                                v = datetime.combine(v, datetime.min.time())
                            val = v.isoformat()
                            if display_col in date_fields:
                                if not sort_key_dt or v > sort_key_dt:
                                    sort_key_dt = v
                            val = v.isoformat().replace("T00:00:00", "")
                        # --- 修改這個區塊的字串處理邏輯 ---
                        elif isinstance(v, str):
                            cleaned_str = ampm_regex.sub("", v)
                            val = cleaned_str.strip()
                        if val is not None and val != "":
                            row_data[display_col] = val
            

                if len(row_data) > 1:
                    found_dates = [f"{row_data[k][:10]}" for k in date_fields if k in row_data]
                    title_str = " | ".join(found_dates) or "未知日期"
                    if title_str not in aggregated_rows:
                        aggregated_rows[title_str] = {
                            "日期": title_str,
                            "_sort_key": sort_key_dt if sort_key_dt else datetime.min
                        }
                    for k, v in row_data.items():
                        aggregated_rows[title_str][k] = v
                row = ibm_db.fetch_tuple(stmt)
        
        final_rows = list(aggregated_rows.values())
        final_rows.sort(key=lambda x: x["_sort_key"], reverse=True)
        for r in final_rows: r.pop("_sort_key", None)
        all_results.append(final_rows)
        if not ibm_db.next_result(stmt): break
    return all_results

def main():
    # 1. 取得 Node.js 傳入的參數 (sys.argv[1] 是 histno)
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing histno argument"}), flush=True)
        sys.exit(1)
    
    histno = sys.argv[1].strip()
    
    conn = None
    
    try:
        conn = get_db_conn()
        payload = {}
        target_seqcn = "I4212271" # 範例

        # --- getResghtmr 檢驗報告內容查詢前的參數查詢---
        try:
            # 確保連線環境已正確設定
            sql_order = """
                SELECT ormm, orhistno, ordseqcn, ordseqno, orreqno 
                FROM vghlnxvg.order
                WHERE TRIM(orhistno) = ? 
                AND TRIM(ordseqcn) = ?
                AND ordclnm NOT LIKE '999MR%'
                AND ordclnm <> '99909005'
                AND orstatus NOT IN ('60', '82')
                AND ordept <> ''
                ORDER BY ordseqno DESC 
                WITH UR
            """
            stmt_o = ibm_db.prepare(conn, sql_order)
            ibm_db.bind_param(stmt_o, 1, histno.strip())
            ibm_db.bind_param(stmt_o, 2, target_seqcn.strip())
            ibm_db.execute(stmt_o)
            
            # 建立陣列存放多筆醫囑參數
            ers_params_list = []
            row = ibm_db.fetch_assoc(stmt_o)
            while row:
                ers_params_list.append({
                    "月份": str(row["ORMM"]).strip(),     # 月份 [cite: 7]
                    "histno": str(row["ORHISTNO"]).strip(), # 病歷號 [cite: 7]
                    "seqcn": str(row["ORDSEQCN"]).strip(),   # 就診序號 [cite: 7]
                    "醫囑序號": str(row["ORDSEQNO"]).strip(),   # 醫囑序號 [cite: 7]
                    "申請單號": str(row["ORREQNO"]).strip(),    # 申請單號 [cite: 7]
                    "signid": "ISC9077"                     # 預設簽章代碼 [cite: 7, 15]
                })
                row = ibm_db.fetch_assoc(stmt_o)
            
            # 若有資料則回傳陣列，否則回傳錯誤訊息
            payload["ers_params_list"] = ers_params_list if ers_params_list else "查無符合條件的醫囑"
            ibm_db.free_result(stmt_o)
            
        except Exception as e:
            payload["ers_params_list"] = f"SQL 執行失敗: {str(e)}"

        # --- pbabstrc 查詢 ---
        try:
            sql_pbabstrc = """
                SELECT psubj, pdesc, pedate FROM VGHLNXVG.pbabstrc 
                WHERE phistnum = ? AND pcatg = 'DA' AND pflag = 'Y' 
                ORDER BY pedate DESC, petime DESC WITH UR
            """
            stmt_p = ibm_db.prepare(conn, sql_pbabstrc)
            ibm_db.bind_param(stmt_p, 1, histno, ibm_db.SQL_PARAM_INPUT)
            ibm_db.execute(stmt_p)
            results = []
            row = ibm_db.fetch_assoc(stmt_p)
            while row:
                results.append({
                    "日期": str(row.get("PEDATE", "")),
                    "主題": row.get("PSUBJ", "").strip(),
                    "描述": row.get("PDESC", "").strip(),
                })
                row = ibm_db.fetch_assoc(stmt_p)
            payload["pbabstrc"] = results
            ibm_db.free_result(stmt_p)
        except:
            payload["pbabstrc"] = []

        # --- OPSORAQ1 & DTAROTQ4 ---
        for proc in ["OPSORAQ1", "DTAROTQ4"]:
            stmt = ibm_db.prepare(conn, f"CALL VGHLNXVG.{proc}(?, ?)")
            histno_padded = str(histno).ljust(10, ' ')
            ibm_db.bind_param(stmt, 1, histno_padded, ibm_db.SQL_PARAM_INPUT, ibm_db.SQL_CHAR)
            ret = [0]
            ibm_db.bind_param(stmt, 2, ret, ibm_db.SQL_PARAM_OUTPUT, ibm_db.SQL_INTEGER)
            try:
                ibm_db.execute(stmt)
                res = fetch_all_result_sets(stmt, proc)
                payload[proc.lower()] = res[0] if res else []
            except:
                payload[proc.lower()] = []
            finally:
                ibm_db.free_result(stmt)

        # --- RESLAB01 & RESLAB02 ---
        for proc in ["RESLAB01", "RESLAB02"]:
            stmt = ibm_db.prepare(conn, f"CALL VGHLNXVG.{proc}(?, ?, ?)")
            ibm_db.bind_param(stmt, 1, histno, ibm_db.SQL_PARAM_INPUT)
            ibm_db.bind_param(stmt, 2, "", ibm_db.SQL_PARAM_INPUT)
            ret = [0]
            ibm_db.bind_param(stmt, 3, ret, ibm_db.SQL_PARAM_OUTPUT, ibm_db.SQL_INTEGER)
            ibm_db.execute(stmt)
            res = fetch_all_result_sets(stmt, proc)
            payload[proc.lower()] = res[0] if res else []
            ibm_db.free_result(stmt)

        # --- DISLIST ---
        stmt5 = ibm_db.prepare(conn, "CALL VGHLNXVG.DISLIST(?, ?, ?, ?)")
        ibm_db.bind_param(stmt5, 1, histno, ibm_db.SQL_PARAM_INPUT)
        ibm_db.bind_param(stmt5, 2, "DOC6746A", ibm_db.SQL_PARAM_INPUT)
        ret5, msg5 = [0], [" " * 1024]
        ibm_db.bind_param(stmt5, 3, ret5, ibm_db.SQL_PARAM_OUTPUT, ibm_db.SQL_INTEGER)
        ibm_db.bind_param(stmt5, 4, msg5, ibm_db.SQL_PARAM_OUTPUT, ibm_db.SQL_CHAR, 1024)
        try:
            ibm_db.execute(stmt5)
            all_res5 = fetch_all_result_sets(stmt5,"DISLIST")
            payload["dislist"] = next((rs for rs in all_res5 if rs), [])
        except:
            payload["dislist"] = []
        ibm_db.free_result(stmt5)

        # --- DISDISP ---
        stmt6 = ibm_db.prepare(conn, "CALL VGHLNXVG.DISDISP(?, ?, ?, ?)")
        ibm_db.bind_param(stmt6, 1, histno, ibm_db.SQL_PARAM_INPUT)
        ibm_db.bind_param(stmt6, 2, "", ibm_db.SQL_PARAM_INPUT)
        ret6, msg6 = [0], [" " * 1024]
        ibm_db.bind_param(stmt6, 3, ret6, ibm_db.SQL_PARAM_OUTPUT, ibm_db.SQL_INTEGER)
        ibm_db.bind_param(stmt6, 4, msg6, ibm_db.SQL_PARAM_OUTPUT, ibm_db.SQL_CHAR, 1024)
        ibm_db.execute(stmt6)
        res6 = fetch_all_result_sets(stmt6,"DISDISP")
        payload["disdisp"] = res6[0] if res6 else []
        ibm_db.free_result(stmt6)

        # --- 最終輸出 (關鍵)：flush 確保 Node execFile 能讀到完整 stdout ---
        print(json.dumps({"status": "success", "data": payload}, ensure_ascii=False), flush=True)

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False), flush=True)
        sys.exit(1)
    finally:
        if conn:
            ibm_db.close(conn)

if __name__ == "__main__":
    main()