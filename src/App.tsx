import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  AtSign,
  BadgeCheck,
  Download,
  FileText,
  Link,
  Mail,
  Palette,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  UserRound,
  Wifi,
} from "lucide-react";

type QrKind = "url" | "text" | "email" | "phone" | "wifi" | "contact";
type CorrectionLevel = "L" | "M" | "Q" | "H";
type WifiEncryption = "WPA" | "WEP" | "nopass";

type FormState = {
  url: string;
  text: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  phone: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: WifiEncryption;
  wifiHidden: boolean;
  contactName: string;
  contactCompany: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
};

type StyleState = {
  foreground: string;
  background: string;
  size: number;
  correction: CorrectionLevel;
  logo: string;
  logoName: string;
};

const defaultForm: FormState = {
  url: "https://example.com",
  text: "Create, customize, and export a QR code.",
  email: "",
  emailSubject: "",
  emailBody: "",
  phone: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiEncryption: "WPA",
  wifiHidden: false,
  contactName: "",
  contactCompany: "",
  contactTitle: "",
  contactPhone: "",
  contactEmail: "",
  contactWebsite: "",
};

const defaultStyle: StyleState = {
  foreground: "#111827",
  background: "#ffffff",
  size: 320,
  correction: "M",
  logo: "",
  logoName: "",
};

const qrTypes: Array<{
  id: QrKind;
  label: string;
  icon: typeof Link;
}> = [
  { id: "url", label: "URL", icon: Link },
  { id: "text", label: "Text", icon: FileText },
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
  { id: "contact", label: "Contact", icon: UserRound },
];

