from __future__ import annotations

import sys
import io

if sys.platform == "win32":
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8")
            except (ValueError, OSError):
                pass
        elif not isinstance(stream, io.TextIOWrapper) or stream.encoding.lower() != "utf-8":
            buffer = getattr(stream, "buffer", None)
            if buffer is not None:
                wrapped = io.TextIOWrapper(buffer, encoding="utf-8")
                if stream is sys.stdout:
                    sys.stdout = wrapped
                else:
                    sys.stderr = wrapped

import json
import os
import re
import datetime
import decimal

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from db2_er_visit import lookup_er_visit


def _setup_clidriver_dll() -> None:
    if os.name != "nt":
        return
    clidriver_path = os.environ.get("CLIDRIVER_PATH", r"C:\temp\clidriver\bin")
    if os.path.isdir(clidriver_path):
        try:
            os.add_dll_directory(clidriver_path)
        except (AttributeError, OSError):
            pass


def _json_default(o: object) -> str:
    if isinstance(o, (datetime.date, datetime.datetime)):
        return o.isoformat()
    if isinstance(o, datetime.time):
        return str(o)
    if isinstance(o, decimal.Decimal):
        return str(o)
    if isinstance(o, bytes):
        return o.decode("utf-8", errors="replace")
    if isinstance(o, (memoryview, bytearray)):
        return bytes(o).decode("utf-8", errors="replace")
    return str(o)


def _build_conn_string() -> str:
    full = os.environ.get("DB2_CONN_STRING", "").strip()
    if full:
        return full
    host = os.environ.get("DB2_HOSTNAME", "lnxdb2p.vghtpe.gov.tw").strip()
    port = os.environ.get("DB2_PORT", "51031").strip()
    database = os.environ.get("DB2_DATABASE", "DBHIS").strip()
    user = os.environ.get("DB2_UID", "XVGH99").strip()
    password = os.environ.get("DB2_PWD", "Phi1ips1").strip()
    
    return (
        f"DATABASE={database};HOSTNAME={host};PORT={port};"
        f"PROTOCOL=TCPIP;UID={user};PWD={password};"
    )


def _upper_map(row: dict) -> dict:
    return {str(k).upper(): v for k, v in row.items()}


def _format_birth(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.isoformat()[:10] if isinstance(val, datetime.date) else val.isoformat()
    s = str(val).strip()
    return s


def _format_yyyymmdd(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, datetime.datetime):
        return val.strftime("%Y%m%d")
    if isinstance(val, datetime.date):
        return val.strftime("%Y%m%d")
    if isinstance(val, datetime.time):
        return ""
    digits = re.sub(r"\D", "", str(val).strip())
    return digits[:8] if len(digits) >= 8 else ""


def _format_hhmm(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, datetime.datetime):
        return val.strftime("%H:%M")
    if isinstance(val, datetime.time):
        return val.strftime("%H:%M")
    s = str(val).strip()
    m = re.search(r"(\d{1,2}):(\d{2})", s)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}"
    digits = re.sub(r"\D", "", s)
    if len(digits) >= 4:
        return f"{digits[-4:-2]}:{digits[-2:]}"
    return ""


def _opt_str(val: object | None, default: str = "") -> str:
    if val is None:
        return default
    s = str(val).strip()
    if not s or s.lower() == "none":
        return default
    return s


