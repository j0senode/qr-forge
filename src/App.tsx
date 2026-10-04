import { ChangeEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  AtSign,
  BadgeCheck,
  CalendarDays,
  Download,
  FileText,
  Link,
  Mail,
  MessageCircle,
  Palette,
  Phone,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Upload,
  UserRound,
  Wifi,
} from "lucide-react";

type QrKind = "url" | "text" | "email" | "phone" | "wifi" | "contact" | "whatsapp" | "sms" | "calendar";
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
  whatsappPhone: string;
  whatsappMessage: string;
  smsPhone: string;
  smsMessage: string;
  calendarTitle: string;
  calendarLocation: string;
  calendarStart: string;
  calendarEnd: string;
  calendarDescription: string;
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
  whatsappPhone: "",
  whatsappMessage: "",
  smsPhone: "",
  smsMessage: "",
  calendarTitle: "",
  calendarLocation: "",
  calendarStart: "",
  calendarEnd: "",
  calendarDescription: "",
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
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "calendar", label: "Event", icon: CalendarDays },
];

const correctionOptions: Array<{ value: CorrectionLevel; label: string }> = [
  { value: "L", label: "Low" },
  { value: "M", label: "Medium" },
  { value: "Q", label: "Quartile" },
  { value: "H", label: "High" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s().-]{7,24}$/;
const hexPattern = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i;
const maxLogoBytes = 2 * 1024 * 1024;
const brandImage = "/qr-code.svg";

function escapeWifi(value: string) {
  return value.replace(/([\\;,":])/g, "\\$1");
}

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function escapeCalendar(value: string) {
  return escapeVCard(value).replace(/:/g, "\\:");
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

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function telValue(value: string) {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return `${prefix}${digitsOnly(trimmed)}`;
}

function formatCalendarDate(value: string) {
  if (!value) return "";
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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
      return `tel:${telValue(form.phone)}`;
    case "wifi": {
      const password = form.wifiEncryption === "nopass" ? "" : `P:${escapeWifi(form.wifiPassword)};`;
      return `WIFI:T:${form.wifiEncryption};S:${escapeWifi(form.wifiSsid)};${password}H:${form.wifiHidden ? "true" : "false"};;`;
    }
    case "contact":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVCard(form.contactName.trim())}`,
        form.contactCompany.trim() ? `ORG:${escapeVCard(form.contactCompany.trim())}` : "",
        form.contactTitle.trim() ? `TITLE:${escapeVCard(form.contactTitle.trim())}` : "",
        form.contactPhone.trim() ? `TEL:${escapeVCard(telValue(form.contactPhone))}` : "",
        form.contactEmail.trim() ? `EMAIL:${escapeVCard(form.contactEmail.trim())}` : "",
        form.contactWebsite.trim() ? `URL:${escapeVCard(normalizeUrl(form.contactWebsite))}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    case "whatsapp": {
      const message = form.whatsappMessage.trim();
      return `https://wa.me/${digitsOnly(form.whatsappPhone)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    }
    case "sms": {
      const message = form.smsMessage.trim();
      return `sms:${telValue(form.smsPhone)}${message ? `?&body=${encodeURIComponent(message)}` : ""}`;
    }
    case "calendar": {
      const start = formatCalendarDate(form.calendarStart);
      const end = formatCalendarDate(form.calendarEnd);
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//QR Forge//QR Event//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${escapeCalendar(form.calendarTitle.trim())}`,
        start ? `DTSTART:${start}` : "",
        end ? `DTEND:${end}` : "",
        form.calendarLocation.trim() ? `LOCATION:${escapeCalendar(form.calendarLocation.trim())}` : "",
        form.calendarDescription.trim() ? `DESCRIPTION:${escapeCalendar(form.calendarDescription.trim())}` : "",
        "END:VEVENT",
        "END:VCALENDAR",
      ]
        .filter(Boolean)
        .join("\n");
    }
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
    case "whatsapp":
      if (!form.whatsappPhone.trim()) return "Enter a WhatsApp phone number.";
      if (digitsOnly(form.whatsappPhone).length < 7) return "Enter a valid WhatsApp phone number.";
      return "";
    case "sms":
      if (!form.smsPhone.trim()) return "Enter an SMS phone number.";
      if (!phonePattern.test(form.smsPhone.trim())) return "Enter a valid SMS phone number.";
      return "";
    case "calendar":
      if (!form.calendarTitle.trim()) return "Enter an event title.";
      if (!form.calendarStart) return "Choose a start date and time.";
      if (!form.calendarEnd) return "Choose an end date and time.";
      if (Number.isNaN(new Date(form.calendarStart).getTime()) || Number.isNaN(new Date(form.calendarEnd).getTime())) {
        return "Choose valid event dates.";
      }
      if (new Date(form.calendarEnd) <= new Date(form.calendarStart)) return "The event end must be after the start.";
      return "";
    default:
      return "";
  }
}

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!hexPattern.test(trimmed)) return "";
  const raw = trimmed.replace("#", "");
  const expanded = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  return `#${expanded.toLowerCase()}`;
}

