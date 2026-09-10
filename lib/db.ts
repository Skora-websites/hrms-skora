import fs from "fs";
import path from "path";
import clientPromise, { getMongoClient } from "./mongodb";

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  service: string;
  budget?: string;
  message: string;
  status: "New" | "Contacted" | "In Progress" | "Closed";
  source: string;
  createdAt: string;
}

export interface PackageItem {
  id: string;
  name: string;
  price: string;
  period: string;
  popular: boolean;
  subtitle: string;
  features: string[];
}

export interface ServiceItem {
  id: string;
  title: string;
  category: string;
  pricing: string;
  status: "Active" | "Inactive";
}

export interface SiteContent {
  phone: string;
  email: string;
  healthcareEmail: string;
  address: string;
  responseGuarantee: string;
  packages: PackageItem[];
  services: ServiceItem[];
  textOverrides: Record<string, string>;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "hrms.json");

const defaultPackages: PackageItem[] = [
  {
    id: "pkg-1",
    name: "Basic Growth Plan",
    price: "₹5,000",
    period: "+ GST / month",
    popular: false,
    subtitle: "Essential local visibility for solo doctors & clinics",
    features: [
      "Custom 5-Page Doctor Website",
      "Google My Business (GMB) Setup",
      "8 Social Media Posts / month",
      "Basic Local SEO Setup",
      "Monthly Growth Report",
    ],
  },
  {
    id: "pkg-2",
    name: "Standard Growth Plan",
    price: "₹15,000",
    period: "+ GST / month",
    popular: true,
    subtitle: "Our most popular package for growing medical practices",
    features: [
      "Custom 10-Page Medical Website + Booking",
      "GMB Profile Optimization & Map Rank",
      "14 Posts + 2 Reels / month",
      "High-Intent Local SEO Keywords",
      "Report Dispatched Every 15 Days",
      "Priority Clinical Support",
    ],
  },
  {
    id: "pkg-3",
    name: "Premium Growth Plan",
    price: "₹32,000",
    period: "+ GST / month",
    popular: false,
    subtitle: "Complete digital dominance for multi-specialty centers",
    features: [
      "Facebook, Instagram, LinkedIn & GMB",
      "18 Posts + 4 Reels / month",
      "Dedicated Medical Content Team",
      "Weekly Analytical Dispatches",
      "Advanced Local SEO & Maps Ads",
      "24/7 Dedicated Account Manager",
    ],
  },
];

const defaultServices: ServiceItem[] = [
  { id: "srv-1", title: "Website Design & Web Apps", category: "Core Development", pricing: "<25K - >1.5L", status: "Active" },
  { id: "srv-2", title: "Digital Marketing & SEO", category: "Growth & PPC", pricing: "25K - 50K/mo", status: "Active" },
  { id: "srv-3", title: "Branding & Visual Identity", category: "Design Studio", pricing: "25K - 50K", status: "Active" },
  { id: "srv-4", title: "Video Production & Reels", category: "Media Studio", pricing: "50K - 1.5L", status: "Active" },
  { id: "srv-5", title: "Custom SaaS Development", category: "Software Engineering", pricing: ">1.5L", status: "Active" },
  { id: "srv-6", title: "Cloud Services & AWS", category: "DevOps & Cloud", pricing: "Custom Enterprise", status: "Active" },
  { id: "srv-7", title: "CRM Solutions", category: "Business Automation", pricing: "50K - 1.5L", status: "Active" },
  { id: "srv-8", title: "Project Management Systems", category: "Enterprise Systems", pricing: ">1.5L", status: "Active" },
  { id: "srv-9", title: "Mobile App Development", category: "iOS & Android", pricing: ">1.5L", status: "Active" },
];

const defaultSiteContent: SiteContent = {
  phone: "+91 92173 75835",
  email: "ashish17427@gmail.com",
  healthcareEmail: "ashish17427@gmail.com",
  address: "Gaur City 2, Greater Noida, Uttar Pradesh 201308, India",
  responseGuarantee: "Rapid 4-Hour Response Guarantee",
  packages: defaultPackages,
  services: defaultServices,
  textOverrides: {},
  updatedAt: new Date().toISOString(),
};

