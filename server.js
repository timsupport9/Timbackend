const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// ==================== CONFIGURATION & VALIDATION ====================
const PORT = process.env.PORT || 3001;

// Admin token – must be set in Render environment (no default!)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error('❌ FATAL: ADMIN_TOKEN environment variable is not set.');
  process.exit(1);
}

// CORS – allow only your Netlify frontend (or use environment variable)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://your-netlify-app.netlify.app';
const corsOptions = {
  origin: ALLOWED_ORIGIN,
  optionsSuccessStatus: 200
};

// Firebase credentials – check required fields
const requiredFirebaseEnv = [
  'FIREBASE_TYPE',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_AUTH_URI',
  'FIREBASE_TOKEN_URI',
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
  'FIREBASE_CLIENT_X509_CERT_URL'
];

const missing = requiredFirebaseEnv.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing Firebase environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Build service account object
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// ==================== FIREBASE INITIALIZATION ====================
let db;
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin initialized successfully');
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin:', err.message);
  process.exit(1);
}

// ==================== EXPRESS APP SETUP ====================
const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint (useful for Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper: require admin token for protected routes
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Invalid or missing admin token.' });
  }
}

// Simple error handler for async routes (optional, but good practice)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ==================== PUBLIC ENDPOINTS (no auth) ====================
app.get('/api/programs', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('programs').where('published', '==', true).get();
  const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(programs);
}));

app.get('/api/events', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('events').where('published', '==', true).get();
  const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(events);
}));

app.get('/api/experts', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('experts').get();
  const experts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(experts);
}));

app.get('/api/successStories', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('successStories').get();
  const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(stories);
}));

app.get('/api/membershipPlans', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('membershipPlans').get();
  const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(plans);
}));

app.get('/api/partners', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('partners').get();
  const partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(partners);
}));

app.get('/api/campaigns', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('campaigns').get();
  const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(campaigns);
}));

// ==================== ADMIN ENDPOINTS (protected) ====================
// Programs
app.get('/api/admin/programs', requireAdmin, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('programs').get();
  const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(programs);
}));

app.post('/api/admin/programs', requireAdmin, asyncHandler(async (req, res) => {
  const newProgram = { ...req.body, published: req.body.published !== false };
  const docRef = await db.collection('programs').add(newProgram);
  res.status(201).json({ id: docRef.id, ...newProgram });
}));

app.put('/api/admin/programs/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.collection('programs').doc(id).update(req.body);
  res.json({ id, ...req.body });
}));

app.delete('/api/admin/programs/:id', requireAdmin, asyncHandler(async (req, res) => {
  await db.collection('programs').doc(req.params.id).delete();
  res.json({ success: true });
}));

// Events
app.get('/api/admin/events', requireAdmin, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('events').get();
  const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(events);
}));

app.post('/api/admin/events', requireAdmin, asyncHandler(async (req, res) => {
  const newEvent = { ...req.body, published: req.body.published !== false };
  const docRef = await db.collection('events').add(newEvent);
  res.status(201).json({ id: docRef.id, ...newEvent });
}));

app.put('/api/admin/events/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.collection('events').doc(id).update(req.body);
  res.json({ id, ...req.body });
}));

app.delete('/api/admin/events/:id', requireAdmin, asyncHandler(async (req, res) => {
  await db.collection('events').doc(req.params.id).delete();
  res.json({ success: true });
}));

// (Optional) Admin endpoints for viewing enrollments, registrations, logs
app.get('/api/admin/enrollments', requireAdmin, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('enrollments').get();
  const enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(enrollments);
}));

app.get('/api/admin/registrations', requireAdmin, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('registrations').get();
  const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(registrations);
}));

// ==================== USER ACTIONS ====================
app.post('/api/programEnrollments', asyncHandler(async (req, res) => {
  const { programId, participantName, email, phone } = req.body;
  if (!programId || !participantName || !email) {
    return res.status(400).json({ error: 'Missing required fields: programId, participantName, email' });
  }
  const enrollment = {
    programId,
    participantName,
    email,
    phone: phone || '',
    enrollmentDate: new Date().toISOString()
  };
  const docRef = await db.collection('enrollments').add(enrollment);
  res.status(201).json({ id: docRef.id, message: 'Enrollment successful' });
}));

