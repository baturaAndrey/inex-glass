"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  DoorOpen,
  Droplets,
  Fence,
  Layers,
  PanelsTopLeft,
  ShowerHead,
  Square,
  Store,
  Umbrella,
} from "lucide-react";
import { Button } from "@/components/ig/button";
import { Chip } from "@/components/ig/chip";
import { ChipGroup, type ChipOption } from "@/components/ig/chip-group";
import { CONSENT_ERROR, ConsentCheckbox } from "@/components/ig/consent-checkbox";
import { DatePicker } from "@/components/ig/date-picker";
import { Field } from "@/components/ig/field";
import {
  FileUpload,
  FileUploadView,
  defaultUploadHint,
  formatErrorText,
  sizeErrorText,
  type FileMeta,
  type FileUploadStatus,
} from "@/components/ig/file-upload";
import { Input } from "@/components/ig/input";
import { PhoneInput } from "@/components/ig/phone-input";
import { RadioCardGroup, type RadioCardOption } from "@/components/ig/radio-card";
import { Section, SectionHead } from "@/components/ig/section";
import { Select } from "@/components/ig/select";
import { Textarea } from "@/components/ig/textarea";

const ACCEPT = ["dwg", "dxf", "pdf", "jpg", "jpeg", "png"] as const;
const MAX_BYTES = 52_428_800;
const SAMPLE_FILE: FileMeta = { name: "peregorodki_3etazh_v2.dwg", size: 4_404_019 };

const PRODUCT_TYPES: RadioCardOption[] = [
  { value: "tempered", title: "Закалённое стекло", icon: <Square /> },
  { value: "triplex", title: "Триплекс", icon: <Layers /> },
  { value: "partitions", title: "Перегородки", icon: <PanelsTopLeft /> },
  { value: "railings", title: "Ограждения", icon: <Fence /> },
  { value: "shower", title: "Душевые перегородки", icon: <ShowerHead /> },
  { value: "canopies", title: "Козырьки", icon: <Umbrella /> },
  { value: "facade", title: "Стеклянный фасад", icon: <Building2 /> },
  { value: "showcase", title: "Торговые витрины", icon: <Store /> },
  { value: "doors", title: "Двери", icon: <DoorOpen />, disabled: true },
];

/** Weight of tempered glass is 2.5 kg/m² per millimetre of thickness. */
const THICKNESSES: RadioCardOption[] = [4, 5, 6, 8, 10, 12, 15, 19].map((mm) => ({
  value: String(mm),
  title: `${mm} мм`,
  sub: `${String(mm * 2.5).replace(".", ",")} кг/м²`,
}));

const PROCESSING: ChipOption[] = [
  { value: "polish", label: "Шлифовка кромки" },
  { value: "holes", label: "Отверстия" },
  { value: "cutouts", label: "Вырезы" },
  { value: "print", label: "Печать", icon: <Droplets /> },
  { value: "matting", label: "Матирование", disabled: true },
];

const URGENCY: ChipOption[] = [
  { value: "week", label: "На этой неделе" },
  { value: "month", label: "В течение месяца" },
  { value: "later", label: "Позже" },
];

type UploadDemoState = "empty" | "drag" | "uploading" | "done" | "format" | "size" | "upload-error";

const UPLOAD_STATES: ChipOption[] = [
  { value: "empty", label: "Пусто" },
  { value: "drag", label: "Drag" },
  { value: "uploading", label: "Загрузка" },
  { value: "done", label: "Готово" },
  { value: "format", label: "Ошибка формата" },
  { value: "size", label: "Ошибка размера" },
  { value: "upload-error", label: "Ошибка загрузки" },
];

function uploadStatus(state: UploadDemoState): FileUploadStatus {
  switch (state) {
    case "drag":
      return { kind: "drag" };
    case "uploading":
      return { kind: "uploading", ...SAMPLE_FILE, progress: 0.62 };
    case "done":
      return { kind: "done", ...SAMPLE_FILE };
    case "format":
      return { kind: "error", message: formatErrorText(ACCEPT) };
    case "size":
      return { kind: "error", message: sizeErrorText(MAX_BYTES) };
    case "upload-error":
      return { kind: "error", message: "Не удалось загрузить файл. Попробуйте ещё раз" };
    default:
      return { kind: "empty" };
  }
}