const correctionOptions: Array<{ value: CorrectionLevel; label: string }> = [
  { value: "L", label: "Low" },
  { value: "M", label: "Medium" },
  { value: "Q", label: "Quartile" },
  { value: "H", label: "High" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s().-]{7,24}$/;

function escapeWifi(value: string) {
  return value.replace(/([\\;,":])/g, "\\$1");
}

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function validateUrl(value: string) {
  try {
    const url = new URL(normalizeUrl(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildQrPayload(kind: QrKind, form: FormState) {
  switch (kind) {
    case "url":
      return normalizeUrl(form.url);
    case "text":
      return form.text.trim();
    case "email": {
      const params = new URLSearchParams();
      if (form.emailSubject.trim()) {
        params.set("subject", form.emailSubject.trim());
      }
      if (form.emailBody.trim()) {
        params.set("body", form.emailBody.trim());
      }
      const query = params.toString();
      return `mailto:${form.email.trim()}${query ? `?${query}` : ""}`;
    }
    case "phone":
      return `tel:${form.phone.replace(/[^\d+]/g, "")}`;
    case "wifi":
      return `WIFI:T:${form.wifiEncryption};S:${escapeWifi(form.wifiSsid.trim())};P:${escapeWifi(
        form.wifiPassword,
      )};H:${form.wifiHidden ? "true" : "false"};;`;
    case "contact":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVCard(form.contactName.trim())}`,
        form.contactCompany.trim() ? `ORG:${escapeVCard(form.contactCompany.trim())}` : "",
        form.contactTitle.trim() ? `TITLE:${escapeVCard(form.contactTitle.trim())}` : "",
        form.contactPhone.trim() ? `TEL:${escapeVCard(form.contactPhone.trim())}` : "",
        form.contactEmail.trim() ? `EMAIL:${escapeVCard(form.contactEmail.trim())}` : "",
        form.contactWebsite.trim() ? `URL:${escapeVCard(normalizeUrl(form.contactWebsite))}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return "";
  }
}

function validateForm(kind: QrKind, form: FormState) {
  switch (kind) {
    case "url":
      if (!form.url.trim()) return "Enter a URL.";
      if (!validateUrl(form.url)) return "Enter a valid HTTP or HTTPS URL.";
      return "";
    case "text":
      if (!form.text.trim()) return "Enter text for the QR code.";
      return "";
    case "email":
      if (!form.email.trim()) return "Enter an email address.";
      if (!emailPattern.test(form.email.trim())) return "Enter a valid email address.";
      return "";
    case "phone":
      if (!form.phone.trim()) return "Enter a phone number.";
      if (!phonePattern.test(form.phone.trim())) return "Enter a valid phone number.";
      return "";
    case "wifi":
      if (!form.wifiSsid.trim()) return "Enter a Wi-Fi network name.";
      if (form.wifiEncryption !== "nopass" && !form.wifiPassword) return "Enter the Wi-Fi password.";
      return "";
    case "contact":
      if (!form.contactName.trim()) return "Enter a contact name.";
      if (form.contactEmail.trim() && !emailPattern.test(form.contactEmail.trim())) {
        return "Enter a valid contact email.";
      }
      if (form.contactPhone.trim() && !phonePattern.test(form.contactPhone.trim())) {
        return "Enter a valid contact phone number.";
      }
      if (form.contactWebsite.trim() && !validateUrl(form.contactWebsite)) {
        return "Enter a valid contact website.";
      }
      return "";
    default:
      return "";
  }
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function inputClass(hasError = false) {
  return `w-full rounded-lg border bg-white/90 px-3 py-2.5 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 ${
    hasError
      ? "border-rose-300 focus:border-rose-500"
      : "border-slate-200 focus:border-sky-500"
  }`;
}

function App() {
  const [kind, setKind] = useState<QrKind>("url");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [style, setStyle] = useState<StyleState>(defaultStyle);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [error, setError] = useState("");
  const [generationCount, setGenerationCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const payload = useMemo(() => buildQrPayload(kind, form), [kind, form]);
  const validationError = useMemo(() => validateForm(kind, form), [kind, form]);

  useEffect(() => {
    let isActive = true;

    async function generate() {
      if (validationError) {
        setError(validationError);
        setQrDataUrl("");
        setSvgMarkup("");
        return;
      }

      setIsGenerating(true);
      setError("");

      try {
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(payload, {
            errorCorrectionLevel: style.correction,
            margin: 2,
            width: style.size,
            color: {
              dark: style.foreground,
              light: style.background,
            },
          }),
          QRCode.toString(payload, {
            type: "svg",
            errorCorrectionLevel: style.correction,
            margin: 2,
            width: style.size,
            color: {
              dark: style.foreground,
              light: style.background,
            },
          }),
        ]);

        if (!isActive) return;
        setQrDataUrl(png);
        setSvgMarkup(svg);
      } catch {
        if (!isActive) return;
        setError("The QR code could not be generated. Try a shorter input or different settings.");
        setQrDataUrl("");
        setSvgMarkup("");
      } finally {
        if (isActive) {
          setIsGenerating(false);
        }
      }
    }

    const timer = window.setTimeout(generate, 160);
    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [payload, style.background, style.correction, style.foreground, style.size, validationError, generationCount]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateStyle = <K extends keyof StyleState>(key: K, value: StyleState[K]) => {
    setStyle((current) => ({ ...current, [key]: value }));
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Upload an image file for the logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateStyle("logo", String(reader.result));
      updateStyle("logoName", file.name);
      updateStyle("correction", "H");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGenerationCount((count) => count + 1);
  };

  const exportPng = async () => {
    if (!qrDataUrl) return;

    const canvas = document.createElement("canvas");
    canvas.width = style.size;
    canvas.height = style.size;
    const context = canvas.getContext("2d");
    if (!context) return;

    const qrImage = new Image();
    qrImage.src = qrDataUrl;
    await qrImage.decode();
    context.drawImage(qrImage, 0, 0, style.size, style.size);

    if (style.logo) {
      const logoImage = new Image();
      logoImage.src = style.logo;
      await logoImage.decode();
      const logoSize = Math.round(style.size * 0.2);
      const logoPadding = Math.round(style.size * 0.026);
      const logoX = (style.size - logoSize) / 2;
      const logoY = (style.size - logoSize) / 2;
      context.fillStyle = style.background;
      context.beginPath();
      context.roundRect(logoX - logoPadding, logoY - logoPadding, logoSize + logoPadding * 2, logoSize + logoPadding * 2, 14);
      context.fill();
      context.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "qr-forge-code.png";
    link.click();
  };

  const exportSvg = () => {
    if (!svgMarkup) return;

    let output = svgMarkup;
    if (style.logo) {
      const logoSize = style.size * 0.2;
      const padding = style.size * 0.026;
      const x = (style.size - logoSize) / 2;
      const y = (style.size - logoSize) / 2;
      const logoLayer = `
        <rect x="${x - padding}" y="${y - padding}" width="${logoSize + padding * 2}" height="${logoSize + padding * 2}" rx="14" fill="${style.background}" />
        <image href="${style.logo}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />
      `;
      output = output.replace("</svg>", `${logoLayer}</svg>`);
    }

    downloadFile(output, "qr-forge-code.svg", "image/svg+xml;charset=utf-8");
  };

  const currentType = qrTypes.find((type) => type.id === kind) ?? qrTypes[0];
  const TypeIcon = currentType.icon;
  const canExport = Boolean(qrDataUrl && !error);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/70 px-5 py-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-slate-900/20">
              <QrCode aria-hidden="true" size={26} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">QR Forge</p>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Browser QR code creator</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <ShieldCheck size={16} aria-hidden="true" />
              Client-side
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <BadgeCheck size={16} aria-hidden="true" />
              PNG and SVG
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <form
            onSubmit={handleGenerate}
            className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:p-5"
          >
            <section aria-labelledby="content-heading" className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="content-heading" className="text-lg font-bold text-slate-950">
                    Content
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">Choose a format and enter the details.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
                  <TypeIcon size={17} aria-hidden="true" />
                  {currentType.label}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="QR content type">
                {qrTypes.map((type) => {
                  const Icon = type.icon;
                  const isActive = type.id === kind;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setKind(type.id)}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/15"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {type.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                {kind === "url" && (
                  <Field label="URL" htmlFor="url" error={error && kind === "url" ? error : ""}>
                    <input
                      id="url"
                      className={inputClass(Boolean(error && kind === "url"))}
                      type="url"
                      inputMode="url"
                      value={form.url}
                      onChange={(event) => updateForm("url", event.target.value)}
                      placeholder="https://example.com"
                    />
                  </Field>
                )}

                {kind === "text" && (
                  <Field label="Plain text" htmlFor="text" error={error && kind === "text" ? error : ""}>
                    <textarea
                      id="text"
                      className={`${inputClass(Boolean(error && kind === "text"))} min-h-36 resize-y`}
                      value={form.text}
                      onChange={(event) => updateForm("text", event.target.value)}
                      placeholder="Enter text"
                    />
                  </Field>
                )}

                {kind === "email" && (
                  <div className="grid gap-4">
                    <Field label="Email address" htmlFor="email" error={error && kind === "email" ? error : ""}>
                      <div className="relative">
                        <AtSign className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} aria-hidden="true" />
                        <input
                          id="email"
                          className={`${inputClass(Boolean(error && kind === "email"))} pl-9`}
                          type="email"
                          value={form.email}
                          onChange={(event) => updateForm("email", event.target.value)}
                          placeholder="name@example.com"
                        />
                      </div>
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Subject" htmlFor="emailSubject">
                        <input
                          id="emailSubject"
                          className={inputClass()}
                          value={form.emailSubject}
                          onChange={(event) => updateForm("emailSubject", event.target.value)}
                          placeholder="Optional"
                        />
                      </Field>
                      <Field label="Message" htmlFor="emailBody">
                        <input
                          id="emailBody"
                          className={inputClass()}
                          value={form.emailBody}
                          onChange={(event) => updateForm("emailBody", event.target.value)}
                          placeholder="Optional"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {kind === "phone" && (
                  <Field label="Phone number" htmlFor="phone" error={error && kind === "phone" ? error : ""}>
                    <div className="relative">
                      <Smartphone className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} aria-hidden="true" />
                      <input
                        id="phone"
                        className={`${inputClass(Boolean(error && kind === "phone"))} pl-9`}
                        type="tel"
                        value={form.phone}
                        onChange={(event) => updateForm("phone", event.target.value)}
                        placeholder="+1 555 010 1000"
                      />
                    </div>
                  </Field>
                )}

                {kind === "wifi" && (
                  <div className="grid gap-4">
                    <Field label="Network name" htmlFor="wifiSsid" error={error && kind === "wifi" ? error : ""}>
                      <input
                        id="wifiSsid"
                        className={inputClass(Boolean(error && kind === "wifi"))}
                        value={form.wifiSsid}
                        onChange={(event) => updateForm("wifiSsid", event.target.value)}
                        placeholder="SSID"
                      />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Password" htmlFor="wifiPassword">
                        <input
                          id="wifiPassword"
                          className={inputClass()}
                          type="password"
                          value={form.wifiPassword}
                          onChange={(event) => updateForm("wifiPassword", event.target.value)}
                          placeholder={form.wifiEncryption === "nopass" ? "Not required" : "Required"}
                          disabled={form.wifiEncryption === "nopass"}
                        />
                      </Field>
                      <Field label="Security" htmlFor="wifiEncryption">
                        <select
                          id="wifiEncryption"
                          className={inputClass()}
                          value={form.wifiEncryption}
                          onChange={(event) => updateForm("wifiEncryption", event.target.value as WifiEncryption)}
                        >
                          <option value="WPA">WPA/WPA2</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">Open</option>
                        </select>
                      </Field>
                    </div>
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-slate-950"
                        checked={form.wifiHidden}
                        onChange={(event) => updateForm("wifiHidden", event.target.checked)}
                      />
                      Hidden network
                    </label>
                  </div>
                )}

                {kind === "contact" && (
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Full name" htmlFor="contactName" error={error && kind === "contact" ? error : ""}>
                        <input
                          id="contactName"
                          className={inputClass(Boolean(error && kind === "contact"))}
                          value={form.contactName}
                          onChange={(event) => updateForm("contactName", event.target.value)}
                          placeholder="Avery Brooks"
                        />
                      </Field>
                      <Field label="Company" htmlFor="contactCompany">
                        <input
                          id="contactCompany"
                          className={inputClass()}
                          value={form.contactCompany}
                          onChange={(event) => updateForm("contactCompany", event.target.value)}
                          placeholder="Company"
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Title" htmlFor="contactTitle">
                        <input
                          id="contactTitle"
                          className={inputClass()}
                          value={form.contactTitle}
                          onChange={(event) => updateForm("contactTitle", event.target.value)}
                          placeholder="Role"
                        />
                      </Field>
                      <Field label="Phone" htmlFor="contactPhone">
                        <input
                          id="contactPhone"
                          className={inputClass()}
                          type="tel"
                          value={form.contactPhone}
                          onChange={(event) => updateForm("contactPhone", event.target.value)}
                          placeholder="+1 555 010 1000"
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Email" htmlFor="contactEmail">
                        <input
                          id="contactEmail"
                          className={inputClass()}
                          type="email"
                          value={form.contactEmail}
                          onChange={(event) => updateForm("contactEmail", event.target.value)}
                          placeholder="name@example.com"
                        />
                      </Field>
                      <Field label="Website" htmlFor="contactWebsite">
                        <input
                          id="contactWebsite"
                          className={inputClass()}
                          inputMode="url"
                          value={form.contactWebsite}
                          onChange={(event) => updateForm("contactWebsite", event.target.value)}
                          placeholder="example.com"
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="style-heading" className="mt-5 space-y-5">
              <div className="flex items-center gap-2">
                <Palette size={20} aria-hidden="true" />
                <h2 id="style-heading" className="text-lg font-bold text-slate-950">
                  Style
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ColorField
                  label="Foreground"
                  value={style.foreground}
                  onChange={(value) => updateStyle("foreground", value)}
                />
                <ColorField
                  label="Background"
                  value={style.background}
                  onChange={(value) => updateStyle("background", value)}
                />
                <Field label="Size" htmlFor="size">
                  <div className="flex items-center gap-3">
                    <input
                      id="size"
                      className="w-full accent-slate-950"
                      type="range"
                      min="192"
                      max="768"
                      step="16"
                      value={style.size}
                      onChange={(event) => updateStyle("size", Number(event.target.value))}
                    />
                    <output className="min-w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-700">
                      {style.size}px
                    </output>
                  </div>
                </Field>
                <Field label="Error correction" htmlFor="correction">
                  <select
                    id="correction"
                    className={inputClass()}
                    value={style.correction}
                    onChange={(event) => updateStyle("correction", event.target.value as CorrectionLevel)}
                  >
                    {correctionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Logo</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {style.logoName || "Optional center image. High correction is selected automatically."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <Upload size={17} aria-hidden="true" />
                    Upload
                    <input className="sr-only" type="file" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                  {style.logo && (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={() => setStyle((current) => ({ ...current, logo: "", logoName: "" }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-h-6 text-sm font-medium text-rose-600" role="status" aria-live="polite">
                {error}
              </p>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isGenerating}
              >
                {generationCount === 0 ? <Sparkles size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
                {generationCount === 0 ? "Generate" : "Regenerate"}
              </button>
            </div>
          </form>

          <aside className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:p-5 lg:sticky lg:top-5 lg:self-start">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Preview</h2>
                <p className="mt-1 text-sm text-slate-600">Updates as the QR details change.</p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Live
              </span>
            </div>

            <div className="mt-5 grid min-h-[360px] place-items-center rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5">
              {qrDataUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
                  <img
                    src={qrDataUrl}
                    alt="Generated QR code preview"
                    className="h-auto w-full max-w-[300px]"
                    style={{ backgroundColor: style.background }}
                  />
                  {style.logo && (
                    <div
                      className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg p-1.5"
                      style={{ backgroundColor: style.background }}
                    >
                      <img src={style.logo} alt="" className="h-14 w-14 rounded-md object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid place-items-center gap-3 text-center text-slate-500">
                  <QrCode size={56} aria-hidden="true" />
                  <p className="max-w-56 text-sm font-medium">{error || "Enter valid details to create a QR code."}</p>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={exportPng}
                disabled={!canExport}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={18} aria-hidden="true" />
                PNG
              </button>
              <button
                type="button"
                onClick={exportSvg}
                disabled={!canExport}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={18} aria-hidden="true" />
                SVG
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  error = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="text-sm font-bold text-slate-800">
        {label}
      </label>
      {children}
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase();

  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
        <input
          id={id}
          aria-label={`${label} color`}
          type="color"
          className="h-10 w-11 cursor-pointer rounded-md border-0 bg-transparent p-0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="w-full border-0 bg-transparent px-1 text-sm font-semibold uppercase text-slate-700 focus:outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </Field>
  );
}

export default App;