app.post('/api/eventRegistrations', asyncHandler(async (req, res) => {
  const { eventId, attendeeName, email, phone } = req.body;
  if (!eventId || !attendeeName || !email) {
    return res.status(400).json({ error: 'Missing required fields: eventId, attendeeName, email' });
  }
  const registration = {
    eventId,
    attendeeName,
    email,
    phone: phone || '',
    registrationDate: new Date().toISOString()
  };
  const docRef = await db.collection('registrations').add(registration);
  res.status(201).json({ id: docRef.id, message: 'Registration successful' });
}));

app.post('/api/logs', asyncHandler(async (req, res) => {
  const logEntry = { ...req.body, timestamp: new Date().toISOString() };
  await db.collection('logs').add(logEntry);
  res.status(201).json({ message: 'Logged successfully' });
}));

// ==================== SEED DEFAULT DATA (non‑blocking) ====================
async function seedDefaultData() {
  const collections = ['programs', 'events', 'experts', 'successStories', 'membershipPlans', 'partners', 'campaigns'];
  for (const coll of collections) {
    try {
      const snapshot = await db.collection(coll).limit(1).get();
      if (snapshot.empty) {
        console.log(`🌱 Seeding default data for ${coll}...`);
        let defaultData = [];
        switch (coll) {
          case 'programs':
            defaultData = [
              { title: "Youth Leadership Academy", description: "6-month mentorship for young leaders.", startDate: "2025-07-01", endDate: "2025-12-15", published: true },
              { title: "Women in Tech Bootcamp", description: "Coding and digital skills for women.", startDate: "2025-08-10", endDate: "2025-10-20", published: true },
              { title: "Small Business Grants", description: "Seed funding and training for entrepreneurs.", startDate: "2025-06-01", endDate: "2025-09-30", published: true }
            ];
            break;
          case 'events':
            defaultData = [
              { title: "Community Health Fair", date: "2026-07-20", location: "Nairobi, Kenya", published: true },
              { title: "Fundraising Gala", date: "2026-08-15", location: "Nairobi, Kenya", published: true },
              { title: "Webinar: Social Impact Strategies", date: "2026-07-05", location: "Online", published: true }
            ];
            break;
          case 'experts':
            defaultData = [
              { name: "Dr. Sarah Kimani", expertise: "Community Development", email: "sarah@timsupport.org" },
              { name: "James Otieno", expertise: "Financial Literacy", email: "james@timsupport.org" },
              { name: "Prof. Amina Mohammed", expertise: "Education Policy", email: "amina@timsupport.org" }
            ];
            break;
          case 'successStories':
            defaultData = [
              { author: "Mary Wanjiku", story: "The grant helped me start a tailoring business that now employs 5 people.", role: "Entrepreneur" },
              { author: "Brian Odhiambo", story: "The mentorship program gave me the skills to land my dream job.", role: "Youth Beneficiary" }
            ];
            break;
          case 'membershipPlans':
            defaultData = [
              { title: "Supporter", price: "Free", features: "Newsletters, Updates" },
              { title: "Partner", price: "$25/mo", features: "Events, Priority support" },
              { title: "Ambassador", price: "$100/mo", features: "Board access, Annual gala" }
            ];
            break;
          case 'partners':
            defaultData = [
              { name: "TechCorp", type: "Technology" },
              { name: "Green Fund", type: "NGO" },
              { name: "Local Government", type: "Government" }
            ];
            break;
          case 'campaigns':
            defaultData = [
              { title: "Education For All", goal: 50000, raised: 32450, description: "Providing school supplies and scholarships to 500 children." }
            ];
            break;
        }
        for (const item of defaultData) {
          await db.collection(coll).add(item);
        }
        console.log(`✅ Seeded ${defaultData.length} documents in ${coll}.`);
      }
    } catch (err) {
      console.error(`⚠️ Seeding failed for ${coll}:`, err.message);
    }
  }
}

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 TIMSupport Backend running on port ${PORT}`);
  console.log(`🔐 Admin token required for /api/admin/* endpoints`);
  console.log(`🌍 Allowed origin: ${ALLOWED_ORIGIN}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);

  // Start seeding in background – does NOT block the server
  seedDefaultData().catch(err => {
    console.error('❌ Background seeding failed:', err.message);
  });
});

// Global error handler (catches asyncHandler errors)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});