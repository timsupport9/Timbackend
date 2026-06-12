const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Firebase Admin SDK – uses environment variables set in Render
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
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  console.error('❌ Missing Firebase credentials. Set environment variables in Render.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

app.use(cors());
app.use(express.json());

// Admin authentication middleware
function requireAdmin(req, res, next) {
  const token = req.headers.authorization;
  if (token === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ========== PUBLIC ENDPOINTS ==========
app.get('/api/programs', async (req, res) => {
  try {
    const snapshot = await db.collection('programs').where('published', '==', true).get();
    const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const snapshot = await db.collection('events').where('published', '==', true).get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/experts', async (req, res) => {
  try {
    const snapshot = await db.collection('experts').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { res.json([]); }
});

app.get('/api/successStories', async (req, res) => {
  try {
    const snapshot = await db.collection('successStories').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { res.json([]); }
});

app.get('/api/membershipPlans', async (req, res) => {
  try {
    const snapshot = await db.collection('membershipPlans').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { res.json([]); }
});

app.get('/api/partners', async (req, res) => {
  try {
    const snapshot = await db.collection('partners').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { res.json([]); }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const snapshot = await db.collection('campaigns').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) { res.json([]); }
});

// ========== ADMIN ENDPOINTS ==========
app.get('/api/admin/programs', requireAdmin, async (req, res) => {
  const snapshot = await db.collection('programs').get();
  res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.post('/api/admin/programs', requireAdmin, async (req, res) => {
  const newProgram = { ...req.body, published: req.body.published !== false };
  const docRef = await db.collection('programs').add(newProgram);
  res.status(201).json({ id: docRef.id, ...newProgram });
});

app.put('/api/admin/programs/:id', requireAdmin, async (req, res) => {
  await db.collection('programs').doc(req.params.id).update(req.body);
  res.json({ id: req.params.id, ...req.body });
});

app.delete('/api/admin/programs/:id', requireAdmin, async (req, res) => {
  await db.collection('programs').doc(req.params.id).delete();
  res.json({ success: true });
});

app.get('/api/admin/events', requireAdmin, async (req, res) => {
  const snapshot = await db.collection('events').get();
  res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.post('/api/admin/events', requireAdmin, async (req, res) => {
  const newEvent = { ...req.body, published: req.body.published !== false };
  const docRef = await db.collection('events').add(newEvent);
  res.status(201).json({ id: docRef.id, ...newEvent });
});

app.put('/api/admin/events/:id', requireAdmin, async (req, res) => {
  await db.collection('events').doc(req.params.id).update(req.body);
  res.json({ id: req.params.id, ...req.body });
});

app.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
  await db.collection('events').doc(req.params.id).delete();
  res.json({ success: true });
});

// ========== USER ACTIONS ==========
app.post('/api/programEnrollments', async (req, res) => {
  const { programId, participantName, email, phone } = req.body;
  if (!programId || !participantName || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const enrollment = {
    programId, participantName, email, phone: phone || '',
    enrollmentDate: new Date().toISOString()
  };
  const docRef = await db.collection('enrollments').add(enrollment);
  res.status(201).json({ id: docRef.id, message: 'Enrollment successful' });
});

app.post('/api/eventRegistrations', async (req, res) => {
  const { eventId, attendeeName, email, phone } = req.body;
  if (!eventId || !attendeeName || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const registration = {
    eventId, attendeeName, email, phone: phone || '',
    registrationDate: new Date().toISOString()
  };
  const docRef = await db.collection('registrations').add(registration);
  res.status(201).json({ id: docRef.id, message: 'Registration successful' });
});

app.post('/api/logs', async (req, res) => {
  const logEntry = { ...req.body, timestamp: new Date().toISOString() };
  await db.collection('logs').add(logEntry);
  res.status(201).json({ message: 'Logged' });
});

// ========== SEED DEFAULT DATA ==========
async function seedDefaultData() {
  const collections = ['programs', 'events', 'experts', 'successStories', 'membershipPlans', 'partners', 'campaigns'];
  for (const coll of collections) {
    const snapshot = await db.collection(coll).limit(1).get();
    if (snapshot.empty) {
      console.log(`Seeding ${coll}...`);
      let defaultData = [];
      if (coll === 'programs') {
        defaultData = [
          { title: "Youth Leadership Academy", description: "6-month mentorship for young leaders.", startDate: "2025-07-01", endDate: "2025-12-15", published: true },
          { title: "Women in Tech Bootcamp", description: "Coding and digital skills for women.", startDate: "2025-08-10", endDate: "2025-10-20", published: true },
          { title: "Small Business Grants", description: "Seed funding and training for entrepreneurs.", startDate: "2025-06-01", endDate: "2025-09-30", published: true }
        ];
      } else if (coll === 'events') {
        defaultData = [
          { title: "Community Health Fair", date: "2026-07-20", location: "Nairobi, Kenya", published: true },
          { title: "Fundraising Gala", date: "2026-08-15", location: "Nairobi, Kenya", published: true },
          { title: "Webinar: Social Impact Strategies", date: "2026-07-05", location: "Online", published: true }
        ];
      } else if (coll === 'experts') {
        defaultData = [
          { name: "Dr. Sarah Kimani", expertise: "Community Development", email: "sarah@timsupport.org" },
          { name: "James Otieno", expertise: "Financial Literacy", email: "james@timsupport.org" },
          { name: "Prof. Amina Mohammed", expertise: "Education Policy", email: "amina@timsupport.org" }
        ];
      } else if (coll === 'successStories') {
        defaultData = [
          { author: "Mary Wanjiku", story: "The grant helped me start a tailoring business that now employs 5 people.", role: "Entrepreneur" },
          { author: "Brian Odhiambo", story: "The mentorship program gave me the skills to land my dream job.", role: "Youth Beneficiary" }
        ];
      } else if (coll === 'membershipPlans') {
        defaultData = [
          { title: "Supporter", price: "Free", features: "Newsletters, Updates" },
          { title: "Partner", price: "$25/mo", features: "Events, Priority support" },
          { title: "Ambassador", price: "$100/mo", features: "Board access, Annual gala" }
        ];
      } else if (coll === 'partners') {
        defaultData = [
          { name: "TechCorp", type: "Technology" },
          { name: "Green Fund", type: "NGO" },
          { name: "Local Government", type: "Government" }
        ];
      } else if (coll === 'campaigns') {
        defaultData = [
          { title: "Education For All", goal: 50000, raised: 32450, description: "Providing school supplies and scholarships to 500 children." }
        ];
      }
      for (const item of defaultData) {
        await db.collection(coll).add(item);
      }
      console.log(`Seeded ${defaultData.length} documents in ${coll}.`);
    }
  }
}

// Start server
seedDefaultData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API base: http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('Seeding error:', err);
    app.listen(PORT, () => {
      console.log(`⚠️ Server started on port ${PORT} (seed failed)`);
    });
  });
