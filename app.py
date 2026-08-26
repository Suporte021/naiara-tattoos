from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    session,
    url_for,
)
from database import init_db, get_db
from datetime import datetime, date, timedelta
from functools import wraps
from werkzeug.utils import secure_filename
import os

# Carrega .env (SECRET_KEY e ADMIN_PASSWORD)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

# Segurança
app.secret_key = os.environ.get(
    "SECRET_KEY",
    "dev-mude-isso-em-producao"
)
ADMIN_PASSWORD = os.environ.get(
    "ADMIN_PASSWORD",
    "naiara123"
)

init_db()

# =========================================================
# UPLOAD
# =========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8 MB


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def json_error(message, status=400):
    return jsonify({"success": False, "error": message}), status


def json_success(**kwargs):
    return jsonify({"success": True, **kwargs})


def parse_date(value):
    if not value:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def normalize_date(value):
    parsed = parse_date(value)
    if not parsed:
        return None
    return parsed.strftime("%Y-%m-%d")


def get_weekday(date_value):
    # Python: seg=0 ... dom=6  →  Banco: dom=0 ... sab=6
    python_day = date_value.weekday()
    return python_day + 1 if python_day < 6 else 0


def normalize_time_str(value, default="09:00"):
    """Aceita 8:00, 08:00, 23:50 e devolve sempre HH:MM."""
    if value is None or str(value).strip() == "":
        return default
    value = str(value).strip().replace(".", ":")
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).strftime("%H:%M")
        except ValueError:
            pass
    parts = value.split(":")
    if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
        h, m = int(parts[0]), int(parts[1])
        if 0 <= h <= 23 and 0 <= m <= 59:
            return f"{h:02d}:{m:02d}"
    return None


def time_to_minutes(hhmm):
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def minutes_to_hhmm(total):
    h = total // 60
    m = total % 60
    return f"{h:02d}:{m:02d}"


def parse_duration(value, default=60):
    try:
        d = int(value)
        return d if d > 0 else default
    except (TypeError, ValueError):
        return default


# =========================================================
# AUTH
# =========================================================

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            if request.path.startswith("/api/"):
                return json_error("Não autorizado. Faça login.", 401)
            return redirect(url_for("login", next=request.path))
        return f(*args, **kwargs)
    return decorated


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin"))

    erro = None
    if request.method == "POST":
        senha = (request.form.get("password") or "").strip()
        if senha and senha == ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            session.permanent = True
            nxt = request.args.get("next") or url_for("admin")
            if not str(nxt).startswith("/"):
                nxt = url_for("admin")
            return redirect(nxt)
        erro = "Senha incorreta."

    return render_template("login.html", erro=erro)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# =========================================================
# ROTAS PÚBLICAS
# =========================================================

@app.route("/")
def home():
    db = get_db()
    try:
        services = db.execute("""
            SELECT * FROM services WHERE active = 1 ORDER BY id
        """).fetchall()

        portfolio = db.execute("""
            SELECT * FROM portfolio WHERE active = 1 ORDER BY id DESC
        """).fetchall()

        config_rows = db.execute(
            "SELECT key, value FROM settings"
        ).fetchall()
        config = {row["key"]: row["value"] for row in config_rows}

        return render_template(
            "index.html",
            services=[dict(s) for s in services],
            portfolio=[dict(w) for w in portfolio],
            config=config
        )
    finally:
        db.close()


@app.route("/admin")
@login_required
def admin():
    return render_template("admin.html")


# =========================================================
# UPLOAD (protegido)
# =========================================================

@app.route("/api/upload", methods=["POST"])
@login_required
def upload_imagem():
    if "file" not in request.files:
        return json_error("Nenhum arquivo enviado.")

    file = request.files["file"]
    if not file or file.filename == "":
        return json_error("Arquivo inválido.")

    if not allowed_file(file.filename):
        return json_error(
            "Formato não permitido. Use JPG, PNG, WEBP ou GIF."
        )

    filename = secure_filename(file.filename)
    if not filename:
        filename = "imagem.jpg"

    name, ext = os.path.splitext(filename)
    if not ext:
        ext = ".jpg"
    filename = f"{name}_{int(datetime.now().timestamp())}{ext}"

    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    try:
        file.save(path)
    except Exception as e:
        print("ERRO AO SALVAR UPLOAD:", e)
        return json_error(f"Erro ao salvar arquivo: {e}", 500)

    url = f"/static/uploads/{filename}"
    return json_success(url=url)


