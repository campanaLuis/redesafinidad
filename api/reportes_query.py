import json
import os
from datetime import date, datetime
from decimal import Decimal

import pg8000.dbapi


def to_json_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def main():
    limit = max(1, min(500, int(os.environ.get("REPORTES_LIMIT", "100"))))
    offset = max(0, int(os.environ.get("REPORTES_OFFSET", "0")))

    conn = pg8000.dbapi.connect(
        host=os.environ["REPORTES_PGHOST"],
        port=int(os.environ.get("REPORTES_PGPORT", "5432")),
        user=os.environ["REPORTES_PGUSER"],
        password=os.environ["REPORTES_PGPASSWORD"],
        database=os.environ["REPORTES_PGDATABASE"],
    )

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*)::int AS total FROM public.reportes")
        total = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT
              id,
              telefono,
              nombre,
              ubicacion_latitud,
              ubicacion_longitud,
              foto_url,
              apoyodescripcion,
              apoyodescripcionvoz_url,
              created_at
            FROM public.reportes
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )

        columns = [desc[0] for desc in cursor.description]
        rows = [
            {column: to_json_value(value) for column, value in zip(columns, row)}
            for row in cursor.fetchall()
        ]

        print(
            json.dumps(
                {"total": total, "limit": limit, "offset": offset, "data": rows},
                ensure_ascii=False,
            )
        )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
