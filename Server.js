const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// ==================== FIREBASE ADMIN INITIALIZATION ====================
// These environment variables must be set in Render
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow Netlify frontend
app.use(express.json());

// Admin token (set in Render environment variables)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'supersecretchangeme';

// Helper: require admin token for protected routes
function requireAdmin(req, res, next) {
  const token = req.headers['authorization'];
  if (token === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Invalid or missing admin token.' });
  }
}

// ==================== PUBLIC ENDPOINTS (no auth) ====================
app.get('/api/programs', async (req, res) => {
  try {
    const snapshot = await db.collection('programs').where('published', '==', true).get();
    const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(programs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const snapshot = await db.collection('events').where('published', '==', true).get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/experts', async (req, res) => {
  try {
    const snapshot = await db.collection('experts').get();
    const experts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(experts);
  } catch (err) {
    console.error(err);
    res.json([]); // return empty array on error
  }
});

app.get('/api/successStories', async (req, res) => {
  try {
    const snapshot = await db.collection('successStories').get();
    const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(stories);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.get('/api/membershipPlans', async (req, res) => {
  try {
    const snapshot = await db.collection('membershipPlans').get();
    const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.get('/api/partners', async (req, res) => {
  try {
    const snapshot = await db.collection('partners').get();
    const partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(partners);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const snapshot = await db.collection('campaigns').get();
    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(campaigns);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// ==================== ADMIN ENDPOINTS (protected) ====================
// Programs CRUD
app.get('/api/admin/programs', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('programs').get();
    const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/programs', requireAdmin, async (req, res) => {
  try {
    const newProgram = { ...req.body, published: req.body.published !== false };
    const docRef = await db.collection('programs').add(newProgram);
    res.status(201).json({ id: docRef.id, ...newProgram });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/programs/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection('programs').doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/programs/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('programs').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Events CRUD
app.get('/api/admin/events', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('events').get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/events', requireAdmin, async (req, res) => {
  try {
    const newEvent = { ...req.body, published: req.body.published !== false };
    const docRef = await db.collection('events').add(newEvent);
    res.status(201).json({ id: docRef.id, ...newEvent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/events/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection('events').doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('events').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER ACTIONS (enrollments, registrations, logs) ====================
app.post('/api/programEnrollments', async (req, res) => {
  const { programId, participantName, email, phone } = req.body;
  if (!programId || !participantName || !email) {
    return res.status(400).json({ error: 'Missing required fields: programId, participantName, email' });
  }
  try {
    const enrollment = {
      programId,
      participantName,
      email,
      phone: phone || '',
      enrollmentDate: new Date().toISOString()
    };
    const docRef = await db.collection('enrollments').add(enrollment);
    res.status(201).json({ id: docRef.id, message: 'Enrollment successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save enrollment' });
  }
});

app.post('/api/eventRegistrations', async (req, res) => {
  const { eventId, attendeeName, email, phone } = req.body;
  if (!eventId || !attendeeName || !email) {
    return res.status(400).json({ error: 'Missing required fields: eventId, attendeeName, email' });
  }
  try {
    const registration = {
      eventId,
      attendeeName,
      email,
      phone: phone || '',
      registrationDate: new Date().toISOString()
    };
    const docRef = await db.collection('registrations').add(registration);
    res.status(201).json({ id: docRef.id, message: 'Registration successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save registration' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const logEntry = { ...req.body, timestamp: new Date().toISOString() };
    await db.collection('logs').add(logEntry);
    res.status(201).json({ message: 'Logged successfully' });
  } catch (err) {
    console.error(err);
    // Don't fail the request – just log error
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// ==================== SEED DEFAULT DATA (if collections are empty) ====================
async function seedDefaultData() {
  const collections = ['programs', 'events', 'experts', 'successStories', 'membershipPlans', 'partners', 'campaigns'];
  for (const coll of collections) {
    const snapshot = await db.collection(coll).limit(1).get();
    if (snapshot.empty) {
      console.log(`Seeding default data for ${coll}...`);
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
      console.log(`Seeded ${defaultData.length} documents in ${coll}.`);
    }
  }
}

// ==================== START SERVER ====================
seedDefaultData().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ TIMSupport Backend running on port ${PORT}`);
    console.log(`🌐 Public API base: http://localhost:${PORT}/api`);
    console.log(`🔐 Admin token required for /api/admin/* endpoints`);
  });
}).catch(err => {
  console.error('Failed to seed data:', err);
  app.listen(PORT, () => {
    console.log(`⚠️ Server started but seeding failed. Check Firebase credentials.`);
  });
});