# =========================================================
# CRIAR AGENDAMENTO (público)
# =========================================================

@app.route("/agendamento", methods=["POST"])
def criar_agendamento():
    data = request.get_json(silent=True)
    if not data:
        return json_error("Dados inválidos.")

    for campo in ["service_id", "date", "time", "name", "phone"]:
        if not data.get(campo):
            return json_error(f"O campo '{campo}' é obrigatório.")

    appointment_date = parse_date(data["date"])
    if not appointment_date:
        return json_error("Data inválida.")

    if appointment_date < date.today():
        return json_error(
            "Não é possível agendar uma data que já passou.",
            409
        )

    normalized_date = normalize_date(data["date"])
    time_str = normalize_time_str(data["time"], default=None)
    if not time_str:
        return json_error("Horário inválido.")

    db = get_db()
    try:
        service = db.execute("""
            SELECT * FROM services WHERE id = ? AND active = 1
        """, (data["service_id"],)).fetchone()

        if not service:
            return json_error(
                "Serviço não encontrado ou inativo.",
                404
            )

        duration = parse_duration(service["duration"], 60)

        blocked = db.execute("""
            SELECT id FROM blocked_dates WHERE date = ?
        """, (normalized_date,)).fetchone()
        if blocked:
            return json_error("Esta data está bloqueada.", 409)

        day_of_week = get_weekday(appointment_date)
        availability = db.execute("""
            SELECT * FROM availability WHERE day_of_week = ?
        """, (day_of_week,)).fetchone()

        if not availability or not availability["enabled"]:
            return json_error(
                "A Naiara não atende neste dia.",
                409
            )

        start_s = normalize_time_str(
            availability["start_time"], "09:00"
        )
        end_s = normalize_time_str(
            availability["end_time"], "18:00"
        )
        if not start_s or not end_s:
            return json_error("Disponibilidade inválida.", 500)

        start_m = time_to_minutes(start_s)
        end_m = time_to_minutes(end_s)
        req_m = time_to_minutes(time_str)

        if req_m < start_m or req_m + duration > end_m:
            return json_error("Horário fora do expediente.", 409)

        if appointment_date == date.today():
            slot_dt = datetime.combine(
                appointment_date,
                datetime.strptime(time_str, "%H:%M").time()
            )
            if slot_dt <= datetime.now() + timedelta(minutes=15):
                return json_error("Este horário já passou.", 409)

        appointments = db.execute("""
            SELECT a.time, s.duration
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.date = ? AND a.status != 'cancelled'
        """, (normalized_date,)).fetchall()

        req_end = req_m + duration
        for ap in appointments:
            try:
                t = normalize_time_str(ap["time"])
                if not t:
                    continue
                ap_start = time_to_minutes(t)
                ap_dur = parse_duration(ap["duration"], 60)
                ap_end = ap_start + ap_dur
                if req_m < ap_end and req_end > ap_start:
                    return json_error(
                        "Este horário já está ocupado "
                        "(conflito de duração).",
                        409
                    )
            except Exception:
                continue

        phone = str(data["phone"]).strip()
        client = db.execute(
            "SELECT id FROM clients WHERE whatsapp = ?",
            (phone,)
        ).fetchone()

        if client:
            client_id = client["id"]
            db.execute("""
                UPDATE clients
                SET name = ?, email = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                str(data["name"]).strip(),
                data.get("email"),
                client_id
            ))
        else:
            cursor = db.execute("""
                INSERT INTO clients (name, whatsapp, email)
                VALUES (?, ?, ?)
            """, (
                str(data["name"]).strip(),
                phone,
                data.get("email")
            ))
            client_id = db.last_id(cursor)

        cursor = db.execute("""
            INSERT INTO appointments (
                client_id, service_id, date, time,
                name, phone, email, local, size, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            client_id,
            data["service_id"],
            normalized_date,
            time_str,
            str(data["name"]).strip(),
            phone,
            data.get("email"),
            data.get("local"),
            data.get("size"),
            data.get("note")
        ))

        db.commit()
        return json_success(
            message="Agendamento criado com sucesso.",
            appointment_id=db.last_id(cursor)
        )

    except Exception as e:
        db.rollback()
        print("ERRO AO CRIAR AGENDAMENTO:", e)
        return json_error(
            "Erro interno ao criar o agendamento.",
            500
        )
    finally:
        db.close()


