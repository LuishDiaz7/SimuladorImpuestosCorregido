from flask import Blueprint, request, jsonify
from flask_login import login_user, current_user, logout_user, login_required
from functools import wraps
from . import db
from .models import User, Declaration
from werkzeug.security import generate_password_hash
import re
from datetime import datetime

bp = Blueprint('main', __name__)

# Helper para validar contraseña fuerte
def validate_strong_password(password):
    """Valida que la contraseña cumpla con requisitos de seguridad"""
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    if not re.search(r'[A-Z]', password):
        return False, "La contraseña debe contener al menos una letra mayúscula"
    if not re.search(r'[a-z]', password):
        return False, "La contraseña debe contener al menos una letra minúscula"
    if not re.search(r'[0-9]', password):
        return False, "La contraseña debe contener al menos un número"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "La contraseña debe contener al menos un carácter especial"
    return True, ""

#  Helper para validar email estricto
def validate_email(email):
    """Valida formato de email sin caracteres especiales prohibidos"""
    email_regex = r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email) is not None

def serialize(model_instance):
    """Serializa un objeto SQLAlchemy a un diccionario."""
    if isinstance(model_instance, User):
        return {
            'id': model_instance.id,
            'nombre_completo': model_instance.nombre_completo,
            'tipo_documento': model_instance.tipo_documento,
            'numero_documento': model_instance.numero_documento,
            'correo_electronico': model_instance.correo_electronico,
            'estado': model_instance.estado,
            'es_admin': model_instance.es_admin
        }
    elif isinstance(model_instance, Declaration):
        return {
            'id': model_instance.id,
            'user_id': model_instance.user_id,
            'ano_fiscal': model_instance.ano_fiscal,
            'ingresos_totales': model_instance.ingresos_totales,
            'deducciones_aplicadas': model_instance.deducciones_aplicadas,
            'estado_civil': model_instance.estado_civil,
            'dependientes': model_instance.dependientes,
            'otros_ingresos_deducciones': model_instance.otros_ingresos_deducciones,
            'estado_declaracion': model_instance.estado_declaracion,
            'fecha_creacion': model_instance.fecha_creacion.isoformat()
        }
    return None

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.es_admin:
            return jsonify({'message': 'Acceso no autorizado. Se requiere rol de administrador.'}), 403
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/session', methods=['GET'])
@login_required
def check_session():
    """Devuelve los datos del usuario si está autenticado."""
    return jsonify({'user': serialize(current_user)}), 200

@bp.route('/session', methods=['DELETE'])
@login_required
def logout_api():
    """Cierra la sesión del usuario."""
    logout_user()
    return jsonify({'message': 'Sesión cerrada exitosamente.'}), 200

