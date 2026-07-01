#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import sys
import io
import json
import os
# --- DB2 環境配置 ---
if os.name == 'nt':
    clidriver_path = r'C:\temp\clidriver\bin'
    if os.path.exists(clidriver_path):
        os.add_dll_directory(clidriver_path)
# 強制 UTF-8 輸出，避免 Windows 轉碼錯誤
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def _build_conn_string() -> str:
    host = os.environ.get("DB2_HOST", "lnxdb2p.vghtpe.gov.tw").strip()
    port = os.environ.get("DB2_PORT", "51031").strip()
    database = os.environ.get("DB2_DATABASE", "DBHIS").strip()
    user = os.environ.get("DB2_USER", os.environ.get("DB2_UID", "XVGH99")).strip()
    password = os.environ.get("DB2_PASSWORD", os.environ.get("DB2_PWD", "Phi1ips1")).strip()
    return f"DATABASE={database};HOSTNAME={host};PORT={port};PROTOCOL=TCPIP;UID={user};PWD={password};"

def main():
    if len(sys.argv) < 3:
        print("用法: db2_vitals.py <histno> <caseno>", file=sys.stderr)
        sys.exit(2)

    histno = sys.argv[1].strip()
    caseno = sys.argv[2].strip()


    try:
        import ibm_db
        conn = ibm_db.connect(_build_conn_string(), "", "")
        sql = """
            SELECT 
                ERTTBP1, 
                ERTTBP2, 
                ERTTPR, 
                ERTTRR, 
                ERTTBT, 
                ERTTKG,
                ERTTS12
            FROM VGHLNXVG.ERTTAS5
            WHERE ERTTHIST = ?
            AND RIGHT(TRIM(ERTTBKEY), 8) = ? 
            WITH UR
        """
        
        stmt = ibm_db.prepare(conn, sql)
        ibm_db.bind_param(stmt, 1, histno)
        ibm_db.bind_param(stmt, 2, caseno)
        ibm_db.execute(stmt)
        
        row = ibm_db.fetch_assoc(stmt)

        if row:
            final_data = {
                "bp_s": str(row.get("ERTTBP1") or "").strip(),
                "bp_d": str(row.get("ERTTBP2") or "").strip(),
                "pr":   str(row.get("ERTTPR") or "").strip(),
                "rr":   str(row.get("ERTTRR") or "").strip(),
                "bt":   str(row.get("ERTTBT") or "").strip(),
                "bw":   str(row.get("ERTTKG") or "").strip(),
                "疼痛評估": str(row.get("ERTTS12") or "").strip(),
            }
            print(json.dumps({"success": True, "data": final_data}))
        else:
            print(json.dumps({"success": False, "error": 123}))
        ibm_db.close(conn)
        
    except Exception as e:
        # 發生錯誤時輸出詳細資訊到 stderr 並回傳失敗 JSON
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()