function luminance(value: string) {
  const hex = normalizeHex(value).slice(1);
  const channels = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function sanitizeFileName(value: string) {
  const clean = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "qr-code";
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
  const route = window.location.pathname.replace(/\/$/, "") || "/";
  const initialKind: QrKind =
    route === "/wifi-qr-code-generator"
      ? "wifi"
      : route === "/vcard-qr-code-generator"
        ? "contact"
        : route === "/email-qr-code-generator"
          ? "email"
          : "url";
  const isRestaurantPage = route === "/qr-code-for-restaurant-menu";
  const [kind, setKind] = useState<QrKind>(initialKind);
  const [form, setForm] = useState<FormState>({ ...defaultForm, url: isRestaurantPage ? "https://example.com/menu" : defaultForm.url });
  const [style, setStyle] = useState<StyleState>(defaultStyle);
  const [fileName, setFileName] = useState("qr-code");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const payload = useMemo(() => buildQrPayload(kind, form), [kind, form]);
  const validationError = useMemo(() => validateForm(kind, form), [kind, form]);
  const lowContrast = useMemo(() => contrastRatio(style.foreground, style.background) < 3, [style.foreground, style.background]);
  const invertedColors = useMemo(() => luminance(style.foreground) > luminance(style.background), [style.foreground, style.background]);

  const pageCopy = useMemo(() => {
    if (route === "/wifi-qr-code-generator") {
      return {
        title: "Free Wi-Fi QR Code Generator | QR Forge",
        description: "Create a Wi-Fi QR code so guests can join your network without typing a password. Free, no sign-up, browser-based.",
        h1: "Wi-Fi QR Code Generator",
        subtitle: "Let guests join your network by scanning. No typing, no spelling out passwords.",
      };
    }
    if (route === "/vcard-qr-code-generator") {
      return {
        title: "Free vCard QR Code Generator | QR Forge",
        description: "Create a contact QR code for a phone, email, company, and website. Download a free PNG or SVG vCard QR code.",
        h1: "vCard QR Code Generator",
        subtitle: "Create a scannable contact card people can save straight to their phone.",
      };
    }
    if (route === "/qr-code-for-restaurant-menu") {
      return {
        title: "QR Code for Restaurant Menu | QR Forge",
        description: "Create a free restaurant menu QR code from any menu link. Customize colors, add a logo, and download PNG or SVG.",
        h1: "QR Code for Restaurant Menu",
        subtitle: "Turn your online menu into a scannable QR code for tables, signs, flyers, and receipts.",
      };
    }
    if (route === "/email-qr-code-generator") {
      return {
        title: "Free Email QR Code Generator | QR Forge",
        description: "Create an email QR code with a recipient, subject, and message. Free, browser-based, with PNG and SVG downloads.",
        h1: "Email QR Code Generator",
        subtitle: "Let people scan to start a pre-addressed email with an optional subject and message.",
      };
    }
    return {
      title: "Free QR Code Generator: PNG & SVG | QR Forge",
      description:
        "Make a free QR code for links, Wi-Fi, contacts, email, phone, text, WhatsApp, SMS, or events. Add a logo and download PNG or SVG.",
      h1: "Free QR Code Generator",
      subtitle: "Create a QR code for a link, Wi-Fi, contact, email, phone, or text. No sign-up, no watermark.",
    };
  }, [route]);

  useEffect(() => {
    document.title = pageCopy.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = pageCopy.description;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = window.location.href;
    if (!canonical.parentElement) document.head.appendChild(canonical);
    document.getElementById("faq-schema")?.remove();
    const schema = document.createElement("script");
    schema.id = "faq-schema";
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is this QR code generator free?",
          acceptedAnswer: { "@type": "Answer", text: "Yes. It is free to use, with no watermark and no sign-up required." },
        },
        {
          "@type": "Question",
          name: "Do the QR codes expire?",
          acceptedAnswer: { "@type": "Answer", text: "No. These are static QR codes, so they keep working as long as the destination remains valid." },
        },
        {
          "@type": "Question",
          name: "Is my data sent to a server?",
          acceptedAnswer: { "@type": "Answer", text: "No. The code is generated in your browser and this app has no backend." },
        },
        {
          "@type": "Question",
          name: "What is the difference between PNG and SVG?",
          acceptedAnswer: { "@type": "Answer", text: "PNG is a pixel image for screens. SVG is a vector file that stays sharp at any size." },
        },
      ],
    });
    document.head.appendChild(schema);
  }, [pageCopy]);

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
            margin: 4,
            width: style.size,
            color: {
              dark: style.foreground,
              light: style.background,
            },
          }),
          QRCode.toString(payload, {
            type: "svg",
            errorCorrectionLevel: style.correction,
            margin: 4,
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
  }, [payload, style.background, style.correction, style.foreground, style.size, validationError]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateStyle = <K extends keyof StyleState>(key: K, value: StyleState[K]) => {
    setStyle((current) => ({ ...current, [key]: value }));
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLogoError("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Upload a PNG, JPG, WebP, or SVG image.");
      return;
    }

    if (file.size > maxLogoBytes) {
      setLogoError("Logo files must be 2 MB or smaller.");
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

  const resetTool = () => {
    setKind(initialKind);
    setForm({ ...defaultForm, url: isRestaurantPage ? "https://example.com/menu" : defaultForm.url });
    setStyle(defaultStyle);
    setFileName("qr-code");
    setLogoError("");
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
    link.download = `${sanitizeFileName(fileName)}.png`;
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

    downloadFile(output, `${sanitizeFileName(fileName)}.svg`, "image/svg+xml;charset=utf-8");
  };

  const currentType = qrTypes.find((type) => type.id === kind) ?? qrTypes[0];
  const TypeIcon = currentType.icon;
  const canExport = Boolean(qrDataUrl && !error);

  return (
    <main className="min-h-screen px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
        <header className="relative overflow-hidden rounded-xl border border-white/70 bg-white/75 px-4 py-4 shadow-soft backdrop-blur sm:px-5">
          <img
            src={brandImage}
            alt=""
            className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-64 object-cover opacity-10 sm:block"
          />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Reload QR Forge"
                onClick={() => window.location.reload()}
                className="block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/20"
              >
                <img src={brandImage} alt="QR Forge logo" className="h-14 w-14 object-contain p-1 sm:h-16 sm:w-16" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">QR Forge</p>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-4xl">{pageCopy.h1}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{pageCopy.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <ShieldCheck size={16} aria-hidden="true" />
              Runs in your browser
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <BadgeCheck size={16} aria-hidden="true" />
              PNG & SVG download
            </span>
          </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-5">
          <section className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-soft backdrop-blur sm:p-5">
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

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-9" role="tablist" aria-label="QR content type">
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

                {(kind === "whatsapp" || kind === "sms") && (
                  <div className="grid gap-4">
                    <Field
                      label={kind === "whatsapp" ? "WhatsApp phone number" : "SMS phone number"}
                      htmlFor={`${kind}Phone`}
                      error={error && (kind === "whatsapp" || kind === "sms") ? error : ""}
                    >
                      <input
                        id={`${kind}Phone`}
                        className={inputClass(Boolean(error && (kind === "whatsapp" || kind === "sms")))}
                        type="tel"
                        value={kind === "whatsapp" ? form.whatsappPhone : form.smsPhone}
                        onChange={(event) => updateForm(kind === "whatsapp" ? "whatsappPhone" : "smsPhone", event.target.value)}
                        placeholder="+1 555 010 1000"
                      />
                    </Field>
                    <Field label="Message" htmlFor={`${kind}Message`}>
                      <textarea
                        id={`${kind}Message`}
                        className={`${inputClass()} min-h-28 resize-y`}
                        value={kind === "whatsapp" ? form.whatsappMessage : form.smsMessage}
                        onChange={(event) => updateForm(kind === "whatsapp" ? "whatsappMessage" : "smsMessage", event.target.value)}
                        placeholder="Optional"
                      />
                    </Field>
                  </div>
                )}

                {kind === "calendar" && (
                  <div className="grid gap-4">
                    <Field label="Event title" htmlFor="calendarTitle" error={error && kind === "calendar" ? error : ""}>
                      <input
                        id="calendarTitle"
                        className={inputClass(Boolean(error && kind === "calendar"))}
                        value={form.calendarTitle}
                        onChange={(event) => updateForm("calendarTitle", event.target.value)}
                        placeholder="Launch event"
                      />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Start" htmlFor="calendarStart">
                        <input
                          id="calendarStart"
                          className={inputClass()}
                          type="datetime-local"
                          value={form.calendarStart}
                          onChange={(event) => updateForm("calendarStart", event.target.value)}
                        />
                      </Field>
                      <Field label="End" htmlFor="calendarEnd">
                        <input
                          id="calendarEnd"
                          className={inputClass()}
                          type="datetime-local"
                          value={form.calendarEnd}
                          onChange={(event) => updateForm("calendarEnd", event.target.value)}
                        />
                      </Field>
                    </div>
                    <Field label="Location" htmlFor="calendarLocation">
                      <input
                        id="calendarLocation"
                        className={inputClass()}
                        value={form.calendarLocation}
                        onChange={(event) => updateForm("calendarLocation", event.target.value)}
                        placeholder="Optional"
                      />
                    </Field>
                    <Field label="Description" htmlFor="calendarDescription">
                      <textarea
                        id="calendarDescription"
                        className={`${inputClass()} min-h-28 resize-y`}
                        value={form.calendarDescription}
                        onChange={(event) => updateForm("calendarDescription", event.target.value)}
                        placeholder="Optional"
                      />
                    </Field>
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

              <div className="grid gap-2" aria-live="polite">
                {lowContrast && (
                  <p className="inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                    Low contrast. This code may not scan.
                  </p>
                )}
                {invertedColors && (
                  <p className="inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                    Light foreground on a darker background can fail in many scanner apps.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Logo</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {style.logoName || "Optional center image. High correction is selected automatically."}
                  </p>
                  {logoError && <p className="mt-2 text-sm font-semibold text-rose-600">{logoError}</p>}
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

              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <Field label="Download file name" htmlFor="fileName">
                  <input
                    id="fileName"
                    className={inputClass()}
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                    placeholder="qr-code"
                  />
                </Field>
                <button
                  type="button"
                  onClick={resetTool}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <RotateCcw size={17} aria-hidden="true" />
                  Reset
                </button>
              </div>
            </section>

            <p className="mt-5 min-h-6 border-t border-slate-200 pt-5 text-sm font-semibold text-rose-600" role="status" aria-live="polite">
              {error || (isGenerating ? "Updating preview..." : "")}
            </p>
          </section>

          <aside className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-soft backdrop-blur sm:p-5 lg:sticky lg:top-5 lg:self-start">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Preview</h2>
                <p className="mt-1 text-sm text-slate-600">Updates as the QR details change.</p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Live
              </span>
            </div>

            <div className="mt-4 grid min-h-[260px] place-items-center rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-3 sm:mt-5 sm:min-h-[360px] sm:p-5">
              {qrDataUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
                  <img
                    src={qrDataUrl}
                    alt="Generated QR code preview"
                    className="h-auto w-full max-w-[230px] sm:max-w-[300px]"
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
        <PageContent page={pageCopy.h1} />
        <footer className="flex flex-col gap-2 rounded-xl border border-white/70 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p>QR Forge creates static QR codes in your browser.</p>
          <nav className="flex flex-wrap gap-3" aria-label="Footer">
            <a className="font-semibold text-slate-700 hover:text-slate-950" href="/">Home</a>
            <a className="font-semibold text-slate-700 hover:text-slate-950" href="/wifi-qr-code-generator">Wi-Fi</a>
            <a className="font-semibold text-slate-700 hover:text-slate-950" href="/vcard-qr-code-generator">vCard</a>
            <a className="font-semibold text-slate-700 hover:text-slate-950" href="/email-qr-code-generator">Email</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function PageContent({ page }: { page: string }) {
  if (page === "Wi-Fi QR Code Generator") {
    return (
      <ContentShell>
        <Article title="How to Make a Wi-Fi QR Code">
          Enter your network name exactly as it appears, including capitals and spaces. Add the password, choose the security type, and turn on Hidden network only if your network name is not broadcast. Download the finished code as PNG or SVG, then print it, frame it, or place it in a welcome guide.
        </Article>
        <Article title="How Guests Scan It">
          Most current iPhones and Android phones can read a Wi-Fi QR code with the built-in camera app. Guests point the camera at the code, tap the network prompt, and the phone joins without typing the password. Older devices may need a scanner app, so test the printed code before placing it in a rental, cafe, office, or event space.
        </Article>
        <Article title="Security: Read This Before You Print">
          Anyone who scans the code gets your password, so use a separate guest network when possible. If you change your Wi-Fi password, create and print a new code because the old code stores the old password. Do not post the code publicly unless the network is meant to be public.
        </Article>
        <Faq wifi />
      </ContentShell>
    );
  }

  if (page !== "Free QR Code Generator") {
    return (
      <ContentShell>
        <Article title={`How to Use This ${page}`}>
          Enter the details, watch the live preview update, then customize the QR code with brand colors, a logo, and the right size for your use case. Download PNG for screens and documents, or SVG for print and design work. Keep contrast high, leave the quiet zone intact, and scan the code with a phone before publishing or printing it.
        </Article>
        <Article title="Best Uses">
          This page preloads the right QR type but keeps every design control from the main generator. You can still switch formats, reset the tool, or return to the <a className="font-semibold text-teal-700" href="/">free QR code generator</a> for all available QR types.
        </Article>
        <Faq />
      </ContentShell>
    );
  }

  return (
    <ContentShell>
      <Article title="How to Make a QR Code in 4 Steps">
        Choose a type, enter your details, customize the design, and download the finished QR code. The preview updates while you type, so you can quickly test a website link, Wi-Fi network, contact card, email, phone number, SMS, WhatsApp message, calendar event, or plain text. Use PNG for websites, social posts, and documents. Use SVG for print, signs, packaging, and design tools because it stays sharp at any size.
      </Article>
      <Article title="What Can You Put in a QR Code?">
        QR codes can open website links, share <a className="font-semibold text-teal-700" href="/wifi-qr-code-generator">Wi-Fi details</a>, save contact cards, start calls, draft emails, open WhatsApp, prepare SMS messages, add calendar events, or display short text. For restaurants, a menu QR code turns a live menu URL into something diners can scan from a table tent, window sign, or receipt.
      </Article>
      <Article title="Why Use This Generator">
        This generator is free, has no watermark, and runs in your browser. Your links, passwords, contact details, and messages are processed on your device by the QR library in this app. You can choose colors, set the image size, add a small logo, and pick an error correction level. High correction is best when adding a logo or printing codes that may get smudged or folded.
      </Article>
      <Article title="Tips for a QR Code That Scans Every Time">
        Use a dark foreground on a light background, keep the blank border around the code, and test before printing. Print at least 2 x 2 cm for close-range scans and larger for posters or signs. If you add a logo, keep it small and use High error correction. Shorter links create simpler QR codes that scan faster, especially on older phones and in low light.
      </Article>
      <Faq />
    </ContentShell>
  );
}

function ContentShell({ children }: { children: React.ReactNode }) {
  return <section className="grid gap-5 rounded-xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">{children}</section>;
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="max-w-4xl">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">{children}</div>
    </article>
  );
}

function Faq({ wifi = false }: { wifi?: boolean }) {
  const items = wifi
    ? [
        ["What security type should I choose?", "Choose the one your router uses. WPA/WPA2 is the most common. Open networks need no password, and WEP is outdated."],
        ["Does the QR code stop working if I change my password?", "Yes. The password is stored inside the code, so you need to create a new one after changing it."],
        ["Will it work on iPhone and Android?", "Yes on current versions of both using the camera. Older phones may need a scanner app."],
        ["Is my Wi-Fi password sent anywhere?", "No. The code is generated in your browser and this app has no backend."],
      ]
    : [
        ["Is this QR code generator free?", "Yes. It is free to use, with no watermark and no sign-up required."],
        ["Do the QR codes expire?", "No. These are static QR codes, so they keep working as long as the destination or embedded information remains valid."],
        ["Is my data sent to a server?", "No. The code is generated in your browser and this app has no backend."],
        ["What is the difference between PNG and SVG?", "PNG is a pixel image for screens and documents. SVG is a vector file that stays sharp at any size, making it better for print."],
        ["What does error correction mean?", "Error correction helps a QR code scan if part of it is damaged, dirty, or covered by a small logo. Higher levels make denser codes."],
        ["Why won't my QR code scan?", "Common causes are low contrast, no blank border, printing too small, or a logo covering too much of the center."],
      ];

  return (
    <Article title={wifi ? "Wi-Fi QR Code FAQ" : "QR Code FAQ"}>
      <div className="grid gap-4">
        {items.map(([question, answer]) => (
          <div key={question}>
            <h3 className="text-base font-bold text-slate-950">{question}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{answer}</p>
          </div>
        ))}
      </div>
    </Article>
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
