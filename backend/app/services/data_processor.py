import math

import pandas as pd

from app.models import EnergyMeasurement


class DataProcessor:
    """Preview and selectively process CSV and Excel data files."""

    TEMPERATURE_PATTERNS = ['temp', 'temperature', 't_in', 't_out', 'inlet', 'outlet']
    HUMIDITY_PATTERNS = ['humidity', 'rh', 'relative humidity']
    LUX_DISTRIBUTION_PATTERNS = ['lux distribution', 'illumination distribution', 'lighting distribution']
    LUX_LEVEL_PATTERNS = ['lux', 'illuminance', 'illumination']
    POWER_PATTERNS = ['power', 'kw', 'watts', 'energy', 'consumption']
    FLOW_PATTERNS = ['flow', 'gpm', 'l/min', 'liter', 'volume']
    PRESSURE_PATTERNS = ['pressure', 'bar', 'pa']
    EQUIPMENT_KEYWORDS = ['chiller', 'pump', 'fan', 'compressor', 'boiler', 'ahu', 'cooling_tower', 'room survey', 'room_survey']
    TIMESTAMP_COLUMNS = ['timestamp', 'date', 'time', 'datetime', 'ts']

    def preview_file(self, filepath, registered_equipment=None):
        """Return workbook metadata so the UI can choose tabs and columns."""

        registered_equipment = registered_equipment or []
        equipment_catalog = [equipment.to_dict() for equipment in registered_equipment]
        sheets = self._load_sheets(filepath)

        sheet_previews = []
        for sheet_name, dataframe in sheets.items():
            columns = []
            timestamp_candidates = []

            for column in dataframe.columns:
                column_name = str(column)
                sample_values = self._sample_values(dataframe[column].head(5).tolist())
                measurement_type, unit = self._infer_measurement_type(column_name)
                equipment_type, equipment_label = self._infer_equipment_context(
                    column_name=column_name,
                    sheet_name=sheet_name,
                    equipment_catalog=equipment_catalog
                )

                column_info = {
                    'column_name': column_name,
                    'sample_values': sample_values,
                    'recommended_measurement_type': measurement_type,
                    'recommended_unit': unit,
                    'recommended_equipment_type': equipment_type,
                    'recommended_equipment_label': equipment_label,
                }

                columns.append(column_info)

                if self._looks_like_timestamp_column(dataframe[column], column_name):
                    timestamp_candidates.append(column_name)

            preview_rows = dataframe.head(5).fillna('').astype(str).to_dict(orient='records')
            sheet_previews.append({
                'sheet_name': sheet_name,
                'row_count': int(len(dataframe.index)),
                'columns': columns,
                'timestamp_candidates': timestamp_candidates,
                'preview_rows': preview_rows
            })

        return {
            'sheet_count': len(sheet_previews),
            'sheets': sheet_previews
        }

    def import_selection(self, filepath, audit_id, selections, cleanup_options=None, import_batch=None):
        """Create measurements from explicitly selected sheet/column mappings."""

        sheets = self._load_sheets(filepath)
        cleanup_options = cleanup_options or {}
        measurements = []
        import_summary = {
            'processed_sheets': [],
            'skipped_sheets': [],
            'cleanup': cleanup_options
        }

        for selection in selections:
            sheet_name = selection.get('sheet_name')
            if sheet_name not in sheets:
                import_summary['skipped_sheets'].append({
                    'sheet_name': sheet_name,
                    'reason': 'Sheet not found in workbook'
                })
                continue

            dataframe = sheets[sheet_name]
            timestamp_column = selection.get('timestamp_column')
            column_mappings = selection.get('columns', [])

            if not timestamp_column or timestamp_column not in dataframe.columns:
                import_summary['skipped_sheets'].append({
                    'sheet_name': sheet_name,
                    'reason': 'Timestamp column is missing or invalid'
                })
                continue

            sheet_measurements = self._import_sheet_selection(
                dataframe=dataframe,
                audit_id=audit_id,
                sheet_name=sheet_name,
                timestamp_column=timestamp_column,
                column_mappings=column_mappings,
                cleanup_options=cleanup_options,
                import_batch=import_batch
            )

            if sheet_measurements:
                measurements.extend(sheet_measurements)
                import_summary['processed_sheets'].append({
                    'sheet_name': sheet_name,
                    'measurement_count': len(sheet_measurements)
                })
            else:
                import_summary['skipped_sheets'].append({
                    'sheet_name': sheet_name,
                    'reason': 'No valid numeric measurements were produced from the selected columns'
                })

        import_summary['sheet_count'] = len(selections)
        return measurements, import_summary

    def _import_sheet_selection(self, dataframe, audit_id, sheet_name, timestamp_column, column_mappings, cleanup_options, import_batch):
        measurements = []

        valid_mappings = [
            mapping for mapping in column_mappings
            if mapping.get('selected') and mapping.get('column_name') in dataframe.columns
        ]

        if cleanup_options.get('remove_empty_rows', True):
            required_columns = [timestamp_column] + [mapping['column_name'] for mapping in valid_mappings]
            dataframe = dataframe.dropna(axis=0, how='all', subset=required_columns)

        if cleanup_options.get('trim_column_names'):
            dataframe = dataframe.rename(columns=lambda value: str(value).strip())
            timestamp_column = str(timestamp_column).strip()
            valid_mappings = [
                {**mapping, 'column_name': str(mapping['column_name']).strip()}
                for mapping in valid_mappings
            ]

        parsed_timestamps = dataframe[timestamp_column].apply(
            lambda value: self._parse_timestamp(value, cleanup_options.get('day_first', False))
        )
        dataframe = dataframe.assign(__parsed_timestamp=parsed_timestamps)
        dataframe = dataframe[dataframe['__parsed_timestamp'].notna()]

        if cleanup_options.get('sort_by_timestamp', True):
            dataframe = dataframe.sort_values('__parsed_timestamp')

        if cleanup_options.get('remove_duplicate_timestamps'):
            dataframe = dataframe.drop_duplicates(subset=['__parsed_timestamp'], keep='last')

        for _, row in dataframe.iterrows():
            timestamp = row.get('__parsed_timestamp')
            if not timestamp:
                continue

            for mapping in valid_mappings:
                column_name = mapping['column_name']

                try:
                    value = float(row[column_name])
                except (ValueError, TypeError):
                    continue

                if math.isnan(value):
                    continue

                measurement_type = (mapping.get('measurement_type') or '').strip().lower()
                equipment_type = (mapping.get('equipment_type') or 'equipment').strip().lower()
                equipment_label = (mapping.get('equipment_label') or sheet_name).strip()
                unit = (mapping.get('unit') or '').strip() or self._default_unit(measurement_type)

                if not measurement_type:
                    continue

                measurements.append(
                    EnergyMeasurement(
                        audit_id=audit_id,
                        equipment_type=equipment_type or 'equipment',
                        equipment_label=equipment_label or sheet_name,
                        measurement_type=measurement_type,
                        unit=unit,
                        source_sheet=sheet_name,
                        source_column=column_name,
                        import_batch=import_batch,
                        timestamp=timestamp,
                        value=value
                    )
                )

        return measurements

    def _load_sheets(self, filepath):
        if filepath.endswith('.csv'):
            return {'CSV Import': pd.read_csv(filepath)}
        if filepath.endswith('.xlsx'):
            try:
                return pd.read_excel(filepath, sheet_name=None, engine='openpyxl')
            except ImportError as exc:
                raise ValueError('Missing Excel dependency openpyxl. Install backend requirements and try again.') from exc
            except Exception as exc:
                raise ValueError(f'Unable to read this .xlsx workbook: {exc}') from exc
        if filepath.endswith('.xls'):
            try:
                return pd.read_excel(filepath, sheet_name=None, engine='xlrd')
            except ImportError as exc:
                raise ValueError('Missing Excel dependency xlrd for .xls workbooks. Install backend requirements and try again.') from exc
            except Exception as exc:
                raise ValueError(f'Unable to read this .xls workbook: {exc}') from exc
        raise ValueError('Unsupported file format')

    def _looks_like_timestamp_column(self, series, column_name):
        if column_name.lower() in self.TIMESTAMP_COLUMNS:
            return True

        sample = series.dropna().head(5)
        if sample.empty:
            return False

        if pd.api.types.is_numeric_dtype(sample):
            return False

        try:
            parsed = pd.to_datetime(sample, errors='coerce', format='mixed')
        except Exception:
            return False

        return parsed.notna().all()

    def _parse_timestamp(self, value, day_first=False):
        try:
            timestamp = pd.to_datetime(value, errors='coerce', dayfirst=day_first)
        except Exception:
            return None

        if pd.isna(timestamp):
            return None

        return timestamp.to_pydatetime()

    def _infer_measurement_type(self, column_name):
        column_name = column_name.lower()

        if any(pattern in column_name for pattern in self.LUX_DISTRIBUTION_PATTERNS):
            return 'lux_distribution', 'lux'
        if any(pattern in column_name for pattern in self.LUX_LEVEL_PATTERNS):
            return 'lux_level', 'lux'
        if any(pattern in column_name for pattern in self.TEMPERATURE_PATTERNS):
            return 'temperature', 'C'
        if any(pattern in column_name for pattern in self.HUMIDITY_PATTERNS):
            return 'humidity', '%'
        if any(pattern in column_name for pattern in self.POWER_PATTERNS):
            return 'power', 'kW'
        if any(pattern in column_name for pattern in self.FLOW_PATTERNS):
            return 'flow', 'L/min'
        if any(pattern in column_name for pattern in self.PRESSURE_PATTERNS):
            return 'pressure', 'bar'

        return '', ''

    def _infer_equipment_context(self, column_name, sheet_name, equipment_catalog):
        targets = [column_name.lower(), str(sheet_name or '').lower()]

        for equipment in equipment_catalog:
            name = equipment['name'].lower()
            if any(name in target for target in targets):
                return equipment['equipment_type'], equipment['name']

        for keyword in self.EQUIPMENT_KEYWORDS:
            if any(keyword in target for target in targets):
                return keyword, self._humanize_label(sheet_name, keyword)

        return 'equipment', self._humanize_label(sheet_name, 'General Equipment')

    def _humanize_label(self, sheet_name, fallback):
        if not sheet_name:
            return fallback

        cleaned = str(sheet_name).replace('_', ' ').strip()
        return cleaned or fallback

    def _default_unit(self, measurement_type):
        defaults = {
            'temperature': 'C',
            'humidity': '%',
            'lux_level': 'lux',
            'lux_distribution': 'lux',
            'power': 'kW',
            'flow': 'L/min',
            'pressure': 'bar'
        }
        return defaults.get(measurement_type, '')

    def _sample_values(self, values):
        sampled = []
        for value in values:
            if pd.isna(value):
                sampled.append('')
            else:
                sampled.append(str(value))
        return sampled