# =========================================================
# HORÁRIOS (público) — slots até 23:59
# =========================================================

@app.route("/api/horarios")
def horarios_disponiveis():
    requested_date = request.args.get("date")
    service_id = request.args.get("service_id")

    appointment_date = parse_date(requested_date)
    if not appointment_date:
        return jsonify([])

    if appointment_date < date.today():
        return jsonify([])

    normalized_date = normalize_date(requested_date)
    db = get_db()

    try:
        duration = 60
        if service_id:
            service = db.execute("""
                SELECT duration FROM services
                WHERE id = ? AND active = 1
            """, (service_id,)).fetchone()
            if service is not None:
                duration = parse_duration(service["duration"], 60)

        blocked = db.execute(
            "SELECT id FROM blocked_dates WHERE date = ?",
            (normalized_date,)
        ).fetchone()
        if blocked:
            return jsonify([])

        day_of_week = get_weekday(appointment_date)
        availability = db.execute("""
            SELECT * FROM availability WHERE day_of_week = ?
        """, (day_of_week,)).fetchone()

        if not availability or not availability["enabled"]:
            return jsonify([])

        start_s = normalize_time_str(
            availability["start_time"], "09:00"
        )
        end_s = normalize_time_str(
            availability["end_time"], "18:00"
        )
        if not start_s or not end_s:
            return jsonify([])

        start_m = time_to_minutes(start_s)
        end_m = time_to_minutes(end_s)

        if end_m <= start_m:
            return jsonify([])

        appointments = db.execute("""
            SELECT a.time, s.duration
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.date = ? AND a.status != 'cancelled'
        """, (normalized_date,)).fetchall()

        occupied = []
        for ap in appointments:
            try:
                t = normalize_time_str(ap["time"])
                if not t:
                    continue
                ap_start = time_to_minutes(t)
                ap_dur = parse_duration(ap["duration"], 60)
                occupied.append((ap_start, ap_start + ap_dur))
            except Exception:
                continue

        horarios = []
        now = datetime.now()
        step = 30
        minute = start_m

        while minute + duration <= end_m:
            slot_end = minute + duration
            conflict = False
            for occ_start, occ_end in occupied:
                if minute < occ_end and slot_end > occ_start:
                    conflict = True
                    break

            if not conflict:
                if appointment_date == date.today():
                    slot_dt = datetime.combine(
                        appointment_date,
                        datetime.strptime(
                            minutes_to_hhmm(minute), "%H:%M"
                        ).time()
                    )
                    if slot_dt <= now + timedelta(minutes=15):
                        minute += step
                        continue

                horarios.append(minutes_to_hhmm(minute))

            minute += step

        return jsonify(horarios)

    except Exception as e:
        print("ERRO AO CARREGAR HORÁRIOS:", e)
        return jsonify([])
    finally:
        db.close()


# =========================================================
# AGENDAMENTOS (protegido)
# =========================================================