@bp.route('/register', methods=['POST'])
def register_api():
    if current_user.is_authenticated and not current_user.es_admin:
        return jsonify({'message': 'Ya estás autenticado. No puedes crear otros usuarios.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No se recibieron datos JSON.'}), 400

    required_fields = ['nombre_completo', 'tipo_documento', 'numero_documento', 'correo_electronico', 'password']
    errors = {}

    # BUG-010: Validar nombre no vacío
    if 'nombre_completo' not in data or not data['nombre_completo'] or not data['nombre_completo'].strip():
        errors['nombre_completo'] = 'El nombre completo es requerido'
    elif len(data['nombre_completo'].strip()) < 3:
        errors['nombre_completo'] = 'El nombre debe tener al menos 3 caracteres'
    elif not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', data['nombre_completo']):
        errors['nombre_completo'] = 'El nombre solo debe contener letras'

    for field in required_fields:
        if field not in data or not data[field]:
            if field not in errors:  # No sobrescribir si ya hay error
                errors[field] = f'{field.replace("_"," ").capitalize()} es requerido.'

    # BUG-005: Validar número de documento según tipo
    if 'numero_documento' in data and 'tipo_documento' in data:
        if data['tipo_documento'] == 'PP':
            # Pasaporte: alfanumérico
            if not re.match(r'^[A-Za-z0-9]+$', data['numero_documento']):
                errors['numero_documento'] = 'El pasaporte solo debe contener letras y números'
        else:
            # CC, CE, TI: solo números
            if not re.match(r'^\d+$', data['numero_documento']): # <-- ¡CORREGIDO!
                errors['numero_documento'] = 'El número de documento solo debe contener números'

    # Validar contraseña fuerte
    if 'password' in data and data['password']:
        is_valid, error_msg = validate_strong_password(data['password'])
        if not is_valid:
            errors['password'] = error_msg

    # BUG-008: Validar correo electrónico y duplicidad
    if 'correo_electronico' in data and data['correo_electronico'].strip():
        email = data['correo_electronico'].strip().lower()
        if not validate_email(email):
             errors['correo_electronico'] = 'El formato del correo electrónico es inválido.'
        elif User.query.filter_by(correo_electronico=email).first():
            errors['correo_electronico'] = 'El correo electrónico ya está en uso.'

    if errors:
        return jsonify({'message': 'Errores de validación', 'errors': errors}), 422

    try:
        es_admin = False
        if current_user.is_authenticated and current_user.es_admin and 'es_admin' in data:
            es_admin = bool(data['es_admin'])
        
        user = User(
            nombre_completo=data['nombre_completo'].strip(),
            tipo_documento=data['tipo_documento'],
            numero_documento=data['numero_documento'],
            correo_electronico=data['correo_electronico'].strip().lower(),
            estado='activo',
            es_admin=es_admin
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Usuario creado exitosamente.', 'user': serialize(user)}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error en registro: {e}")
        return jsonify({'message': 'Error interno al crear el usuario.'}), 500

@bp.route('/login', methods=['POST'])
def login_api():
    if current_user.is_authenticated:
        return jsonify({'message': 'Ya estás autenticado.', 'user': serialize(current_user)}), 200

    data = request.get_json()
    if not data or 'correo_electronico' not in data or 'password' not in data:
        return jsonify({'message': 'Correo electrónico y contraseña requeridos.'}), 400

    user = User.query.filter_by(correo_electronico=data['correo_electronico']).first()

    if user and user.check_password(data['password']):
        if user.estado == 'activo':
            login_user(user, remember=data.get('remember', False))
            return jsonify({'message': 'Inicio de sesión exitoso.', 'user': serialize(user)}), 200
        else:
            return jsonify({'message': 'Tu cuenta está inactiva. Contacta al administrador.'}), 403
    else:
        return jsonify({'message': 'Credenciales inválidas.'}), 401

@bp.route('/declarations', methods=['GET'])
@login_required
def get_declarations():
    """Obtiene las declaraciones del usuario actual."""
    declarations = Declaration.query.filter_by(author=current_user).all()
    return jsonify([serialize(d) for d in declarations]), 200

@bp.route('/declarations', methods=['POST'])
@login_required
def create_declaration():
    """Crea una nueva declaración para el usuario actual."""
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No se recibieron datos JSON.'}), 400

    required_fields = ['ano_fiscal', 'ingresos_totales', 'estado_civil']
    errors = {field: f'{field.replace("_"," ").capitalize()} es requerido.' for field in required_fields if field not in data or data[field] is None}

    # BUG-012: Validación de año fiscal (no futuro)
    try:
        ano = int(data.get('ano_fiscal', 0))
        current_year = datetime.now().year
        if not 2000 <= ano <= current_year:
            errors['ano_fiscal'] = f'Año fiscal inválido. Debe estar entre 2000 y {current_year}.'
    except (ValueError, TypeError):
        errors['ano_fiscal'] = 'Año fiscal debe ser un número entero válido.'

    # BUG-013: Validación de ingresos mínimos (1M COP)
    try:
        ingresos = float(data.get('ingresos_totales', 0.0))
        
        if ingresos < 0:
            errors['ingresos_totales'] = 'Los ingresos totales no pueden ser negativos.'
        elif ingresos < 1000000:
            errors['ingresos_totales'] = 'Los ingresos totales deben ser al menos $1,000,000 COP.'
        elif ingresos > 999999999999:
            errors['ingresos_totales'] = 'Los ingresos totales exceden el límite permitido.'
            
    except (ValueError, TypeError):
        errors['ingresos_totales'] = 'Los ingresos totales deben ser un número válido.'

    estados_civiles_validos = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a']
    if data.get('estado_civil') not in estados_civiles_validos:
        errors['estado_civil'] = f'Estado civil inválido. Debe ser uno de: {", ".join(estados_civiles_validos)}.'

    # BUG-007: Validación de dependientes máximo 5
    if 'dependientes' in data and data['dependientes'] is not None:
        try:
            deps = int(data['dependientes'])
            if deps < 0:
                errors['dependientes'] = 'El número de dependientes no puede ser negativo.'
            if deps > 5:
                errors['dependientes'] = 'El número de dependientes no puede ser mayor a 5 (normativa colombiana).'
        except (ValueError, TypeError):
            errors['dependientes'] = 'El número de dependientes debe ser un número entero válido.'

    # BUG-004: Validación de deducciones con mínimo razonable
    if 'deducciones_aplicadas' in data and data['deducciones_aplicadas'] is not None:
        try:
            deducciones = float(data['deducciones_aplicadas'])
            if deducciones < 0:
                errors['deducciones_aplicadas'] = 'Las deducciones no pueden ser negativas.'
            elif deducciones > 0 and deducciones < 1000:
                errors['deducciones_aplicadas'] = 'Las deducciones deben ser al menos $1,000 COP o cero.'
            elif deducciones > 999999999999:
                errors['deducciones_aplicadas'] = 'Las deducciones exceden el límite permitido.'
        except (ValueError, TypeError):
            errors['deducciones_aplicadas'] = 'Las deducciones deben ser un número válido.'

    if 'otros_ingresos_deducciones' in data and data['otros_ingresos_deducciones']:
        otros = str(data['otros_ingresos_deducciones']).strip()
        if len(otros) > 1000:
            errors['otros_ingresos_deducciones'] = 'El campo "otros ingresos/deducciones" es demasiado largo (máximo 1000 caracteres).'

    if errors:
        return jsonify({'message': 'Errores de validación', 'errors': errors}), 422

    try:
        declaration = Declaration(
            ano_fiscal=data['ano_fiscal'],
            ingresos_totales=data['ingresos_totales'],
            deducciones_aplicadas=data.get('deducciones_aplicadas', 0.0),
            estado_civil=data['estado_civil'],
            dependientes=data.get('dependientes'),
            otros_ingresos_deducciones=data.get('otros_ingresos_deducciones'),
            estado_declaracion='Guardada',
            author=current_user
        )
        db.session.add(declaration)
        db.session.commit()
        return jsonify({'message': 'Declaración creada exitosamente.', 'declaration': serialize(declaration)}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error al crear declaración: {e}")
        return jsonify({'message': 'Error interno al crear la declaración.'}), 500

@bp.route('/admin/users', methods=['GET'])
@login_required
@admin_required
def admin_get_users():
    """Obtiene la lista de usuarios (con paginación y búsqueda)."""
    search_query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    query = User.query
    
    if search_query:
        search_term = f'%{search_query}%'
        query = query.filter(
            User.nombre_completo.ilike(search_term) |
            User.correo_electronico.ilike(search_term) |
            User.numero_documento.ilike(search_term)
        )
    
    try:
        pagination = query.order_by(User.id.asc()).paginate(page=page, per_page=per_page, error_out=False)
        users = pagination.items
        
        response = {
            'users': [serialize(u) for u in users],
            'total': pagination.total,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    except Exception as e:
        print(f"Error en paginación: {e}")
        users = query.order_by(User.id.asc()).all()
        
        response = {
            'users': [serialize(u) for u in users],
            'total': len(users),
            'page': 1,
            'per_page': len(users),
            'pages': 1,
            'has_next': False,
            'has_prev': False
        }
    
    return jsonify(response), 200

@bp.route('/admin/users/<int:user_id>', methods=['GET'])
@login_required
@admin_required
def admin_get_user(user_id):
    """Obtiene los detalles de un usuario específico."""
    user = User.query.get_or_404(user_id)
    return jsonify(serialize(user)), 200

@bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def admin_update_user(user_id):
    """Actualiza la información de un usuario."""
    user_to_edit = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No se recibieron datos JSON.'}), 400

    errors = {}
    

    if 'nombre_completo' in data:
        if not data['nombre_completo'] or not data['nombre_completo'].strip():
            errors['nombre_completo'] = 'El nombre completo no puede estar vacío.'
        elif len(data['nombre_completo'].strip()) < 3:
            errors['nombre_completo'] = 'El nombre debe tener al menos 3 caracteres'
        elif not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', data['nombre_completo']):
            errors['nombre_completo'] = 'El nombre solo debe contener letras'
    
    if 'correo_electronico' in data:
        if not data['correo_electronico'] or not data['correo_electronico'].strip():
            errors['correo_electronico'] = 'El correo electrónico no puede estar vacío.'
        elif not validate_email(data['correo_electronico']):
            errors['correo_electronico'] = 'Email inválido. Solo se permiten letras, números, puntos, guiones y guiones bajos'
        elif data['correo_electronico'] != user_to_edit.correo_electronico and User.query.filter_by(correo_electronico=data['correo_electronico']).first():
            errors['correo_electronico'] = 'El correo electrónico ya está en uso.'

    if 'password' in data and data['password']:
        is_valid, error_msg = validate_strong_password(data['password'])
        if not is_valid:
            errors['password'] = error_msg

    if 'estado' in data and data['estado'] not in ['activo', 'inactivo']:
        errors['estado'] = 'Estado inválido. Debe ser "activo" o "inactivo".'
    
    if 'es_admin' in data and not isinstance(data['es_admin'], bool):
        errors['es_admin'] = 'El rol de administrador debe ser verdadero o falso.'

    if errors:
        return jsonify({'message': 'Errores de validación', 'errors': errors}), 422

    try:
        if 'nombre_completo' in data:
            user_to_edit.nombre_completo = data['nombre_completo'].strip()
        if 'correo_electronico' in data:
            user_to_edit.correo_electronico = data['correo_electronico'].strip().lower()
        if 'password' in data and data['password']:
            user_to_edit.set_password(data['password'])
        if 'estado' in data:
            user_to_edit.estado = data['estado']
        if 'es_admin' in data:
            user_to_edit.es_admin = data['es_admin']

        db.session.commit()
        return jsonify({'message': 'Usuario actualizado exitosamente.', 'user': serialize(user_to_edit)}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error al actualizar usuario: {e}")
        return jsonify({'message': 'Error interno al actualizar el usuario.'}), 500

@bp.route('/admin/users/<int:user_id>/toggle_status', methods=['POST'])
@login_required
@admin_required
def admin_toggle_user_status_api(user_id):
    """Cambia el estado de un usuario (activo/inactivo)."""
    user_to_toggle = User.query.get_or_404(user_id)
    
    if user_to_toggle == current_user:
        return jsonify({'message': 'No puedes cambiar tu propio estado.'}), 403

    try:
        user_to_toggle.estado = 'inactivo' if user_to_toggle.estado == 'activo' else 'activo'
        db.session.commit()
        return jsonify({'message': f'Estado del usuario cambiado a {user_to_toggle.estado}.', 'user': serialize(user_to_toggle)}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error al cambiar estado del usuario: {e}")
        return jsonify({'message': 'Error interno al cambiar el estado del usuario.'}), 500
    
@bp.route('/find-mail', methods=['GET'])
def find_mail():
    """Verifica si el correo electrónico existe."""
    email = request.args.get('mail')
    if not email:
        return jsonify({'message': 'Correo electrónico requerido.'}), 400

    user = User.query.filter_by(correo_electronico=email).first()
    if user:
        return jsonify({'exists': True}), 200
    else:
        return jsonify({'exists': False}), 200

@bp.route('/reset-password', methods=['PATCH'])
def update_pass():
    """Actualiza la contraseña del usuario."""
    data = request.get_json()
    if not data or 'mail' not in data or 'password' not in data:
        return jsonify({'message': 'Correo electrónico y contraseña requeridos.'}), 400

    is_valid, error_msg = validate_strong_password(data['password'])
    if not is_valid:
        return jsonify({'message': error_msg}), 422

    user = User.query.filter_by(correo_electronico=data['mail']).first()
    if user:
        user.set_password(data['password'])
        db.session.commit()
        return jsonify({'message': 'Contraseña actualizada exitosamente.'}), 200
    else:
        return jsonify({'message': 'Usuario no encontrado.'}), 404 # <-- ¡CORREGIDO!
    
    
    
    