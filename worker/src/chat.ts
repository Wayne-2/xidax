import type { Env } from "./types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

type Intent = {
  name: string;
  keywords: string[];
  answer: string;
  suggestions: string[];
};

const SUPPORT_EMAIL = "hello@genericpcs.com";
const SUPPORT_PHONE = "+1-202-555-0147";

const INTENTS: Intent[] = [
  {
    name: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
    answer: "Hi! I'm the Generic PCs assistant. I can help with orders, shipping, returns, warranty, product specs and payment questions. What would you like to know?",
    suggestions: ["Shipping options", "Track my order", "Return policy", "Talk to a human"],
  },
  {
    name: "shipping",
    keywords: ["shipping", "delivery", "ship", "how long", "arrive", "free shipping", "freight", "dispatch"],
    answer: `We offer free shipping on orders over $99. Orders below $99 have a flat $19 shipping fee. Prebuilds are typically built and shipped in 1–3 business days. You'll get tracking details once your order is on its way.`,
    suggestions: ["Track my order", "Return policy", "Payment methods"],
  },
  {
    name: "order_tracking",
    keywords: ["track", "order status", "where is my order", "my order", "tracking number", "order number"],
    answer: "You can see all your orders and their current status in your profile under My Orders. If you checked out while signed in, your order is linked to your account automatically. Need help finding it? Sign in and open your profile.",
    suggestions: ["Shipping options", "Talk to a human", "Return policy"],
  },
  {
    name: "returns",
    keywords: ["return", "refund", "exchange", "cancel", "money back", "warranty claim"],
    answer: `If something isn't right, email ${SUPPORT_EMAIL} with your order number and a short description. Our team will guide you through the return or exchange process. We also include a 3-year warranty and lifetime labour coverage on machines.`,
    suggestions: ["Warranty", "Talk to a human", "Payment methods"],
  },
  {
    name: "warranty",
    keywords: ["warranty", "guarantee", "labour", "coverage", "repair", "support period"],
    answer: "Every machine includes a 3-year warranty and lifetime labour coverage. For warranty support, contact us with your order number and a description of the issue.",
    suggestions: ["Return policy", "Talk to a human", "Product specs"],
  },
  {
    name: "payment",
    keywords: ["payment", "pay", "crypto", "bitcoin", "wire", "bank transfer", "methods", "checkout"],
    answer: "We accept crypto (Bitcoin, Ethereum, USDT and Solana) and bank/wire transfers. After checkout you'll receive payment instructions and a reference. Once payment is confirmed, we build and ship your order.",
    suggestions: ["Shipping options", "Track my order", "Talk to a human"],
  },
  {
    name: "verification",
    keywords: ["verify", "verification", "otp", "code", "email verify", "verified"],
    answer: "After sign-up we send a 6-digit code to your email. Enter it on the verification screen to confirm your address. Once verified, you're signed in and can check out. If you didn't get a code, check your spam folder or sign in again to request a new one.",
    suggestions: ["Talk to a human", "Payment methods"],
  },
  {
    name: "products",
    keywords: ["spec", "specs", "product", "laptop", "pc", "prebuild", "console", "monitor", "which", "recommend", "gaming"],
    answer: "Browse our Prebuilds, Laptops and Consoles sections to see full specs, images and prices. Tap any product card's 'View details' to see the complete gallery and specification list. Tell me what you plan to use it for and I can point you in the right direction.",
    suggestions: ["Product specs", "Shipping options", "Talk to a human"],
  },
  {
    name: "contact",
    keywords: ["human", "agent", "person", "contact", "call", "phone", "email", "reach", "support team"],
    answer: `You can reach our team at ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}. We're here to help with orders, technical questions and warranty claims. For anything urgent, email us with your order number.`,
    suggestions: ["Shipping options", "Return policy", "Warranty"],
  },
  {
    name: "account",
    keywords: ["account", "sign in", "login", "password", "register", "signup", "promo"],
    answer: "You can sign in or create an account from the top of the site. Your profile shows orders, settings and any promo assigned to you. If you forgot your password, use the 'Forgot password?' link on the sign-in page.",
    suggestions: ["Verification", "Promo code", "Talk to a human"],
  },
];

const FALLBACKS: { answer: string; suggestions: string[] }[] = [
  {
    answer: "I'm not completely sure about that one. I can help with orders, shipping, returns, warranty, payments, verification and product specs — or I can connect you with the support team.",
    suggestions: ["Talk to a human", "Shipping options", "Product specs"],
  },
  {
    answer: "Good question! Our support team can give you a precise answer. In the meantime I can help with shipping, returns, warranty, payments or product information.",
    suggestions: ["Talk to a human", "Payment methods", "Return policy"],
  },
];

function matchIntent(question: string): Intent | null {
  const text = question.toLowerCase().trim();

  let best: Intent | null = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    let score = 0;

    for (const keyword of intent.keywords) {
      if (text.includes(keyword)) score += keyword.length;
    }

    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

/** Produces an answer plus follow-up suggestions for a customer question. */
export function answerQuestion(question: string): {
  answer: string;
  suggestions: string[];
} {
  const intent = matchIntent(question);

  if (intent) {
    return { answer: intent.answer, suggestions: intent.suggestions };
  }

  const fallback = FALLBACKS[question.length % FALLBACKS.length];
  return fallback;
}

export function greetingMessage(): string {
  return "Hi! I'm the Generic PCs assistant. I can help with orders, shipping, returns, warranty, product specs and payments. What can I do for you?";
}

export async function listMessages(
  env: Env,
  sessionId: string
): Promise<ChatMessage[]> {
  const rows = await env.DB.prepare(
    `SELECT id, role, text, created_at FROM chat_messages
      WHERE session_id = ?1 ORDER BY created_at ASC LIMIT 100`
  )
    .bind(sessionId)
    .all<{ id: string; role: string; text: string; created_at: string }>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function appendMessage(
  env: Env,
  sessionId: string,
  role: "user" | "assistant",
  text: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO chat_messages (id, session_id, role, text, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(crypto.randomUUID(), sessionId, role, text.slice(0, 2000), new Date().toISOString())
    .run();
}

export async function clearMessages(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM chat_messages WHERE session_id = ?1")
    .bind(sessionId)
    .run();
}
