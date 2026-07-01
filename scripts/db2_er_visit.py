from __future__ import annotations

import io
import json
import os
import re
import sys

if sys.platform == "win32" and __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def _setup_clidriver_dll() -> None:
    if os.name != "nt":
        return
    clidriver_path = os.environ.get("CLIDRIVER_PATH", r"C:\temp\clidriver\bin")
    if os.path.isdir(clidriver_path):
        try:
            os.add_dll_directory(clidriver_path)
        except (AttributeError, OSError):
            pass


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


def _caseno_tail(caseno: str) -> str:
    compact = re.sub(r"\s+", "", caseno.strip())
    return compact[-8:] if compact else ""


def _pick_er_doc(row: dict) -> str:
    u = _upper_map(row)
    for key in (
        "ERTTDINPN",
        "ERTTDOC",
        "ERTTDOCID",
        "ERTTDOCT",
        "ERTTDOCN",
        "ERTTDR",
        "ERSDINPN",
    ):
        val = u.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""


def _format_ercaseno(erttbkey: str) -> str:
    compact = re.sub(r"\s+", "", erttbkey.strip())
    if not compact:
        return ""
    core = compact[-8:]
    return f" {core}"[:12]


def lookup_er_visit(histno: str, caseno: str) -> dict:
    histno = histno.strip()
    caseno = caseno.strip()
    tail = _caseno_tail(caseno)

    if not histno or not tail:
        return {"success": False, "error": "缺少病歷號或就診號"}

    _setup_clidriver_dll()
    try:
        import ibm_db
    except ImportError:
        return {"success": False, "error": "ibm_db 未安裝"}

    sql = """
        SELECT *
        FROM VGHLNXVG.ERTTAS5
        WHERE TRIM(ERTTHIST) = ?
          AND (
            RIGHT(TRIM(ERTTBKEY), 8) = ?
            OR TRIM(ERTTBKEY) = ?
          )
        FETCH FIRST 1 ROW ONLY
        WITH UR
    """

    conn = None
    try:
        conn = ibm_db.connect(_build_conn_string(), "", "")
        stmt = ibm_db.prepare(conn, sql)
        ibm_db.bind_param(stmt, 1, histno)
        ibm_db.bind_param(stmt, 2, tail)
        ibm_db.bind_param(stmt, 3, caseno)
        ibm_db.execute(stmt)
        row = ibm_db.fetch_assoc(stmt)
        ibm_db.free_result(stmt)
    finally:
        if conn is not None:
            ibm_db.close(conn)

    if not row:
        return {"success": False, "error": "查無急診就診資料"}

    u = _upper_map(row)
    erttbkey = str(u.get("ERTTBKEY", "")).strip()
    docid = _pick_er_doc(row)
    formatted_caseno = _format_ercaseno(erttbkey or caseno)

    return {
        "success": True,
        "erttbkey": erttbkey,
        "ercaseno": formatted_caseno,
        "docid": docid,
        "erdhist": str(u.get("ERTTHIST", histno)).strip(),
    }


def main() -> None:
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "用法: db2_er_visit.py <histno> <caseno>"}))
        return

    result = lookup_er_visit(sys.argv[1], sys.argv[2])
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