@app.route("/api/agendamentos")
@login_required
def api_agendamentos():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                a.id, a.date, a.time, a.status,
                a.name AS cliente, a.phone AS whatsapp,
                a.email, a.local, a.size, a.note, a.created_at,
                s.name AS servico,
                s.price AS service_price,
                s.duration AS service_duration
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            ORDER BY a.date, a.time
        """).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()


@app.route("/api/agendamentos/<int:appointment_id>")
@login_required
def detalhes_agendamento(appointment_id):
    db = get_db()
    try:
        row = db.execute("""
            SELECT a.*,
                   s.name AS service_name,
                   s.price AS service_price,
                   s.duration AS service_duration
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.id = ?
        """, (appointment_id,)).fetchone()
        if not row:
            return json_error("Agendamento não encontrado.", 404)
        return jsonify(dict(row))
    finally:
        db.close()


@app.route(
    "/api/agendamentos/<int:appointment_id>/status",
    methods=["PUT"]
)
@login_required
def alterar_status_agendamento(appointment_id):
    data = request.get_json(silent=True) or {}
    novo_status = data.get("status")
    if novo_status not in [
        "pending", "confirmed", "completed", "cancelled"
    ]:
        return json_error("Status inválido.")

    db = get_db()
    try:
        exists = db.execute(
            "SELECT id FROM appointments WHERE id = ?",
            (appointment_id,)
        ).fetchone()
        if not exists:
            return json_error(
                "Agendamento não encontrado.",
                404
            )
        db.execute(
            "UPDATE appointments SET status = ? WHERE id = ?",
            (novo_status, appointment_id)
        )
        db.commit()
        return json_success(status=novo_status)
    finally:
        db.close()


# =========================================================
# CLIENTES (protegido)
# =========================================================

@app.route("/api/clientes")
@login_required
def api_clientes():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                c.id, c.name AS nome, c.whatsapp, c.email,
                COUNT(a.id) AS agendamentos
            FROM clients c
            LEFT JOIN appointments a ON a.client_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        """).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()


# =========================================================
# SERVIÇOS
# =========================================================

@app.route("/api/servicos")
def api_servicos():
    db = get_db()
    try:
        if session.get("admin_logged_in"):
            rows = db.execute(
                "SELECT * FROM services ORDER BY id DESC"
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM services WHERE active = 1 ORDER BY id"
            ).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()


