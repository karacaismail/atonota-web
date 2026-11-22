import {
  Barcode as BarcodeIcon,
  Crosshair,
  Eraser,
  ImageSquare,
  Lightning,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { Button, ColorPicker, Input, InputNumber, Rate, Upload } from 'antd';
import { type PointerEvent, useRef, useState } from 'react';

import { formatRecordMessage } from '../messages';
import type { DocField, RecordLocale } from '../types';
import type { FieldControlA11yProps } from './FieldShell';

/**
 * Validates attachment URLs against safe relative Frappe paths or HTTPS origins (GV-3).
 */
function isSafeAttachmentUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.startsWith('/files/') || trimmed.startsWith('/private/files/')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface AttachFieldProps {
  value: string | null | undefined;
  isImage: boolean;
  readOnly: boolean;
  locale: RecordLocale;
  a11y: FieldControlA11yProps;
  onChange: (nextValue: string | null) => void;
}

export function AttachField(props: AttachFieldProps) {
  const { value, isImage, readOnly, locale, a11y, onChange } = props;
  const filePath = typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  const safeUrl = filePath ? isSafeAttachmentUrl(filePath) : false;

  return (
    <div className="rv-signature-pad">
      <div className="rv-attach-row">
        {!readOnly ? (
          <Upload
            {...(isImage ? { accept: 'image/*' } : {})}
            showUploadList={false}
            beforeUpload={(file) => {
              const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
              onChange(`/files/${sanitizedName}`);
              return false;
            }}
          >
            <Button
              id={a11y.controlId}
              aria-labelledby={a11y.labelId}
              aria-describedby={a11y.ariaDescribedBy}
              size="middle"
              icon={isImage ? <ImageSquare weight="regular" /> : <UploadSimple weight="regular" />}
            >
              {formatRecordMessage(locale, isImage ? 'attachChooseImage' : 'attachChooseFile')}
            </Button>
          </Upload>
        ) : null}

        {filePath ? (
          safeUrl ? (
            <span className="rv-pill rv-pill--neutral">{filePath}</span>
          ) : (
            <span className="rv-pill rv-pill--warning">
              {formatRecordMessage(locale, 'attachUnsafeUrlBlocked')}
            </span>
          )
        ) : readOnly ? (
          <span className="rv-readonly-box" role="textbox" aria-readonly="true">
            {formatRecordMessage(locale, 'readOnlyEmpty')}
          </span>
        ) : null}

        {filePath && !readOnly ? (
          <Button
            size="middle"
            type="text"
            danger
            icon={<Trash weight="regular" />}
            aria-label={formatRecordMessage(locale, 'attachClearFile')}
            onClick={() => onChange(null)}
          />
        ) : null}
      </div>

      {isImage && filePath && safeUrl ? (
        <img src={filePath} alt="" className="rv-attach-preview" />
      ) : null}
    </div>
  );
}

export interface SignatureFieldProps {
  value: string | null | undefined;
  readOnly: boolean;
  locale: RecordLocale;
  a11y: FieldControlA11yProps;
  onChange: (nextValue: string | null) => void;
}

export function SignatureField(props: SignatureFieldProps) {
  const { value, readOnly, locale, a11y, onChange } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const hasSignature = typeof value === 'string' && value.startsWith('data:image/');

  const getRelativePoint = (event: PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) {
      return;
    }
    const pt = getRelativePoint(event);
    pointsRef.current = [pt];
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || readOnly) {
      return;
    }
    const pt = getRelativePoint(event);
    pointsRef.current.push(pt);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = () => {
    if (!drawing || readOnly) {
      return;
    }
    setDrawing(false);
    const pts = pointsRef.current;
    if (pts.length === 0) {
      return;
    }
    const pathD = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><path d="${pathD}" stroke="#0b1220" stroke-width="2" fill="none"/></svg>`;
    onChange(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  };

  const handleClear = () => {
    pointsRef.current = [];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange(null);
  };

  return (
    <div className="rv-signature-pad">
      {!readOnly ? (
        <canvas
          id={a11y.controlId}
          ref={canvasRef}
          width={320}
          height={120}
          role="img"
          aria-labelledby={a11y.labelId}
          aria-describedby={a11y.ariaDescribedBy}
          className="rv-signature-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      ) : hasSignature ? (
        <img src={value} alt="" className="rv-attach-preview" />
      ) : null}

      <div className="rv-attach-row">
        <span className={hasSignature ? 'rv-pill rv-pill--primary' : 'rv-pill rv-pill--neutral'}>
          {formatRecordMessage(
            locale,
            hasSignature ? 'signatureSignedBadge' : 'signatureEmptyBadge',
          )}
        </span>
        {!readOnly ? (
          <>
            <span className="rv-field-help">
              {formatRecordMessage(locale, 'signatureDrawHint')}
            </span>
            {hasSignature ? (
              <Button size="small" icon={<Eraser weight="regular" />} onClick={handleClear}>
                {formatRecordMessage(locale, 'signatureClear')}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

interface ParsedCoordinates {
  lat: number | null;
  lng: number | null;
}

function parseGeoJsonPoint(raw: unknown): ParsedCoordinates {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { lat: null, lng: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { lat: null, lng: null };
    }
    const obj = parsed as Record<string, unknown>;
    if (obj['type'] === 'FeatureCollection' && Array.isArray(obj['features'])) {
      const first: unknown = obj['features'][0];
      if (typeof first === 'object' && first !== null) {
        const geom = (first as Record<string, unknown>)['geometry'];
        if (typeof geom === 'object' && geom !== null) {
          const coords = (geom as Record<string, unknown>)['coordinates'];
          if (
            Array.isArray(coords) &&
            typeof coords[0] === 'number' &&
            typeof coords[1] === 'number'
          ) {
            return { lng: coords[0], lat: coords[1] };
          }
        }
      }
    }
  } catch {
    return { lat: null, lng: null };
  }
  return { lat: null, lng: null };
}

function formatGeoJsonPoint(lat: number | null, lng: number | null): string | null {
  if (lat === null && lng === null) {
    return null;
  }
  const safeLat = lat ?? 0;
  const safeLng = lng ?? 0;
  return JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [safeLng, safeLat],
        },
      },
    ],
  });
}

export interface GeolocationFieldProps {
  value: unknown;
  readOnly: boolean;
  locale: RecordLocale;
  a11y: FieldControlA11yProps;
  onChange: (nextValue: string | null) => void;
}

export function GeolocationField(props: GeolocationFieldProps) {
  const { value, readOnly, locale, a11y, onChange } = props;
  const { lat, lng } = parseGeoJsonPoint(value);
  const latId = `${a11y.controlId}-lat`;
  const lngId = `${a11y.controlId}-lng`;

  return (
    <div className="rv-signature-pad">
      <div className="rv-geo-grid">
        <div className="rv-field">
          <label htmlFor={latId} className="rv-field-help">
            {formatRecordMessage(locale, 'geolocationLatitude')}
          </label>
          <InputNumber
            id={latId}
            size="middle"
            style={{ width: '100%' }}
            min={-90}
            max={90}
            step={0.0001}
            disabled={readOnly}
            value={lat}
            onChange={(nextLat) =>
              onChange(formatGeoJsonPoint(typeof nextLat === 'number' ? nextLat : null, lng))
            }
          />
        </div>
        <div className="rv-field">
          <label htmlFor={lngId} className="rv-field-help">
            {formatRecordMessage(locale, 'geolocationLongitude')}
          </label>
          <InputNumber
            id={lngId}
            size="middle"
            style={{ width: '100%' }}
            min={-180}
            max={180}
            step={0.0001}
            disabled={readOnly}
            value={lng}
            onChange={(nextLng) =>
              onChange(formatGeoJsonPoint(lat, typeof nextLng === 'number' ? nextLng : null))
            }
          />
        </div>
      </div>
      {!readOnly && typeof navigator !== 'undefined' && 'geolocation' in navigator ? (
        <div>
          <Button
            size="small"
            icon={<Crosshair weight="regular" />}
            onClick={() => {
              navigator.geolocation.getCurrentPosition((pos) => {
                onChange(formatGeoJsonPoint(pos.coords.latitude, pos.coords.longitude));
              });
            }}
          >
            {formatRecordMessage(locale, 'geolocationUseCurrent')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export interface BarcodeFieldProps {
  value: string;
  readOnly: boolean;
  locale: RecordLocale;
  a11y: FieldControlA11yProps;
  onChange: (nextValue: string) => void;
}

export function BarcodeField(props: BarcodeFieldProps) {
  const { value, readOnly, locale, a11y, onChange } = props;
  const trimmed = value.trim();

  const barWidths: number[] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i);
    barWidths.push((code % 3) + 1, ((code >> 2) % 3) + 1);
  }

  let cursorX = 4;

  return (
    <div className="rv-signature-pad">
      <Input
        id={a11y.controlId}
        aria-labelledby={a11y.labelId}
        aria-describedby={a11y.ariaDescribedBy}
        aria-invalid={a11y.ariaInvalid}
        size="middle"
        readOnly={readOnly}
        prefix={<BarcodeIcon weight="regular" />}
        placeholder={formatRecordMessage(locale, 'barcodePlaceholder')}
        style={{ fontFamily: 'var(--rv-font-mono)' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {trimmed.length > 0 ? (
        <div className="rv-barcode-preview" aria-hidden="true">
          <svg
            width={Math.max(120, barWidths.length * 4 + 12)}
            height={36}
            viewBox={`0 0 ${Math.max(120, barWidths.length * 4 + 12)} 36`}
          >
            {barWidths.map((w, idx) => {
              const x = cursorX;
              cursorX += w + 2;
              return <rect key={idx} x={x} y={2} width={w} height={32} fill="currentColor" />;
            })}
          </svg>
        </div>
      ) : null}
    </div>
  );
}

export interface ColorFieldProps {
  value: string;
  readOnly: boolean;
  locale: RecordLocale;
  a11y: FieldControlA11yProps;
  onChange: (nextValue: string) => void;
}

export function ColorField(props: ColorFieldProps) {
  const { value, readOnly, locale, a11y, onChange } = props;
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#00aacc';

  return (
    <div className="rv-color-row">
      <ColorPicker
        disabled={readOnly}
        value={safeHex}
        onChange={(_color, cssHex) => onChange(cssHex)}
      />
      <Input
        id={a11y.controlId}
        aria-labelledby={a11y.labelId}
        aria-describedby={a11y.ariaDescribedBy}
        aria-invalid={a11y.ariaInvalid}
        size="middle"
        readOnly={readOnly}
        style={{ width: 140, fontFamily: 'var(--rv-font-mono)' }}
        placeholder={formatRecordMessage(locale, 'colorPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export interface RatingFieldProps {
  field: DocField;
  value: unknown;
  readOnly: boolean;
  a11y: FieldControlA11yProps;
  onChange: (nextValue: number) => void;
}

export function RatingField(props: RatingFieldProps) {
  const { field, value, readOnly, a11y, onChange } = props;
  const parsedCount = field.options ? Number.parseInt(field.options, 10) : 5;
  const starCount =
    Number.isInteger(parsedCount) && parsedCount >= 3 && parsedCount <= 10 ? parsedCount : 5;
  const numericVal = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const displayedStars = numericVal <= 1 ? numericVal * starCount : Math.min(starCount, numericVal);

  return (
    <div id={a11y.controlId} aria-labelledby={a11y.labelId}>
      <Rate
        allowHalf
        count={starCount}
        disabled={readOnly}
        value={displayedStars}
        onChange={(stars) => {
          const normalized = Math.round((stars / starCount) * 1000) / 1000;
          onChange(normalized);
        }}
      />
    </div>
  );
}

export interface ButtonFieldProps {
  field: DocField;
  disabled: boolean;
  onAction?: ((field: DocField) => void) | undefined;
}

export function ButtonField(props: ButtonFieldProps) {
  const { field, disabled, onAction } = props;
  return (
    <div>
      <Button
        size="middle"
        type="default"
        icon={<Lightning weight="regular" />}
        disabled={disabled}
        onClick={() => onAction?.(field)}
      >
        {field.label ?? field.fieldname}
      </Button>
    </div>
  );
}
