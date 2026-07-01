from __future__ import annotations

import datetime as dt
import io
import os
import sys
from typing import Any


if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def load_simple_env_file(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            os.environ.setdefault(key, value)


def setup_db2_driver() -> None:
    if os.name != "nt":
        return
    clidriver_path = os.environ.get("CLIDRIVER_PATH", r"C:\temp\clidriver\bin")
    if os.path.isdir(clidriver_path):
        try:
            os.add_dll_directory(clidriver_path)
        except (AttributeError, OSError):
            pass


def get_required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"缺少必要環境變數: {name}")
    return value


def get_db2_conn_string() -> str:
    full = os.environ.get("DB2_CONN_STRING", "").strip()
    if full:
        return full
    return (
        f"DATABASE={get_required_env('DB2_DATABASE')};"
        f"HOSTNAME={get_required_env('DB2_HOSTNAME')};"
        f"PORT={get_required_env('DB2_PORT')};"
        f"PROTOCOL={os.environ.get('DB2_PROTOCOL', 'TCPIP').strip() or 'TCPIP'};"
        f"UID={get_required_env('DB2_UID')};"
        f"PWD={get_required_env('DB2_PWD')};"
    )


def fetch_db2_active_icd(current_date: dt.date) -> list[dict[str, Any]]:
    setup_db2_driver()
    import ibm_db

    sql = """
        SELECT
            ICDDKKEY AS ICD_10_CM_code,
            ICDDKTXT AS ICD_10_CM_EN_Name,
            ICDCKTXT AS ICD_10_CM_ZH_Name,
            ICDYES,
            BDATE
        FROM VGHLNXVG.ICD10CM
        WHERE ICDYES = 'Y'
          AND BDATE <= ?
          AND EDATE >= ?
        WITH UR
    """

    conn = ibm_db.connect(get_db2_conn_string(), "", "")
    rows: list[dict[str, Any]] = []
    try:
        stmt = ibm_db.prepare(conn, sql)
        ibm_db.bind_param(stmt, 1, current_date, ibm_db.SQL_PARAM_INPUT)
        ibm_db.bind_param(stmt, 2, current_date, ibm_db.SQL_PARAM_INPUT)
        ibm_db.execute(stmt)

        row = ibm_db.fetch_assoc(stmt)
        while row:
            rows.append(dict(row))
            row = ibm_db.fetch_assoc(stmt)
        ibm_db.free_result(stmt)
    finally:
        ibm_db.close(conn)
    return rows


def connect_mysql():
    host = get_required_env("DB_HOST")
    port = int(os.environ.get("DB_PORT", "3306"))
    user = get_required_env("DB_USER")
    password = get_required_env("DB_PASSWORD")
    database = get_required_env("DB_NAME")

    try:
        import pymysql  # type: ignore
    except ImportError as e:
        raise RuntimeError("缺少 pymysql，請先安裝: pip install pymysql") from e

    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        autocommit=False,
    )


def get_existing_icd_codes(cur, table_name: str) -> set[str]:
    cur.execute(f"SELECT `ICD_10_CM_code` FROM `{table_name}`")
    return {str(row[0]).strip() for row in cur.fetchall() if row and row[0] is not None}


def to_date_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dt.datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, dt.date):
        return value.strftime("%Y-%m-%d")
    return str(value).strip()


def sync_icd(rows: list[dict[str, Any]], table_name: str) -> tuple[int, int]:
    conn = connect_mysql()
    inserted = 0
    skipped = 0
    try:
        with conn.cursor() as cur:
            existing_codes = get_existing_icd_codes(cur, table_name)
            sql_insert = f"""
                INSERT INTO `{table_name}` (
                    `ICD_10_CM_code`,
                    `USE`,
                    `ICD_10_CM_EN_Name`,
                    `ICD_10_CM_ZH_Name`,
                    `狀態`,
                    `修訂日期`
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """

            for row in rows:
                code = str(row.get("ICD_10_CM_CODE") or "").strip()
                if not code:
                    skipped += 1
                    continue

                if code in existing_codes:
                    skipped += 1
                    continue

                en_name = str(row.get("ICD_10_CM_EN_NAME") or "").strip()
                zh_name = str(row.get("ICD_10_CM_ZH_NAME") or "").strip()
                status = str(row.get("ICDYES") or "").strip()
                bdate = to_date_str(row.get("BDATE"))

                cur.execute(sql_insert, (code, 0, en_name, zh_name, status, bdate))
                existing_codes.add(code)
                inserted += 1

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return inserted, skipped


def main() -> None:
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_simple_env_file(os.path.join(project_root, ".env.production"))
    load_simple_env_file(os.path.join(project_root, ".env.development"))

    current_date = dt.date.today()
    table_name = os.environ.get("DB_TABLE_ICD", "ICD").strip() or "ICD"

    rows = fetch_db2_active_icd(current_date)
    inserted, skipped = sync_icd(rows, table_name)

    print(
        f"[ICD Sync] date={current_date.isoformat()} "
        f"db2_rows={len(rows)} inserted={inserted} skipped={skipped} table={table_name}"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[ICD Sync] failed: {e}", file=sys.stderr)
        sys.exit(1)