@app.route("/api/servicos", methods=["POST"])
@login_required
def criar_servico():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "")).strip()
    if not name or not category:
        return json_error("Nome e categoria são obrigatórios.")

    db = get_db()
    try:
        cursor = db.execute("""
            INSERT INTO services
                (name, category, description, price, duration, active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (
            name,
            category,
            data.get("description"),
            data.get("price"),
            parse_duration(data.get("duration"), 60)
        ))
        db.commit()
        return json_success(id=db.last_id(cursor))
    finally:
        db.close()


@app.route("/api/servicos/<int:service_id>", methods=["PUT"])
@login_required
def editar_servico(service_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "")).strip()
    if not name or not category:
        return json_error("Nome e categoria são obrigatórios.")

    db = get_db()
    try:
        exists = db.execute(
            "SELECT id FROM services WHERE id = ?",
            (service_id,)
        ).fetchone()
        if not exists:
            return json_error("Serviço não encontrado.", 404)
        db.execute("""
            UPDATE services
            SET name=?, category=?, description=?,
                price=?, duration=?
            WHERE id=?
        """, (
            name,
            category,
            data.get("description"),
            data.get("price"),
            parse_duration(data.get("duration"), 60),
            service_id
        ))
        db.commit()
        return json_success()
    finally:
        db.close()


@app.route(
    "/api/servicos/<int:service_id>/toggle",
    methods=["PUT"]
)
@login_required
def toggle_servico(service_id):
    db = get_db()
    try:
        service = db.execute(
            "SELECT active FROM services WHERE id = ?",
            (service_id,)
        ).fetchone()
        if not service:
            return json_error("Serviço não encontrado.", 404)
        novo = 0 if service["active"] else 1
        db.execute(
            "UPDATE services SET active = ? WHERE id = ?",
            (novo, service_id)
        )
        db.commit()
        return json_success(active=novo)
    finally:
        db.close()


# =========================================================
# PORTFÓLIO
# =========================================================

@app.route("/api/portfolio")
def api_portfolio():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM portfolio ORDER BY id DESC"
        ).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()


@app.route("/api/portfolio", methods=["POST"])
@login_required
def criar_portfolio():
    data = request.get_json(silent=True) or {}
    category = str(data.get("category", "")).strip()
    image = str(data.get("image", "")).strip()
    if not category or not image:
        return json_error(
            "Categoria e imagem são obrigatórias."
        )
    db = get_db()
    try:
        cursor = db.execute("""
            INSERT INTO portfolio (category, image, active)
            VALUES (?, ?, 1)
        """, (category, image))
        db.commit()
        return json_success(id=db.last_id(cursor))
    finally:
        db.close()


@app.route("/api/portfolio/<int:portfolio_id>", methods=["PUT"])
@login_required
def editar_portfolio(portfolio_id):
    data = request.get_json(silent=True) or {}
    category = str(data.get("category", "")).strip()
    image = str(data.get("image", "")).strip()
    if not category or not image:
        return json_error(
            "Categoria e imagem são obrigatórias."
        )
    db = get_db()
    try:
        exists = db.execute(
            "SELECT id FROM portfolio WHERE id = ?",
            (portfolio_id,)
        ).fetchone()
        if not exists:
            return json_error("Imagem não encontrada.", 404)
        db.execute(
            "UPDATE portfolio SET category=?, image=? WHERE id=?",
            (category, image, portfolio_id)
        )
        db.commit()
        return json_success()
    finally:
        db.close()


@app.route(
    "/api/portfolio/<int:portfolio_id>",
    methods=["DELETE"]
)
@login_required
def excluir_portfolio(portfolio_id):
    db = get_db()
    try:
        db.execute(
            "DELETE FROM portfolio WHERE id = ?",
            (portfolio_id,)
        )
        db.commit()
        return json_success()
    finally:
        db.close()


# =========================================================
# DISPONIBILIDADE
# =========================================================

@app.route("/api/disponibilidade")
def api_disponibilidade():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM availability ORDER BY day_of_week"
        ).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()


@app.route(
    "/api/disponibilidade/<int:day_id>",
    methods=["PUT"]
)
@login_required
def editar_disponibilidade(day_id):
    data = request.get_json(silent=True) or {}
    enabled = bool(data.get("enabled"))

    db = get_db()
    try:
        day = db.execute(
            "SELECT * FROM availability WHERE id = ?",
            (day_id,)
        ).fetchone()
        if not day:
            return json_error("Dia não encontrado.", 404)

        if enabled:
            start_time = normalize_time_str(
                data.get("start_time"),
                day["start_time"] or "09:00"
            )
            end_time = normalize_time_str(
                data.get("end_time"),
                day["end_time"] or "18:00"
            )
            if not start_time or not end_time:
                return json_error(
                    "Horário inválido. Use HH:MM "
                    "(ex: 08:00 ou 23:50)."
                )
            if time_to_minutes(start_time) >= time_to_minutes(end_time):
                return json_error(
                    "O horário final deve ser maior que o inicial."
                )
        else:
            # Fecha o dia sem apagar horários (evita NOT NULL)
            start_time = day["start_time"] or "09:00"
            end_time = day["end_time"] or "18:00"

        db.execute("""
            UPDATE availability
            SET start_time = ?, end_time = ?, enabled = ?
            WHERE id = ?
        """, (
            start_time,
            end_time,
            1 if enabled else 0,
            day_id
        ))
        db.commit()
        return json_success(
            enabled=bool(enabled),
            start_time=start_time,
            end_time=end_time
        )
    finally:
        db.close()


# =========================================================
# DATAS BLOQUEADAS
# =========================================================

@app.route("/api/datas-bloqueadas")
def api_datas_bloqueadas():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM blocked_dates ORDER BY date"
        ).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()


@app.route("/api/datas-bloqueadas", methods=["POST"])
@login_required
def bloquear_data():
    data = request.get_json(silent=True) or {}
    value = data.get("date")
    if not value:
        return json_error("Informe a data.")
    normalized = normalize_date(value)
    if not normalized:
        return json_error("Data inválida.")
    db = get_db()
    try:
        db.execute(
            "INSERT INTO blocked_dates (date, reason) VALUES (?, ?)",
            (normalized, data.get("reason"))
        )
        db.commit()
        return json_success()
    except Exception:
        db.rollback()
        return json_error("Esta data já está bloqueada.", 409)
    finally:
        db.close()


@app.route(
    "/api/datas-bloqueadas/<int:block_id>",
    methods=["DELETE"]
)
@login_required
def desbloquear_data(block_id):
    db = get_db()
    try:
        db.execute(
            "DELETE FROM blocked_dates WHERE id = ?",
            (block_id,)
        )
        db.commit()
        return json_success()
    finally:
        db.close()


# =========================================================
# CONFIG
# =========================================================

@app.route("/api/config")
def api_config():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT key, value FROM settings"
        ).fetchall()
        return jsonify({r["key"]: r["value"] for r in rows})
    finally:
        db.close()


@app.route("/api/config", methods=["PUT"])
@login_required
def salvar_config():
    data = request.get_json(silent=True) or {}
    db = get_db()
    try:
        for key, value in data.items():
            db.execute("""
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (key, str(value)))
        db.commit()
        return json_success()
    finally:
        db.close()