def _build_session(first_row: dict | None, histno: str, caseno:str,docid:str,) -> dict:
    u = _upper_map(first_row) if first_row else {}

    def pick(*candidates: str):
        for c in candidates:
            if c in u and u[c] is not None and str(u[c]).strip() != "":
                return u[c]
        return None

    sex = pick("PSEX")
    birth = pick("PBIRTHDT")
    lst_dept = pick("PLSTMED")
    fst_dept = pick("PFSTMED")
    lst_dt = pick("PLSTVDT")
    fst_dt = pick("PFSTVDT")
    blood = pick("PPBLOOD")
    pat_cat = pick("PPATCAGY")
    caseno_val = pick("PCASENO", "CASENO", "PVISITNO") or caseno

    session = {
        "病歷號": str(pick("PHISTNUM", "病歷號") or histno),
        "就診號": str(pick("PCASENO", "CASENO", "PVISITNO", "就診號") or caseno),
        "醫生ID": str(pick("PDOCID", "DOCID", "PDOCTOR", "醫生ID") or docid),
        "性別": str(pick("PSEX")),
        "生日": birth if birth is not None else "沒有得到生日",
        "病患姓名": str(pick("PNAMEC") or "沒有得到病患姓名"),
        "身分證字號":str(pick("PIDNO")),
        "流水號": str(pick("PRKNO")),
        "英文姓名": str(pick("PNAME")),
        "生日原始碼": str(pick("PBIRTHDT")),
        "種族註記": str(pick("PETHGRP")),
        "居住地代碼": str(pick("PRESDNCE")),
        "宗教信仰": str(pick("PRELIGIN")),
        "榮民註記": str(pick("PVETERAN")),
        "戶籍地址": str(pick("PADDR1")),
        "郵遞區號": str(pick("PPATZIP")),
        "電話號碼1": str(pick("PPHONNO1")),
        "病患身分身份別": str(pick("PPATCAGY")),
        "初診日期": str(pick("PFSTVDT")),
        "初診科別": str(pick("PFSTMED")),
        "最後就診日期": str(pick("PLSTVDT")),
        "最後就診科別": str(pick("PLSTMED")),
        "累計就醫次數": str(pick("PACCVOL")),
        "醫療狀態": str(pick("PMEDSTAT")),
        "聯絡卡註記": str(pick("PCNTCARD")),
        "主要保費來源": str(pick("PBFIN1")),
        "次要保費來源": str(pick("PBFIN2")),
        "主要診斷碼": str(pick("PICD91")),
        "次要診斷碼1": str(pick("PICD92")),
        "次要診斷碼2": str(pick("PICD93")),
        "起源地代碼": str(pick("POR1")),
        "就醫地區代碼": str(pick("POR2")),
        "就醫類別": str(pick("PMEDCAGY")),
        "火災/職災註記": str(pick("PFIRE")),
        "資料異動日期": str(pick("PMODFYDT")),
        "經辦人員ID": str(pick("POPERID")),
        "血型": str(pick("PPBLOOD")),
        "重大傷病/特殊註記": str(pick("PPAIDS")),
        "傳染病註記1": str(pick("PPINF1")),
        "傳染病註記2": str(pick("PPINF2")),
        "傳染病註記3": str(pick("PPINF3")),
        "通訊地址": str(pick("PADDR2")),
        "電話號碼2": str(pick("PPHONNO2")),
        "病患動態狀態": str(pick("PPATSTAT")),
        "死亡註記": str(pick("PDEADFLG")),
        "備用附加欄位": str(pick("PAPPEND")),
    }

    session["住院號"] = _opt_str(
        pick("PADMNO", "PINPNO", "PCASENO", "PVISITNO") or caseno_val
    )
    session["住院科別"] = _opt_str(
        pick("PADMSECT", "DADMSECT", "PLSTMED", "PFSTMED", "PADMDEPT", "PINPDEPT")
        or lst_dept
        or fst_dept
    )
    session["住院日期"] = _format_yyyymmdd(
        pick("PADMDT", "DDATEIN", "PINPDT", "PADMDATE", "PLSTVDT") or lst_dt
    )
    session["住院時間"] = _format_hhmm(
        pick("PADMTM", "PINPTM", "PADMTIME", "PLSTVDT")
    )
    session["職業"] = _opt_str(
        pick("POCCUP", "POCCUPAT", "POCCUPATION", "POCCUPCD")
    )
    session["血型RH"] = _opt_str(
        pick("PPBLOOD", "PRH", "PBLOODRH", "PRHFACTOR") or blood
    )
    session["婚姻狀況"] = _opt_str(
        pick("PMARSTS", "PMARITAL", "PMARRIED", "PMARSTATUS")
    )
    session["身分"] = _opt_str(
        pick("PPATCAGY", "PPATTYPE", "PIDENTITY") or pat_cat
    )
    session["問診日期"] = _format_yyyymmdd(
        pick("PCONSULTDT", "PINTVDT", "PFSTVDT", "PLSTVDT", "PEDATE") or fst_dt or lst_dt
    )
    session["問診時間"] = _format_hhmm(
        pick("PCONSULTTM", "PINTVTM", "PFSTVDT", "PLSTVDT", "PEDATE")
    )
    session["轉診醫院"] = _opt_str(
        pick("PREFERHOS", "PHOSREF", "PREFHOSP", "POR1", "POR2", "PHOSPREF")
    )
    session["抽煙習慣"] = _opt_str(
        pick("PSMOKE", "PSMOKFLG", "PSMOKING", "PSMOKHAB")
    )
    session["二手菸暴露風險"] = "No"

    return session


def main() -> None:
    if len(sys.argv) < 2:
        print("用法: db2_pbasinfo.py <histno> <caseno> <docid>", file=sys.stderr)
        sys.exit(2)

    histno = sys.argv[1].strip()

    caseno = sys.argv[2].strip()

    docid = sys.argv[3].strip()

    if not histno:
        print(json.dumps({"rows": [], "session": None}, ensure_ascii=False))
        return

    _setup_clidriver_dll()

    try:
        import ibm_db
    except ImportError:
        print("請先安裝 ibm_db：pip install ibm_db", file=sys.stderr)
        sys.exit(1)

    col_hist = os.environ.get("PBASINFO_COL_HIST", "PHISTNUM").strip() or "PHISTNUM"

    sql = f"SELECT * FROM VGHLNXVG.PBASINFO WHERE {col_hist} = ? WITH UR"

    conn_str = _build_conn_string()
    conn = None
    rows_out: list[dict] = []

    try:
        conn = ibm_db.connect(conn_str, "", "")
        stmt = ibm_db.prepare(conn, sql)
        ibm_db.bind_param(stmt, 1, histno, ibm_db.SQL_PARAM_INPUT)
        ibm_db.execute(stmt)

        row = ibm_db.fetch_assoc(stmt)
        while row:
            rows_out.append(dict(row))
            row = ibm_db.fetch_assoc(stmt)

        ibm_db.free_result(stmt)
    finally:
        if conn is not None:
            ibm_db.close(conn)

    first = rows_out[0] if rows_out else None
    session = _build_session(first, histno, caseno, docid)

    visit = lookup_er_visit(histno, caseno)
    if visit.get("success"):
        if visit.get("erttbkey"):
            session["ERS就診序號"] = visit["erttbkey"]
        if visit.get("ercaseno"):
            session["ERS就診序號API"] = visit["ercaseno"]
            session["就診號"] = visit["ercaseno"].strip()
        if visit.get("erdhist"):
            session["病歷號"] = visit["erdhist"]

    print(
        json.dumps(
            {"rows": rows_out, "session": session},
            ensure_ascii=False,
            default=_json_default,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)