function DemoBlock({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Section id={id} variant="sf" aria-labelledby={`${id}-h`} className="border-t border-hairline">
      <SectionHead title={title} headingId={`${id}-h`} />
      {children}
    </Section>
  );
}

function Caption({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="ig-small mb-3 text-text-2">
      {children}
    </p>
  );
}

/** Simulates an upload so the real `FileUpload` can be tried end to end. */
function useFakeUpload() {
  const [uploading, setUploading] = useState<(FileMeta & { progress: number }) | null>(null);
  const [value, setValue] = useState<FileMeta | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  function start(file: File) {
    const meta = { name: file.name, size: file.size };
    let progress = 0;
    setValue(null);
    setUploading({ ...meta, progress });
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      progress += 0.2;
      if (progress < 1) {
        setUploading({ ...meta, progress });
        return;
      }
      if (timer.current) clearInterval(timer.current);
      setUploading(null);
      setValue(meta);
    }, 300);
  }

  return { uploading, value, start, clear: () => setValue(null) };
}

export function FormsDemo() {
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [date, setDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentWithError, setConsentWithError] = useState(false);
  const [urgency, setUrgency] = useState<string | null>("month");
  const [processing, setProcessing] = useState<string[]>(["holes"]);
  const [filters, setFilters] = useState(["10 мм", "Перегородки"]);
  const [productType, setProductType] = useState<string | null>("partitions");
  const [thickness, setThickness] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<string | null>("empty");
  const upload = useFakeUpload();

  const phoneError =
    phoneTouched && phone !== "" && !e164 ? "Проверьте номер: в нём должно быть 10 цифр" : null;

  return (
    <>
      <Section variant="bg" className="pb-0 max-md:pb-0 max-sm:pb-0">
        <h1 className="ig-h2">UI kit: формы</h1>
        <p className="ig-small mt-3 text-text-2">
          Field, Input, Textarea, Select, PhoneInput, DatePicker, ConsentCheckbox, Chip,
          ChipGroup, RadioCardGroup, FileUpload. Страница недоступна в production.
        </p>
      </Section>

      <DemoBlock id="fields" title="Поля">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Компания" required>
            <Input
              placeholder="ООО «Название»"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </Field>
          <Field label="ИНН" optional>
            <Input inputMode="numeric" placeholder="10 или 12 цифр" />
          </Field>
          <Field label="Площадь, м²" hint="Работаем с заказами от 50 м²">
            <Input inputMode="decimal" defaultValue="86" />
          </Field>
          <Field label="Hover (принудительно)">
            <Input defaultValue="Наведение" className="border-gray-2" />
          </Field>
          <Field label="Focus (принудительно)">
            <Input defaultValue="7451234567" className="is-focus" />
          </Field>
          <Field label="Телефон" required error="Проверьте номер: в нём должно быть 10 цифр">
            <Input defaultValue="+7 (351) 247-05" />
          </Field>
          <Field label="E-mail">
            <Input type="email" placeholder="disabled" disabled />
          </Field>
          <Field label="Город доставки" required>
            <Select
              placeholder="Выберите город"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="chelyabinsk">Челябинск</option>
              <option value="ekaterinburg">Екатеринбург</option>
              <option value="tyumen">Тюмень</option>
            </Select>
          </Field>
          <Field label="Select с ошибкой" error="Выберите город доставки">
            <Select placeholder="Выберите город">
              <option value="chelyabinsk">Челябинск</option>
            </Select>
          </Field>
          <Field label="Select disabled">
            <Select defaultValue="chelyabinsk" disabled>
              <option value="chelyabinsk">Челябинск</option>
            </Select>
          </Field>
          <Field label="Комментарий" optional className="sm:col-span-2">
            <Textarea placeholder="Например: нужны отверстия под фурнитуру Dorma, срок до 20.12" />
          </Field>
          <Field label="Textarea с ошибкой" error="Опишите задачу хотя бы в двух словах">
            <Textarea />
          </Field>
          <Field label="Textarea disabled">
            <Textarea disabled placeholder="disabled" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Caption>Input вне Field (поиск в шапке)</Caption>
            <Input
              type="search"
              aria-label="Поиск по сайту"
              placeholder="Поиск"
              className="rounded-full pl-11"
            />
          </div>
        </div>
      </DemoBlock>

      <DemoBlock id="phone-date" title="Телефон и дата">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Телефон"
            required
            hint={`E.164: ${e164 ?? "—"}`}
            error={phoneError}
          >
            <PhoneInput
              value={phone}
              onChange={(masked, normalized) => {
                setPhone(masked);
                setE164(normalized);
              }}
              onBlur={() => setPhoneTouched(true)}
            />
          </Field>
          <Field
            label="К какой дате нужно стекло?"
            hint={`ISO: ${date || "—"}`}
            error={dateError}
          >
            <DatePicker
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(iso) => {
                setDate(iso);
                setDateError(null);
              }}
              onInvalid={setDateError}
            />
          </Field>
          <div className="flex items-end gap-3">
            <Button variant="secondary" size="m" onClick={() => setDate("2026-12-25")}>
              Задать 25.12.2026
            </Button>
            <Button variant="ghost" size="m" onClick={() => setDate("")}>
              Сбросить
            </Button>
          </div>
        </div>
      </DemoBlock>

      <DemoBlock id="consent" title="Согласие на обработку ПДн">
        <div className="grid max-w-[720px] grid-cols-1 gap-6">
          <ConsentCheckbox checked={consent} onCheckedChange={setConsent} name="consent" />
          <ConsentCheckbox
            checked={consentWithError}
            onCheckedChange={setConsentWithError}
            error={consentWithError ? null : CONSENT_ERROR}
          />
          <ConsentCheckbox checked={false} onCheckedChange={() => undefined} error />
        </div>
      </DemoBlock>

      <DemoBlock id="chips" title="Чипсы">
        <div className="flex flex-col gap-8">
          <div>
            <Caption id="urgency-label">ChipGroup single, allowClear (стрелки ←/→)</Caption>
            <ChipGroup
              mode="single"
              aria-labelledby="urgency-label"
              options={URGENCY}
              value={urgency}
              onChange={setUrgency}
              allowClear
            />
          </div>
          <div>
            <Caption id="processing-label">ChipGroup multiple</Caption>
            <ChipGroup
              mode="multiple"
              aria-labelledby="processing-label"
              options={PROCESSING}
              value={processing}
              onChange={setProcessing}
            />
          </div>
          <div>
            <Caption>Chip-ссылки и статичные теги с удалением</Caption>
            <div className="ig-chips">
              <Chip href="/ui-kit/forms/" active>
                Все
              </Chip>
              <Chip href="/ui-kit/forms/#chips">Перегородки</Chip>
              {filters.map((filter) => (
                <Chip
                  key={filter}
                  static
                  onRemove={() => setFilters((items) => items.filter((item) => item !== filter))}
                >
                  {filter}
                </Chip>
              ))}
              <Chip static>ГОСТ 30698-2014</Chip>
            </div>
          </div>
        </div>
      </DemoBlock>

      <DemoBlock id="radio-cards" title="Радио-карточки">
        <div className="flex flex-col gap-10">
          <div>
            <Caption id="type-label">Тип изделия (columns 4, иконки Lucide)</Caption>
            <RadioCardGroup
              aria-labelledby="type-label"
              options={PRODUCT_TYPES}
              value={productType}
              onChange={setProductType}
              columns={4}
            />
          </div>
          <div>
            <Caption id="thick-label">Толщина (2 колонки на телефоне)</Caption>
            <RadioCardGroup
              aria-labelledby="thick-label"
              options={THICKNESSES}
              value={thickness}
              onChange={setThickness}
              columns={4}
              mobileColumns={2}
            />
          </div>
        </div>
      </DemoBlock>

      <DemoBlock id="upload" title="Загрузка файла">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <Caption id="upload-state-label">Все состояния (FileUploadView)</Caption>
            <ChipGroup
              mode="single"
              aria-labelledby="upload-state-label"
              options={UPLOAD_STATES}
              value={uploadState}
              onChange={setUploadState}
              className="mb-4"
            />
            <FileUploadView
              status={uploadStatus((uploadState ?? "empty") as UploadDemoState)}
              hint={defaultUploadHint(ACCEPT, MAX_BYTES)}
              onBrowse={() => undefined}
              onClear={() => setUploadState("empty")}
            />
          </div>
          <div>
            <Caption>Рабочий компонент (имитация загрузки)</Caption>
            <FileUpload
              accept={ACCEPT}
              maxBytes={MAX_BYTES}
              value={upload.value}
              uploading={upload.uploading}
              onSelect={upload.start}
              onClear={upload.clear}
            />
          </div>
        </div>
      </DemoBlock>
    </>
  );
}
