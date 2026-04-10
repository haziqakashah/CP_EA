import json


PROFILE_TEMPLATES = {
    'chiller': {
        'label': 'Chiller',
        'analyses': ['temperature', 'power', 'flow', 'pressure'],
        'thresholds': {
            'temperature': {'min': 5, 'max': 12},
            'power': {'max': 500},
            'flow': {'min': 100}
        },
        'preferred_plots': {
            'temperature': 'line',
            'power': 'line',
            'flow': 'line',
            'pressure': 'line'
        }
    },
    'pump': {
        'label': 'Pump',
        'analyses': ['power', 'flow', 'pressure'],
        'thresholds': {
            'power': {'max': 90},
            'pressure': {'min': 1}
        },
        'preferred_plots': {
            'power': 'line',
            'flow': 'line',
            'pressure': 'line'
        }
    },
    'ahu': {
        'label': 'AHU',
        'analyses': ['temperature', 'humidity', 'flow'],
        'thresholds': {
            'temperature': {'min': 20, 'max': 25},
            'humidity': {'min': 40, 'max': 65}
        },
        'preferred_plots': {
            'temperature': 'line',
            'humidity': 'line',
            'flow': 'bar'
        }
    },
    'room survey': {
        'label': 'Room Survey',
        'analyses': ['lux_level', 'lux_distribution', 'temperature', 'humidity'],
        'thresholds': {
            'lux_level': {'min': 300},
            'lux_distribution': {'min': 250},
            'temperature': {'min': 23, 'max': 26},
            'humidity': {'min': 40, 'max': 65}
        },
        'preferred_plots': {
            'lux_level': 'bar',
            'lux_distribution': 'bar',
            'temperature': 'line',
            'humidity': 'line'
        }
    }
}


def normalize_profile_type(equipment_type):
    if not equipment_type:
        return 'general'

    normalized = equipment_type.strip().lower().replace('_', ' ')
    if normalized in PROFILE_TEMPLATES:
        return normalized
    return 'general'


def get_profile_template(equipment_type):
    template_key = normalize_profile_type(equipment_type)
    template = PROFILE_TEMPLATES.get(template_key)
    if template:
        return template_key, template

    return 'general', {
        'label': 'General',
        'analyses': [],
        'thresholds': {},
        'preferred_plots': {}
    }


def serialize_template_defaults(equipment_type):
    template_key, template = get_profile_template(equipment_type)
    return {
        'profile_template': template_key,
        'thresholds_json': json.dumps(template.get('thresholds', {})),
        'preferred_plots_json': json.dumps(template.get('preferred_plots', {}))
    }