# =========================================================
# DASHBOARD (protegido)
# =========================================================

@app.route("/api/dashboard")
@login_required
def dashboard():
    db = get_db()
    try:
        hoje = date.today().strftime("%Y-%m-%d")
        hoje_total = db.execute("""
            SELECT COUNT(*) AS total FROM appointments
            WHERE date = ? AND status != 'cancelled'
        """, (hoje,)).fetchone()["total"]

        pendentes = db.execute(
            "SELECT COUNT(*) AS total FROM appointments "
            "WHERE status = 'pending'"
        ).fetchone()["total"]
        confirmados = db.execute(
            "SELECT COUNT(*) AS total FROM appointments "
            "WHERE status = 'confirmed'"
        ).fetchone()["total"]
        cancelados = db.execute(
            "SELECT COUNT(*) AS total FROM appointments "
            "WHERE status = 'cancelled'"
        ).fetchone()["total"]
        clientes = db.execute(
            "SELECT COUNT(*) AS total FROM clients"
        ).fetchone()["total"]

        return jsonify({
            "hoje": hoje_total,
            "pendentes": pendentes,
            "confirmados": confirmados,
            "cancelados": cancelados,
            "clientes": clientes
        })
    finally:
        db.close()

# =========================================================
# LIMPEZA / EXCLUSÃO
# =========================================================

@app.route("/api/agendamentos/<int:appointment_id>", methods=["DELETE"])
@login_required
def excluir_agendamento(appointment_id):
    db = get_db()
    try:
        exists = db.execute(
            "SELECT id FROM appointments WHERE id = ?",
            (appointment_id,)
        ).fetchone()
        if not exists:
            return json_error("Agendamento não encontrado.", 404)

        db.execute(
            "DELETE FROM appointments WHERE id = ?",
            (appointment_id,)
        )
        db.commit()
        return json_success(message="Agendamento excluído.")
    except Exception as e:
        db.rollback()
        print("ERRO AO EXCLUIR AGENDAMENTO:", e)
        return json_error(f"Erro ao excluir: {e}", 500)
    finally:
        db.close()


@app.route("/api/limpeza", methods=["POST"])
@login_required
def limpeza_banco():
    """
    Remove agendamentos antigos:
    - cancelados com 30+ dias
    - concluídos (completed) com 90+ dias
    Não apaga pendentes/confirmados futuros.
    """
    data = request.get_json(silent=True) or {}
    dias_cancelados = int(data.get("dias_cancelados") or 30)
    dias_concluidos = int(data.get("dias_concluidos") or 90)

    limite_cancel = (
        date.today() - timedelta(days=dias_cancelados)
    ).strftime("%Y-%m-%d")
    limite_done = (
        date.today() - timedelta(days=dias_concluidos)
    ).strftime("%Y-%m-%d")

    db = get_db()
    try:
        cur1 = db.execute("""
            DELETE FROM appointments
            WHERE status = 'cancelled' AND date < ?
        """, (limite_cancel,))
        n_cancel = cur1.rowcount

        cur2 = db.execute("""
            DELETE FROM appointments
            WHERE status = 'completed' AND date < ?
        """, (limite_done,))
        n_done = cur2.rowcount

        db.commit()

        cur3 = db.execute("""
            DELETE FROM clients
            WHERE id NOT IN (
                SELECT DISTINCT client_id FROM appointments
                WHERE client_id IS NOT NULL
            )
        """)
        n_clientes = cur3.rowcount

        db.commit()
        return json_success(
            message="Limpeza concluída.",
            cancelados_removidos=n_cancel,
            concluidos_removidos=n_done,
            clientes_removidos=n_clientes
        )

        return json_success(
            message="Limpeza concluída.",
            cancelados_removidos=n_cancel,
            concluidos_removidos=n_done
        )
    except Exception as e:
        db.rollback()
        print("ERRO LIMPEZA:", e)
        return json_error("Erro na limpeza.", 500)
    finally:
        db.close()

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)