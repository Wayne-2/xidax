export type SupportChannelId = "phone" | "chat" | "email";

export type SupportChannel = {
  id: SupportChannelId;
  title: string;
  description: string;
  action: string;
  details: string[];
  accent: string;
};

export type SupportDay = {
  day: string;
  open: number | null;
  close: number | null;
  hours: string;
};

export const supportPhone = "+234-907649842";
export const supportPhoneHref = "tel:+234907649842";
export const supportEmail = "support@pcmart.com";
export const ownersEmail = "owners@pcmart.com";

export const supportChannels: SupportChannel[] = [
  {
    id: "phone",
    title: "Phone Support",
    description:
      "Talk to a technician about an order, a build, a repair, or a warranty claim.",
    action: "Call Now",
    details: [
      supportPhone,
      "Mon–Sat · 9:00 AM – 6:00 PM",
    ],
    accent: "#5865F2",
  },
  {
    id: "chat",
    title: "Live Chat",
    description:
      "Quick answers without leaving the page. Average reply time under three minutes.",
    action: "Start Chat",
    details: ["Under 3 min average reply", "Mon–Sun · 8:00 AM – 10:00 PM"],
    accent: "#10B981",
  },
  {
    id: "email",
    title: "Email Support",
    description:
      "Send the details once and keep the whole thread in your own records.",
    action: "Send Email",
    details: [supportEmail, "Reply within one business day"],
    accent: "#F59E0B",
  },
];

export const supportSchedule: SupportDay[] = [
  { day: "Monday", open: 9, close: 18, hours: "9:00 AM – 6:00 PM" },
  { day: "Tuesday", open: 9, close: 18, hours: "9:00 AM – 6:00 PM" },
  { day: "Wednesday", open: 9, close: 18, hours: "9:00 AM – 6:00 PM" },
  { day: "Thursday", open: 9, close: 18, hours: "9:00 AM – 6:00 PM" },
  { day: "Friday", open: 9, close: 18, hours: "9:00 AM – 6:00 PM" },
  { day: "Saturday", open: 10, close: 16, hours: "10:00 AM – 4:00 PM" },
  { day: "Sunday", open: null, close: null, hours: "Closed" },
];

export const supportStats = [
  { value: "< 3 min", label: "Average chat reply" },
  { value: "Lifetime", label: "Labor coverage" },
  { value: "24/7", label: "Order tracking" },
];