const initialLeads: Lead[] = [
  {
    id: "lead-101",
    fullName: "Dr. Rajesh Varma",
    email: "rajesh.v@noidaclinic.com",
    phone: "+91 98112 34567",
    company: "Varma Cardiology Clinic",
    service: "Healthcare IT & EHR Systems",
    budget: "50K-1.5L",
    message: "Interested in establishing a clinic management workflow with WhatsApp patient booking integration.",
    status: "New",
    source: "Healthcare Portal",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "lead-102",
    fullName: "Vikram Malhotra",
    email: "vikram@apextechnologies.io",
    phone: "+91 98711 99887",
    company: "Apex Tech Labs",
    service: "Custom SaaS Development",
    budget: ">1.5L",
    message: "We need a multi-tenant SaaS dashboard for asset tracking with AWS cloud architecture.",
    status: "In Progress",
    source: "Main Site Consultation Modal",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

interface DatabaseSchema {
  leads: Lead[];
  content: SiteContent;
}

// ----------------------------------------------------
// LOCAL FILE STORAGE ENGINE (FALLBACK / LOCAL DEV)
// ----------------------------------------------------
function ensureLocalDbFile(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      leads: initialLeads,
      content: defaultSiteContent,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.content || !parsed.content.textOverrides) {
      parsed.content = { ...defaultSiteContent, ...parsed.content, textOverrides: parsed.content?.textOverrides || {} };
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }
    return parsed;
  } catch (err) {
    const initialData: DatabaseSchema = {
      leads: initialLeads,
      content: defaultSiteContent,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

function writeLocalDb(data: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ----------------------------------------------------
// DUAL-ENGINE METHOD IMPLEMENTATIONS
// ----------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection<Lead>("leads");
        const leads = await collection.find({}).sort({ createdAt: -1 }).toArray();
        if (leads.length > 0) {
          return leads.map(({ _id, ...l }) => l as Lead);
        }
        // Auto-seed MongoDB with initial leads if collection is empty
        const localDb = ensureLocalDbFile();
        if (localDb.leads && localDb.leads.length > 0) {
          await collection.insertMany(localDb.leads as any);
          return localDb.leads;
        }
      }
    } catch (e) {
      console.error("MongoDB error, falling back to local storage:", e);
    }
  }

  const db = ensureLocalDbFile();
  return db.leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createLead(leadData: Omit<Lead, "id" | "createdAt" | "status">): Promise<Lead> {
  const newLead: Lead = {
    ...leadData,
    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: "New",
    createdAt: new Date().toISOString(),
  };

  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection<Lead>("leads");
        await collection.insertOne(newLead);
        return newLead;
      }
    } catch (e) {
      console.error("MongoDB Atlas error, saving locally:", e);
    }
  }

  const db = ensureLocalDbFile();
  db.leads.unshift(newLead);
  writeLocalDb(db);
  return newLead;
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<Lead | null> {
  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection<Lead>("leads");
        const result = await collection.findOneAndUpdate(
          { id },
          { $set: { status } },
          { returnDocument: "after" }
        );
        if (result) {
          const { _id, ...updatedLead } = result as any;
          return updatedLead as Lead;
        }
      }
    } catch (e) {
      console.error("MongoDB Atlas error, updating locally:", e);
    }
  }

  const db = ensureLocalDbFile();
  const index = db.leads.findIndex((l) => l.id === id);
  if (index === -1) return null;

  db.leads[index].status = status;
  writeLocalDb(db);
  return db.leads[index];
}

export async function deleteLead(id: string): Promise<boolean> {
  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection<Lead>("leads");
        const res = await collection.deleteOne({ id });
        return res.deletedCount > 0;
      }
    } catch (e) {
      console.error("MongoDB Atlas error, deleting locally:", e);
    }
  }

  const db = ensureLocalDbFile();
  const initialLen = db.leads.length;
  db.leads = db.leads.filter((l) => l.id !== id);
  if (db.leads.length === initialLen) return false;
  writeLocalDb(db);
  return true;
}

export async function getSiteContent(): Promise<SiteContent> {
  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection<SiteContent>("content");
        const content = await collection.findOne({ key: "global_site_content" });
        if (content) {
          const { _id, ...cleanContent } = content as any;
          return {
            ...defaultSiteContent,
            ...cleanContent,
          };
        }
        // Auto-seed MongoDB with initial site content if collection is empty
        const localDb = ensureLocalDbFile();
        const seedContent = localDb.content || defaultSiteContent;
        await collection.updateOne(
          { key: "global_site_content" },
          { $set: { key: "global_site_content", ...seedContent } },
          { upsert: true }
        );
        return seedContent;
      }
    } catch (e) {
      console.error("MongoDB error, loading local content:", e);
    }
  }

  const db = ensureLocalDbFile();
  if (!db.content.packages || db.content.packages.length === 0) {
    db.content.packages = defaultPackages;
  }
  if (!db.content.services || db.content.services.length === 0) {
    db.content.services = defaultServices;
  }
  if (!db.content.textOverrides) {
    db.content.textOverrides = {};
  }
  return db.content;
}

export async function updateSiteContent(partialContent: Partial<SiteContent>): Promise<SiteContent> {
  const current = await getSiteContent();
  const updatedContent: SiteContent = {
    ...current,
    ...partialContent,
    textOverrides: {
      ...(current.textOverrides || {}),
      ...(partialContent.textOverrides || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection("content");
        await collection.updateOne(
          { key: "global_site_content" },
          { $set: { key: "global_site_content", ...updatedContent } },
          { upsert: true }
        );
      }
    } catch (e) {
      console.error("MongoDB Atlas error, updating local content:", e);
    }
  }

  // Always sync and write to local codebase JSON file (data/hrms.json)
  const localDb = ensureLocalDbFile();
  localDb.content = updatedContent;
  writeLocalDb(localDb);
  return updatedContent;
}

export interface AdminUser {
  username: string;
  passwordHash: string;
  role: string;
  updatedAt: string;
}

export async function getAdminUser(): Promise<AdminUser> {
  try {
    const client = await getMongoClient();
    if (client) {
      const db = client.db("hrms");
      const collection = db.collection<AdminUser>("admin");
      let user = await collection.findOne({ key: "admin_user" });
      if (!user) {
        user = await collection.findOne({});
      }
      if (user) {
        const { _id, ...cleanUser } = user as any;
        return {
          username: String(cleanUser.username || cleanUser.name || ""),
          passwordHash: String(cleanUser.passwordHash || cleanUser.password || ""),
          role: String(cleanUser.role || "SuperAdmin"),
          updatedAt: cleanUser.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error("MongoDB error loading admin user:", e);
  }

  return {
    username: "",
    passwordHash: "",
    role: "SuperAdmin",
    updatedAt: new Date().toISOString(),
  };
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const adminUser = await getAdminUser();
  const dbUsername = (adminUser.username || "").toLowerCase().trim();
  const dbPassword = (adminUser.passwordHash || "").trim();

  const inputUsername = (username || "").toLowerCase().trim();
  const inputPassword = (password || "").trim();

  const isUsernameValid = inputUsername === dbUsername;
  const isPasswordValid = inputPassword === dbPassword;

  if (!isUsernameValid || !isPasswordValid) {
    console.warn(`[Admin Auth] Login failed for user '${inputUsername}'. DB expects username: '${dbUsername}'`);
  } else {
    console.log(`[Admin Auth] Login succeeded for user '${inputUsername}'`);
  }

  return isUsernameValid && isPasswordValid;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const adminUser = await getAdminUser();
  return password === adminUser.passwordHash;
}

export async function updateAdminCredentials(newUsername?: string, newPassword?: string): Promise<boolean> {
  const current = await getAdminUser();
  const updatedUser: AdminUser = {
    ...current,
    ...(newUsername && newUsername.trim().length > 0 ? { username: newUsername.trim() } : {}),
    ...(newPassword && newPassword.trim().length > 0 ? { passwordHash: newPassword.trim() } : {}),
    updatedAt: new Date().toISOString(),
  };

  if (clientPromise) {
    try {
      const client = await clientPromise;
      if (client) {
        const db = client.db("hrms");
        const collection = db.collection("admin");
        await collection.updateOne(
          { key: "admin_user" },
          { $set: { key: "admin_user", ...updatedUser } },
          { upsert: true }
        );
      }
    } catch (e) {
      console.error("MongoDB Atlas error updating admin user:", e);
    }
  }

  return true;
}

export async function updateAdminPassword(newPassword: string): Promise<boolean> {
  return updateAdminCredentials(undefined, newPassword);
}
