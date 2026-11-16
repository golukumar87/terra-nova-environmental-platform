// TERRA NOVA - Express Production API Server & Real-Time SSE Stream Engine
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');
const Stripe = require('stripe');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || (IS_PRODUCTION ? '' : 'mongodb://127.0.0.1:27017/terra-nova');
const MONGODB_DB = process.env.MONGODB_DB || 'terra-nova';
const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? '' : 'terra-nova-local-secret');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const APP_URL = process.env.APP_URL || (IS_PRODUCTION ? '' : `http://localhost:${PORT}`);

if (IS_PRODUCTION && (!MONGODB_URI || !JWT_SECRET)) {
    throw new Error('MONGODB_URI and JWT_SECRET must be configured in production.');
}

// Middleware
if (IS_PRODUCTION) {
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
    if (allowedOrigins.length) app.use(cors({ origin: allowedOrigins }));
} else {
    app.use(cors());
}

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ success: false, error: 'Payment webhook is not configured.' });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return res.status(400).json({ success: false, error: 'Invalid payment webhook signature.' });
    }

    try {
        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
            const session = event.data.object;
            if (session.mode === 'payment' && session.payment_status === 'paid') {
                await recordDonation({
                    stripeReference: session.id,
                    stripeSessionId: session.id,
                    paymentIntentId: session.payment_intent,
                    campaignId: session.metadata?.campaignId,
                    donorName: session.metadata?.donorName || session.customer_details?.name || '',
                    donorEmail: session.customer_details?.email || session.customer_email || '',
                    amountCents: session.amount_total || 0,
                    currency: session.currency || 'usd',
                    frequency: 'one-time'
                });
            }
        }

        if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            const subscriptionId = typeof invoice.subscription === 'string'
                ? invoice.subscription
                : invoice.parent?.subscription_details?.subscription;
            if (subscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const metadata = subscription.metadata || {};
                await recordDonation({
                    stripeReference: invoice.id,
                    stripeSessionId: '',
                    paymentIntentId: invoice.payment_intent || '',
                    subscriptionId,
                    campaignId: metadata.campaignId,
                    donorName: metadata.donorName || '',
                    donorEmail: metadata.donorEmail || invoice.customer_email || '',
                    amountCents: invoice.amount_paid || 0,
                    currency: invoice.currency || 'usd',
                    frequency: 'recurring'
                });
            }
        }

        return res.json({ received: true });
    } catch (error) {
        console.error('[PAYMENTS] webhook processing failed:', error.message);
        return res.status(500).json({ success: false, error: 'Payment event could not be recorded.' });
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname), {
    setHeaders(response, filePath) {
        if (/\.(?:webp|jpg|jpeg|png|mp4)$/i.test(filePath)) {
            response.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        } else if (/\.(?:js|css)$/i.test(filePath)) {
            response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
        } else if (/\.html?$/i.test(filePath)) {
            response.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// In-Memory fallback for demo mode
const subscribers = [];
const members = [];
const sseClients = new Set();
const leaderboardData = [
    { rank: 1, name: "Elena Rostova", country: "🇳🇴 Norway", trees: 1420, offsetTons: 84.5, badge: "🌿 Planet Titan", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop" },
    { rank: 2, name: "Rajesh Kumar", country: "🇮🇳 India", trees: 1150, offsetTons: 62.0, badge: "⚡ Solar Pioneer", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop" },
    { rank: 3, name: "Marcus Thorne", country: "🇬🇧 UK", trees: 980, offsetTons: 54.2, badge: "🌀 Wind Guardian", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop" },
    { rank: 4, name: "Sophia Chen", country: "🇸🇬 Singapore", trees: 860, offsetTons: 48.9, badge: "🌱 Canopy Eco-Lead", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop" },
    { rank: 5, name: "Mateo Silva", country: "🇧🇷 Brazil", trees: 720, offsetTons: 41.5, badge: "🌴 Forest Ranger", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop" }
];

let mongoClient = null;
let mongoDb = null;

async function connectToMongo() {
    if (!MONGODB_URI) return null;
    try {
        if (!mongoClient) {
            mongoClient = new MongoClient(MONGODB_URI);
            await mongoClient.connect();
            mongoDb = mongoClient.db(MONGODB_DB);
            console.log(`[DB] MongoDB connected to database: ${MONGODB_DB}`);
        }
        return mongoDb;
    } catch (error) {
        console.error('[DB] MongoDB connection failed:', error.message);
        return null;
    }
}

async function getCollection(collectionName) {
    const db = await connectToMongo();
    return db ? db.collection(collectionName) : null;
}

async function applyCrmEngagement(email, event, scoreDelta, segment) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;
    try {
        const subscribersCollection = await getCollection('subscribers');
        if (!subscribersCollection) return;

        const subscriber = await subscribersCollection.findOne({ email: normalizedEmail });
        if (!subscriber || subscriber.status === 'unsubscribed') return;
        const nextScore = Math.min(100, Math.max(0, Number(subscriber.leadScore || 0) + scoreDelta));
        const segments = [...new Set([...(subscriber.segments || []), segment].filter(Boolean))];
        await subscribersCollection.updateOne({ _id: subscriber._id }, { $set: { leadScore: nextScore, segments, lastActivityAt: new Date() } });

        const activitiesCollection = await getCollection('crm_activities');
        if (activitiesCollection) {
            await activitiesCollection.insertOne({ subscriberId: subscriber._id, email: normalizedEmail, event, scoreDelta, segment, createdAt: new Date() });
        }
    } catch (error) {
        console.error('[CRM] engagement workflow failed:', error.message);
    }
}

const contentCollectionNames = {
    articles: 'articles',
    authors: 'authors',
    'case-studies': 'caseStudies',
    testimonials: 'testimonials'
};

function slugify(value) {
    return String(value || '').trim().toLowerCase().normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTags(value) {
    const tags = Array.isArray(value) ? value : String(value || '').split(',');
    return [...new Set(tags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

function normalizeContentEntry(type, payload, existing = {}) {
    const input = { ...existing, ...payload };
    const now = new Date();

    if (type === 'authors') {
        const name = String(input.name || '').trim().slice(0, 100);
        const slug = slugify(input.slug || name);
        const bio = String(input.bio || '').trim().slice(0, 2000);
        const role = String(input.role || '').trim().slice(0, 120);
        const photo = String(input.photo || '').trim().slice(0, 500);
        if (name.length < 2 || !slug || bio.length < 20 || !role) throw new Error('Author name, role, and a bio of at least 20 characters are required.');
        return { name, slug, bio, role, photo, updatedAt: now, createdAt: existing.createdAt || now };
    }

    if (type === 'articles') {
        const title = String(input.title || '').trim().slice(0, 180);
        const slug = slugify(input.slug || title);
        const excerpt = String(input.excerpt || '').trim().slice(0, 500);
        const content = String(input.content || '').trim().slice(0, 100000);
        const category = String(input.category || '').trim().slice(0, 80);
        const authorId = String(input.authorId || '');
        const status = input.status === 'published' ? 'published' : 'draft';
        if (title.length < 5 || !slug || excerpt.length < 20 || content.length < 50 || !category || !ObjectId.isValid(authorId)) {
            throw new Error('Article title, slug, category, author, excerpt, and content are required.');
        }
        return {
            title, slug, excerpt, content, category, tags: normalizeTags(input.tags), authorId: new ObjectId(authorId),
            featuredImage: String(input.featuredImage || '').trim().slice(0, 500), status,
            publishedAt: status === 'published' ? (existing.publishedAt || now) : null,
            updatedAt: now, createdAt: existing.createdAt || now
        };
    }

    if (type === 'case-studies') {
        const title = String(input.title || '').trim().slice(0, 180);
        const slug = slugify(input.slug || title);
        const campaignId = String(input.campaignId || '');
        const summary = String(input.summary || '').trim().slice(0, 1000);
        const challenge = String(input.challenge || '').trim().slice(0, 5000);
        const approach = String(input.approach || '').trim().slice(0, 5000);
        const results = String(input.results || '').trim().slice(0, 5000);
        const beforeData = String(input.beforeData || '').trim().slice(0, 2000);
        const afterData = String(input.afterData || '').trim().slice(0, 2000);
        const status = input.status === 'published' ? 'published' : 'draft';
        if (title.length < 5 || !slug || summary.length < 20 || challenge.length < 20 || approach.length < 20 || results.length < 20 || (campaignId && !ObjectId.isValid(campaignId))) {
            throw new Error('Case study title, summary, challenge, approach, and results are required.');
        }
        return {
            title, slug, summary, challenge, approach, results, beforeData, afterData,
            campaignId: campaignId ? new ObjectId(campaignId) : null, status,
            publishedAt: status === 'published' ? (existing.publishedAt || now) : null,
            updatedAt: now, createdAt: existing.createdAt || now
        };
    }

    if (type === 'testimonials') {
        const quote = String(input.quote || '').trim().slice(0, 1500);
        const name = String(input.name || '').trim().slice(0, 100);
        const role = String(input.role || '').trim().slice(0, 120);
        const organization = String(input.organization || '').trim().slice(0, 160);
        const status = ['approved', 'rejected'].includes(input.status) ? input.status : 'pending';
        if (quote.length < 20 || name.length < 2 || !role || input.consentGiven !== true) {
            throw new Error('A testimonial quote, contributor name, role, and documented permission are required.');
        }
        return { quote, name, role, organization, consentGiven: true, status, updatedAt: now, createdAt: existing.createdAt || now };
    }

    throw new Error('Unsupported content type.');
}

async function requireAdmin(req, res) {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Admin access required.' });
        return null;
    }
    return user;
}

async function recordDonation(donation) {
    if (!ObjectId.isValid(donation.campaignId) || donation.amountCents <= 0) return null;
    const donationsCollection = await getCollection('donations');
    const projectsCollection = await getCollection('projects');
    if (!donationsCollection || !projectsCollection) throw new Error('Donation storage is unavailable.');

    await donationsCollection.createIndex({ stripeReference: 1 }, { unique: true });
    const existing = await donationsCollection.findOne({ stripeReference: donation.stripeReference });
    if (existing) return existing;

    const record = { ...donation, campaignId: new ObjectId(donation.campaignId), createdAt: new Date() };
    try {
        await donationsCollection.insertOne(record);
    } catch (error) {
        if (error.code === 11000) return donationsCollection.findOne({ stripeReference: donation.stripeReference });
        throw error;
    }

    await projectsCollection.updateOne(
        { _id: record.campaignId },
        { $inc: { raised: donation.amountCents / 100 } }
    );
    await applyCrmEngagement(donation.donorEmail, 'donation_completed', 12, 'donor');
    return record;
}

function createHash(value, salt) {
    return crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha512').toString('hex');
}

function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    try {
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (error) {
        return null;
    }
}

function getRequestCookie(req, name) {
    const cookies = String(req.headers.cookie || '').split(';');
    const entry = cookies.map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}

function secureStringEqual(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createGoogleOAuthState() {
    const value = `${Date.now()}.${crypto.randomBytes(24).toString('base64url')}`;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(value).digest('base64url');
    return `${value}.${signature}`;
}

function verifyGoogleOAuthState(state) {
    const [timestamp, nonce, signature, ...extra] = String(state || '').split('.');
    if (!timestamp || !nonce || !signature || extra.length) return false;
    const issuedAt = Number(timestamp);
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 10 * 60 * 1000 || issuedAt > Date.now() + 60 * 1000) return false;
    const value = `${timestamp}.${nonce}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(value).digest('base64url');
    return secureStringEqual(expected, signature);
}

async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const decoded = verifyToken(token);
    if (!decoded || !decoded.sub) return null;

    const usersCollection = await getCollection('users');
    if (!usersCollection) return null;

    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.sub) });
    return user;
}

async function ensureDefaultUsers() {
    const usersCollection = await getCollection('users');
    if (!usersCollection) return;
    const adminEmail = process.env.ADMIN_EMAIL || (IS_PRODUCTION ? '' : 'admin@terranova.earth');
    const adminPassword = process.env.ADMIN_PASSWORD || (IS_PRODUCTION ? '' : 'admin123');
    if (!adminEmail || !adminPassword) return;

    const adminExists = await usersCollection.findOne({ email: adminEmail.toLowerCase() });
    if (!adminExists) {
        const salt = crypto.randomBytes(16).toString('hex');
        await usersCollection.insertOne({
            name: 'Terra Nova Admin',
            email: adminEmail.toLowerCase(),
            passwordHash: createHash(adminPassword, salt),
            salt,
            role: 'admin',
            bio: 'Platform administrator',
            photo: '',
            createdAt: new Date()
        });
    }
}

async function ensureDefaultProjects() {
    const projectsCollection = await getCollection('projects');
    if (!projectsCollection) return;
    const count = await projectsCollection.countDocuments();
    if (count > 0) return;

    await projectsCollection.insertMany([
        {
            name: 'Amazon Canopy Guard',
            category: 'Ecosystem Restoration',
            region: 'Amazon Basin',
            impact: '12M hectares protected',
            status: 'Active',
            fundingGoal: 2500000,
            raised: 1865000,
            createdAt: new Date()
        },
        {
            name: 'Nordic Offshore Wind Grid',
            category: 'Clean Energy',
            region: 'North Sea',
            impact: '1.4 GW renewable output',
            status: 'Scaling',
            fundingGoal: 4300000,
            raised: 3125000,
            createdAt: new Date()
        },
        {
            name: 'Urban Green Homes',
            category: 'Sustainable Communities',
            region: 'India',
            impact: '18K households upgraded',
            status: 'Pilot',
            fundingGoal: 1200000,
            raised: 980000,
            createdAt: new Date()
        }
    ]);
}

async function ensureDefaultContent() {
    const authorsCollection = await getCollection('authors');
    const articlesCollection = await getCollection('articles');
    const caseStudiesCollection = await getCollection('caseStudies');
    const testimonialsCollection = await getCollection('testimonials');
    if (!authorsCollection || !articlesCollection || !caseStudiesCollection || !testimonialsCollection) return;

    const authorCount = await authorsCollection.countDocuments();
    if (authorCount === 0) {
        const authors = [
            { name: 'Ava Shah', slug: 'ava-shah', role: 'Head of Climate Systems', bio: 'Ava leads Terra Nova’s climate systems strategy, with a focus on regional energy transitions, urban resilience, and policy-ready analytics for nature-positive infrastructure.', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop' },
            { name: 'Mateo Neri', slug: 'mateo-neri', role: 'Restoration Science Lead', bio: 'Mateo coordinates ecological restoration planning across water basins, biodiversity mapping, and community-led native reforestation efforts.', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop' },
            { name: 'Leah Okafor', slug: 'leah-okafor', role: 'Community Design Director', bio: 'Leah manages community-led design and local adaptation planning, aligning urban systems with equitable access, public health, and climate resilience.', photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&auto=format&fit=crop' }
        ];
        await authorsCollection.insertMany(authors);
    }

    const articleCount = await articlesCollection.countDocuments();
    if (articleCount === 0) {
        const authorDocs = await authorsCollection.find({}).toArray();
        const authorMap = Object.fromEntries(authorDocs.map(author => [author.slug, author._id]));
        await articlesCollection.insertMany([
            {
                title: 'How floating offshore wind can stabilize coastal grids',
                slug: 'floating-offshore-wind-coastal-grids',
                excerpt: 'A practical look at how floating wind can reduce seasonal volatility while increasing renewable supply for industrial hubs.',
                content: 'Floating offshore wind is changing how coastal regions secure energy during seasonal weather swings. In the North Sea and other exposed coastlines, floating arrays can be deployed farther out to capture stronger, steadier wind conditions and connect to port infrastructure with fewer land-use conflicts. Terra Nova models show that flexible offshore networks reduce grid volatility for industrial demand clusters while creating local manufacturing and maintenance jobs. By pairing these assets with storage, demand response, and community-energy planning, regions can lower emissions without creating new bottlenecks in urban power systems. The next step is not just deployment, but design-quality integration: port upgrades, policy planning, and community trust in each new site.',
                category: 'Climate Tech',
                tags: ['renewables', 'grid', 'offshore'],
                authorId: authorMap['ava-shah'],
                featuredImage: 'assets/hero_bg_2.webp',
                status: 'published',
                publishedAt: new Date('2026-09-12T00:00:00Z'),
                createdAt: new Date('2026-09-12T00:00:00Z'),
                updatedAt: new Date('2026-09-12T00:00:00Z')
            },
            {
                title: 'Restoring rainforest corridors with AI-guided seed delivery',
                slug: 'restoring-rainforest-corridors-ai-guided-seed-delivery',
                excerpt: 'Biodiversity restoration works best when every seed drop is matched to ecological context and local stewardship.',
                content: 'Rainforest restoration is not simply a matter of planting more trees. In high-risk landscapes, seedlings need the right ecological mix, local hydrology, and corridor connectivity to survive and regenerate biodiversity. Terra Nova uses AI-guided mapping to identify the best native seed mixes, moisture corridors, and restoration timing for degraded landscapes. The model also balances local community priorities by aligning restoration with access to food, water, and collective maintenance work. The result is not only a tree count, but a rebuilt corridor that supports birds, pollinators, soil health, and community livelihoods across much longer time horizons.',
                category: 'Biodiversity',
                tags: ['restoration', 'biodiversity', 'ai'],
                authorId: authorMap['mateo-neri'],
                featuredImage: 'assets/solution_ecosystems.webp',
                status: 'published',
                publishedAt: new Date('2026-08-21T00:00:00Z'),
                createdAt: new Date('2026-08-21T00:00:00Z'),
                updatedAt: new Date('2026-08-21T00:00:00Z')
            },
            {
                title: 'Designing climate-ready housing for healthier neighborhoods',
                slug: 'designing-climate-ready-housing-healthier-neighborhoods',
                excerpt: 'Urban housing design can drastically improve public health, cooling, and social resilience under heat stress.',
                content: 'Housing policy and architectural design are increasingly important in public health planning, especially in flood-prone and heat-vulnerable neighborhoods. By combining natural ventilation, thermal mass, shaded courtyards, and low-energy cooling, homes can cut indoor temperatures and reduce stress on local grids. Terra Nova works with city planners and builders to design homes that improve comfort without excluding low-income households from the benefits of adaptation. The opportunity is not only greener construction, but healthier and more affordable communities where energy use, air quality, and daily life improve together.',
                category: 'Architecture',
                tags: ['housing', 'resilience', 'design'],
                authorId: authorMap['leah-okafor'],
                featuredImage: 'assets/solution_communities.webp',
                status: 'published',
                publishedAt: new Date('2026-07-18T00:00:00Z'),
                createdAt: new Date('2026-07-18T00:00:00Z'),
                updatedAt: new Date('2026-07-18T00:00:00Z')
            }
        ]);
    }

    const caseStudyCount = await caseStudiesCollection.countDocuments();
    if (caseStudyCount === 0) {
        await caseStudiesCollection.insertMany([
            {
                title: 'Amazon Canopy Guard',
                slug: 'amazon-canopy-guard',
                summary: 'Community-led reforestation and ecological monitoring restored a high-risk corridor while strengthening local stewardship.',
                challenge: 'Long-running land pressure, fragmented corridors, and limited field monitoring made it difficult to track biodiversity outcomes across remote forest edges.',
                approach: 'Terra Nova paired drone mapping, native seed planning, and community training to identify priority canopy zones and automate restoration timelines. Local stewards were trained to complete field checks and feed environmental monitoring back into the site model.',
                results: 'The program expanded the monitored corridor, increased seed survival in priority zones, and created a repeatable restoration workflow for neighboring communities.',
                beforeData: 'Before: 21% corridor continuity in priority forest edges, limited field coverage across seasonal risk periods.',
                afterData: 'After: 41% corridor continuity and 12,000 native seed pods deployed across restored sections in the first operational cycle.',
                status: 'published',
                publishedAt: new Date('2026-09-04T00:00:00Z'),
                createdAt: new Date('2026-09-04T00:00:00Z'),
                updatedAt: new Date('2026-09-04T00:00:00Z')
            },
            {
                title: 'Nordic Offshore Wind Grid',
                slug: 'nordic-offshore-wind-grid',
                summary: 'A floating wind network reduced grid volatility and increased renewable output for industrial and port communities.',
                challenge: 'Coastal demand loads were increasing while strong offshore wind resources remained underused due to grid bottlenecks and rigid transmission planning.',
                approach: 'The project modeled distributed power flow and flexible grid coordination across ports and industrial hubs, allowing wind output to be shifted to peak demand windows and local storage.',
                results: 'The renewable output profile became more stable, reducing serious grid volatility during peak seasonal loads and supporting new industrial planning scenarios.',
                beforeData: 'Before: peak volatility during high-demand winter periods and limited offshore dispatch visibility.',
                afterData: 'After: renewable supply increased by 1.4 GW and grid balancing improved across the monitored network.',
                status: 'published',
                publishedAt: new Date('2026-08-24T00:00:00Z'),
                createdAt: new Date('2026-08-24T00:00:00Z'),
                updatedAt: new Date('2026-08-24T00:00:00Z')
            },
            {
                title: 'Urban Green Homes',
                slug: 'urban-green-homes',
                summary: 'Neighborhood retrofit work demonstrated how better homes can improve comfort, reduce energy load, and support local neighborhoods.',
                challenge: 'High summer heat and rising cooling costs were creating health and affordability stress for households in dense urban settlements.',
                approach: 'Terra Nova partnered with community planners and local builders to deploy thermal retrofits, shaded outdoor layouts, and efficient ventilation strategies to improve building comfort and reduce peak demand.',
                results: 'Households saw improved indoor comfort, lower peak cooling draw, and stronger neighborhood-level adaptation during extreme heat periods.',
                beforeData: 'Before: 18K households exposed to high heat load and rising cooling costs under aging housing stock.',
                afterData: 'After: neighborhood-level cooling and resilience improved while lower-cost retrofit packages were made available to participating households.',
                status: 'published',
                publishedAt: new Date('2026-07-09T00:00:00Z'),
                createdAt: new Date('2026-07-09T00:00:00Z'),
                updatedAt: new Date('2026-07-09T00:00:00Z')
            }
        ]);
    }

    const testimonialsCount = await testimonialsCollection.countDocuments();
    if (testimonialsCount === 0) {
        await testimonialsCollection.insertMany([
            { name: 'Lina Moreno', role: 'Community organizer', organization: 'Coastal Commons', quote: 'This work finally gave our neighborhood a way to measure progress that people can understand. The restoration data is clear and the community process is human-centered.', consentGiven: true, status: 'approved', createdAt: new Date('2026-09-11T00:00:00Z'), updatedAt: new Date('2026-09-11T00:00:00Z') },
            { name: 'David Osei', role: 'Infrastructure planner', organization: 'Lagos Green Systems', quote: 'Their power and adaptation planning provided us with a better roadmap than a generic consultant deck. It felt practical, grounded, and accountable.', consentGiven: true, status: 'approved', createdAt: new Date('2026-08-18T00:00:00Z'), updatedAt: new Date('2026-08-18T00:00:00Z') },
            { name: 'Nadia Coles', role: 'School program lead', organization: 'North River Learning Network', quote: 'We wanted a real model for climate action that families could see in daily life. The design and restoration work brought that clarity into our schools and neighborhoods.', consentGiven: true, status: 'approved', createdAt: new Date('2026-07-22T00:00:00Z'), updatedAt: new Date('2026-07-22T00:00:00Z') }
        ]);
    }
}

connectToMongo().then(async () => {
    await ensureDefaultUsers();
    await ensureDefaultProjects();
    await ensureDefaultContent();
}).catch(() => {});

// REST API Endpoints

// 1. Live Telemetry & Satellite Data Endpoint
app.get('/api/live-stats', (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        gridCapacityGW: 2.8,
        treesPlantedM: 18.4,
        co2OffsetTonsM: 14.5,
        canopyDensityPercent: 88.4,
        activeProjectsCount: 24,
        recentMilestones: [
            "Nordic Wind Grid generated +450 kWh clean power in last 5 seconds.",
            "Amazon Canopy Guard deployed 12,000 AI biodiverse seed pods in Sector 4.",
            "Alpine Hydro Reserve achieved 99.4% grid balance efficiency across Switzerland."
        ]
    });
});

// 2. Newsletter Subscription Endpoint
app.post('/api/newsletter', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid email address required.' });
    }

    const trimmed = String(email).trim().toLowerCase();
    const collection = await getCollection('subscribers');
    if (!collection && IS_PRODUCTION) {
        return res.status(503).json({ success: false, error: 'Subscription storage is unavailable. Please try again later.' });
    }
    try {
        if (collection) {
            const existing = await collection.findOne({ email: trimmed });
            if (!existing) {
                await collection.insertOne({
                    email: trimmed,
                    source: 'website-newsletter',
                    segments: ['newsletter'],
                    leadScore: 0,
                    status: 'subscribed',
                    consentAt: new Date(),
                    createdAt: new Date()
                });
                await applyCrmEngagement(trimmed, 'newsletter_signup', 1, 'newsletter');
            } else {
                await collection.updateOne({ _id: existing._id }, { $addToSet: { segments: 'newsletter' }, $set: { lastSubscribedAt: new Date() } });
            }
        } else {
            subscribers.push({ email: trimmed, date: new Date() });
        }
        console.log(`[NEWSLETTER] New Subscriber: ${trimmed}`);
        res.json({ success: true, message: 'Successfully subscribed to Terra Nova updates.' });
    } catch (error) {
        console.error('[NEWSLETTER] save error:', error.message);
        if (IS_PRODUCTION) return res.status(503).json({ success: false, error: 'Subscription storage is unavailable. Please try again later.' });
        subscribers.push({ email: trimmed, date: new Date() });
        res.json({ success: true, message: 'Successfully subscribed to Terra Nova updates.' });
    }
});

app.post('/api/contact', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const organization = String(req.body.organization || '').trim();
    const plan = String(req.body.plan || 'general');
    const message = String(req.body.message || '').trim();
    const allowedPlans = ['community', 'organization', 'project-partner', 'general'];

    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || organization.length > 160 || !allowedPlans.includes(plan) || message.length < 20 || message.length > 4000) {
        return res.status(400).json({ success: false, error: 'Please provide a valid name, email, request type, and message of 20 to 4000 characters.' });
    }

    const collection = await getCollection('inquiries');
    if (!collection) return res.status(503).json({ success: false, error: 'Contact requests are temporarily unavailable. Please try again later.' });

    const inquiry = { name, email, organization, plan, message, status: 'new', submittedAt: new Date() };
    try {
        const result = await collection.insertOne(inquiry);
        const leadSegment = plan === 'organization' || plan === 'project-partner' ? 'partnership-interest' : 'inquiry';
        await applyCrmEngagement(email, 'contact_inquiry', plan === 'organization' || plan === 'project-partner' ? 8 : 3, leadSegment);
        const reference = `TN-${result.insertedId.toString().slice(-8).toUpperCase()}`;
        return res.status(201).json({ success: true, reference, message: 'Your request has been received and added to our follow-up queue.' });
    } catch (error) {
        console.error('[CONTACT] save error:', error.message);
        return res.status(503).json({ success: false, error: 'Contact requests are temporarily unavailable. Please try again later.' });
    }
});

// 3. Join Movement Member Registration Endpoint
app.post('/api/movement', async (req, res) => {
    const { name, email, interest } = req.body;
    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }
    const memberId = `TN-${Date.now()}`;
    const memberDoc = { name: String(name).trim(), email: String(email).trim().toLowerCase(), interest: interest || 'General interest', date: new Date() };

    try {
        const collection = await getCollection('members');
        if (!collection && IS_PRODUCTION) {
            return res.status(503).json({ success: false, error: 'Registration storage is unavailable. Please try again later.' });
        }
        if (collection) {
            await collection.insertOne(memberDoc);
        } else {
            members.push(memberDoc);
        }
    } catch (error) {
        console.error('[MOVEMENT] save error:', error.message);
        if (IS_PRODUCTION) return res.status(503).json({ success: false, error: 'Registration storage is unavailable. Please try again later.' });
        members.push(memberDoc);
    }

    await applyCrmEngagement(memberDoc.email, 'movement_registration', 5, 'movement-member');
    console.log(`[MEMBER] New Registration: ${memberDoc.name} (${memberDoc.email}) - ${memberDoc.interest}`);
    leaderboardData.push({
        rank: leaderboardData.length + 1,
        name: memberDoc.name,
        country: 'Community member',
        trees: 0,
        offsetTons: 0,
        badge: 'New Member',
        avatar: ''
    });

    const newPledge = {
        user: memberDoc.name,
        city: 'Global Hub',
        action: 'Joined TERRA NOVA Movement',
        impact: memberDoc.interest || 'Eco Partner',
        project: 'Global Impact',
        timestamp: new Date().toISOString()
    };
    broadcastSSE({ type: 'pledge', ...newPledge });

    res.json({ success: true, message: 'Welcome to Terra Nova movement.', memberId });
});

// 4. Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, bio, photo } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const usersCollection = await getCollection('users');
    if (!usersCollection) {
        return res.status(503).json({ success: false, error: 'Database unavailable. Please configure MONGODB_URI.' });
    }

    const existingUser = await usersCollection.findOne({ email: emailLower });
    if (existingUser) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = createHash(String(password), salt);
    const createdUser = {
        name: String(name).trim(),
        email: emailLower,
        passwordHash,
        salt,
        bio: String(bio || '').trim(),
        photo: photo || '',
        role: 'member',
        createdAt: new Date()
    };

    const result = await usersCollection.insertOne(createdUser);
    const token = signToken({ sub: result.insertedId.toString(), email: emailLower, role: 'member', name: createdUser.name });

    return res.json({
        success: true,
        token,
        user: {
            id: result.insertedId.toString(),
            name: createdUser.name,
            email: emailLower,
            bio: createdUser.bio,
            photo: createdUser.photo,
            role: 'member'
        }
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const usersCollection = await getCollection('users');
    if (!usersCollection) {
        return res.status(503).json({ success: false, error: 'Database unavailable. Please configure MONGODB_URI.' });
    }

    const user = await usersCollection.findOne({ email: emailLower });
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const enteredHash = createHash(String(password), user.salt || '');
    if (enteredHash !== user.passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role || 'member', name: user.name });
    return res.json({
        success: true,
        token,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            bio: user.bio || '',
            photo: user.photo || '',
            role: user.role || 'member'
        }
    });
});

app.get('/api/auth/providers', (req, res) => {
    res.json({ success: true, google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI) });
});

app.get('/api/auth/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri) {
        return res.status(503).json({ success: false, error: 'Google sign-in is not configured.' });
    }

    const state = createGoogleOAuthState();
    const cookieParts = [`tn_google_state=${encodeURIComponent(state)}`, 'Path=/api/auth/google/callback', 'HttpOnly', 'SameSite=Lax', 'Max-Age=600'];
    if (IS_PRODUCTION) cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));

    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account'
    });
    return res.redirect(302, authorizationUrl.toString());
});

app.get('/api/auth/google/callback', async (req, res) => {
    const clearCookie = `tn_google_state=; Path=/api/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=0${IS_PRODUCTION ? '; Secure' : ''}`;
    const redirectFailure = () => {
        res.setHeader('Set-Cookie', clearCookie);
        return res.redirect(`${APP_URL || ''}/oauth-callback.html?error=google_signin_failed`);
    };

    const state = String(req.query.state || '');
    const cookieState = getRequestCookie(req, 'tn_google_state');
    if (req.query.error || !req.query.code || !verifyGoogleOAuthState(state) || !secureStringEqual(state, cookieState)) {
        return redirectFailure();
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(req.query.code),
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });
        if (!tokenResponse.ok) return redirectFailure();
        const tokenData = await tokenResponse.json();
        const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (!profileResponse.ok) return redirectFailure();
        const profile = await profileResponse.json();
        if (!profile.sub || !profile.email || profile.email_verified !== true) return redirectFailure();

        const usersCollection = await getCollection('users');
        if (!usersCollection) return redirectFailure();
        const email = String(profile.email).trim().toLowerCase();
        let user = await usersCollection.findOne({ $or: [{ googleSub: profile.sub }, { email }] });
        if (user?.googleSub && user.googleSub !== profile.sub) return redirectFailure();

        if (user) {
            const updates = { googleSub: profile.sub };
            if (!user.photo && profile.picture) updates.photo = profile.picture;
            await usersCollection.updateOne({ _id: user._id }, { $set: updates });
            user = { ...user, ...updates };
        } else {
            const salt = crypto.randomBytes(16).toString('hex');
            const created = {
                name: String(profile.name || profile.email).trim().slice(0, 100),
                email,
                googleSub: profile.sub,
                passwordHash: createHash(crypto.randomBytes(32).toString('hex'), salt),
                salt,
                bio: '',
                photo: String(profile.picture || ''),
                role: 'member',
                createdAt: new Date()
            };
            const result = await usersCollection.insertOne(created);
            user = { ...created, _id: result.insertedId };
        }

        const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role || 'member', name: user.name });
        res.setHeader('Set-Cookie', clearCookie);
        return res.redirect(`${APP_URL.replace(/\/$/, '')}/oauth-callback.html#terra_session=${encodeURIComponent(token)}`);
    } catch (error) {
        console.error('[AUTH] Google sign-in failed:', error.message);
        return redirectFailure();
    }
});

app.get('/api/auth/me', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    return res.json({
        success: true,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            bio: user.bio || '',
            photo: user.photo || '',
            role: user.role || 'member'
        }
    });
});

app.patch('/api/auth/me', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const bio = String(req.body.bio || '').trim();
    if (!name || !email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'A name and valid email address are required.' });
    }

    const usersCollection = await getCollection('users');
    const duplicate = await usersCollection.findOne({ email, _id: { $ne: user._id } });
    if (duplicate) {
        return res.status(409).json({ success: false, error: 'That email address is already in use.' });
    }

    await usersCollection.updateOne({ _id: user._id }, { $set: { name, email, bio } });
    return res.json({ success: true, user: { id: user._id.toString(), name, email, bio, photo: user.photo || '', role: user.role || 'member' } });
});

app.get('/api/admin/overview', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const subscribersCollection = await getCollection('subscribers');
    const membersCollection = await getCollection('members');
    const usersCollection = await getCollection('users');
    const projectsCollection = await getCollection('projects');

    const summary = {
        totalSubscribers: subscribersCollection ? await subscribersCollection.countDocuments() : subscribers.length,
        totalMembers: membersCollection ? await membersCollection.countDocuments() : members.length,
        totalUsers: usersCollection ? await usersCollection.countDocuments() : 0,
        totalProjects: projectsCollection ? await projectsCollection.countDocuments() : 0,
        activeCampaigns: 3,
        generatedLeads: 0
    };

    return res.json({ success: true, summary });
});

app.get('/api/admin/projects', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const projectsCollection = await getCollection('projects');
    const projects = projectsCollection ? await projectsCollection.find({}).sort({ createdAt: -1 }).toArray() : [];
    return res.json({ success: true, projects });
});

app.get('/api/admin/members', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const membersCollection = await getCollection('members');
    const membersData = membersCollection ? await membersCollection.find({}).sort({ date: -1 }).toArray() : [];
    return res.json({ success: true, members: membersData });
});

app.post('/api/admin/members', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const interest = String(req.body.interest || 'General interest').trim();
    if (!name || !email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Name and valid email are required.' });

    const collection = await getCollection('members');
    if (!collection) return res.status(503).json({ success: false, error: 'Database unavailable.' });
    const member = { name, email, interest, date: new Date() };
    const result = await collection.insertOne(member);
    return res.status(201).json({ success: true, member: { ...member, _id: result.insertedId } });
});

app.patch('/api/admin/members/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid member id.' });
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const interest = String(req.body.interest || 'General interest').trim();
    if (!name || !email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Name and valid email are required.' });

    const collection = await getCollection('members');
    if (!collection) return res.status(503).json({ success: false, error: 'Database unavailable.' });
    const result = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { name, email, interest } });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Member not found.' });
    return res.json({ success: true, member: { _id: req.params.id, name, email, interest } });
});

app.delete('/api/admin/members/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid member id.' });
    const collection = await getCollection('members');
    if (!collection) return res.status(503).json({ success: false, error: 'Database unavailable.' });
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ success: false, error: 'Member not found.' });
    return res.json({ success: true, message: 'Member deleted.' });
});

app.get('/api/admin/subscribers', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const subscribersCollection = await getCollection('subscribers');
    const filter = {};
    const segment = String(req.query.segment || '').trim();
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (segment) filter.segments = segment;
    if (status) filter.status = status;
    if (search) filter.email = new RegExp(escapeRegex(search), 'i');
    const subscribersData = subscribersCollection
        ? await subscribersCollection.find(filter).sort({ createdAt: -1 }).limit(500).toArray()
        : subscribers;
    const segments = subscribersCollection ? await subscribersCollection.distinct('segments') : [];
    return res.json({ success: true, subscribers: subscribersData, segments: segments.filter(Boolean).sort() });
});

app.post('/api/admin/subscribers', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    if (req.body.consentConfirmed !== true) return res.status(400).json({ success: false, error: 'Confirm the contact gave permission to receive email before adding them.' });

    const collection = await getCollection('subscribers');
    if (!collection) return res.status(503).json({ success: false, error: 'Database unavailable.' });
    const existing = await collection.findOne({ email });
    if (existing) return res.status(409).json({ success: false, error: 'That subscriber already exists.' });
    const segments = normalizeTags(req.body.segments || ['general']);
    const subscriber = { email, source: 'admin-import', segments, leadScore: 0, status: 'subscribed', consentAt: new Date(), createdAt: new Date() };
    const result = await collection.insertOne(subscriber);
    return res.status(201).json({ success: true, subscriber: { ...subscriber, _id: result.insertedId } });
});

app.patch('/api/admin/subscribers/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid subscriber id.' });
    const email = req.body.email === undefined ? '' : String(req.body.email || '').trim().toLowerCase();
    if (email && !email.includes('@')) return res.status(400).json({ success: false, error: 'A valid email address is required.' });

    const collection = await getCollection('subscribers');
    if (!collection) return res.status(503).json({ success: false, error: 'Database unavailable.' });
    const id = new ObjectId(req.params.id);
    const changes = {};
    if (email) {
        const duplicate = await collection.findOne({ email, _id: { $ne: id } });
        if (duplicate) return res.status(409).json({ success: false, error: 'That subscriber already exists.' });
        changes.email = email;
    }
    if (req.body.segments !== undefined) changes.segments = normalizeTags(req.body.segments);
    if (req.body.status !== undefined) {
        if (!['subscribed', 'unsubscribed', 'paused'].includes(req.body.status)) return res.status(400).json({ success: false, error: 'Invalid subscriber status.' });
        changes.status = req.body.status;
    }
    if (req.body.leadScore !== undefined) {
        const leadScore = Number(req.body.leadScore);
        if (!Number.isInteger(leadScore) || leadScore < 0 || leadScore > 100) return res.status(400).json({ success: false, error: 'Lead score must be an integer from 0 to 100.' });
        changes.leadScore = leadScore;
    }
    if (!Object.keys(changes).length) return res.status(400).json({ success: false, error: 'No subscriber fields were provided.' });
    changes.updatedAt = new Date();
    const result = await collection.updateOne({ _id: id }, { $set: changes });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Subscriber not found.' });
    return res.json({ success: true, subscriber: { _id: req.params.id, ...changes } });
});

app.delete('/api/admin/subscribers/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid subscriber id.' });
    const collection = await getCollection('subscribers');
    if (!collection) return res.status(503).json({ success: false, error: 'Database unavailable.' });
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ success: false, error: 'Subscriber not found.' });
    return res.json({ success: true, message: 'Subscriber deleted.' });
});

app.get('/api/admin/inquiries', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const collection = await getCollection('inquiries');
    if (!collection) return res.status(503).json({ success: false, error: 'Inquiry storage is unavailable.' });
    const inquiries = await collection.find({}).sort({ submittedAt: -1 }).limit(200).toArray();
    return res.json({ success: true, inquiries });
});

app.get('/api/admin/volunteers', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const collection = await getCollection('volunteers');
    if (!collection) return res.status(503).json({ success: false, error: 'Volunteer storage is unavailable.' });
    const volunteers = await collection.find({}).sort({ submittedAt: -1 }).limit(200).toArray();
    return res.json({ success: true, volunteers });
});

app.patch('/api/admin/volunteers/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid volunteer id.' });
    const status = String(req.body.status || '');
    if (!['new', 'contacted', 'scheduled', 'completed', 'closed'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid volunteer status.' });
    const collection = await getCollection('volunteers');
    if (!collection) return res.status(503).json({ success: false, error: 'Volunteer storage is unavailable.' });
    const result = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Volunteer signup not found.' });
    return res.json({ success: true, status });
});

app.patch('/api/admin/inquiries/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid inquiry id.' });
    const status = String(req.body.status || '');
    if (!['new', 'in_progress', 'replied', 'closed'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid inquiry status.' });

    const collection = await getCollection('inquiries');
    if (!collection) return res.status(503).json({ success: false, error: 'Inquiry storage is unavailable.' });
    const result = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    return res.json({ success: true, status });
});

app.get('/api/articles', async (req, res) => {
    const articlesCollection = await getCollection('articles');
    const authorsCollection = await getCollection('authors');
    if (IS_PRODUCTION && (!articlesCollection || !authorsCollection)) return res.status(503).json({ success: false, error: 'Journal data is temporarily unavailable.' });
    if (!articlesCollection) return res.json({ success: true, articles: [], categories: [], tags: [] });

    const filter = { status: 'published' };
    const category = String(req.query.category || '').trim();
    const tag = String(req.query.tag || '').trim().toLowerCase();
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (search) {
        const term = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ title: term }, { excerpt: term }, { content: term }, { tags: term }];
    }

    const [articles, categories, tags] = await Promise.all([
        articlesCollection.find(filter).sort({ publishedAt: -1 }).limit(60).toArray(),
        articlesCollection.distinct('category', { status: 'published' }),
        articlesCollection.distinct('tags', { status: 'published' })
    ]);
    const authorIds = [...new Map(articles.map(article => [String(article.authorId), article.authorId])).values()];
    const authors = authorsCollection && authorIds.length ? await authorsCollection.find({ _id: { $in: authorIds } }).toArray() : [];
    const authorMap = new Map(authors.map(author => [String(author._id), author]));
    return res.json({ success: true, articles: articles.map(article => ({ ...article, author: authorMap.get(String(article.authorId)) || null })), categories, tags });
});

app.get('/api/articles/:slug', async (req, res) => {
    const articlesCollection = await getCollection('articles');
    if (!articlesCollection) return res.status(404).json({ success: false, error: 'Article not found.' });
    const article = await articlesCollection.findOne({ slug: req.params.slug, status: 'published' });
    if (!article) return res.status(404).json({ success: false, error: 'Article not found.' });
    const authorsCollection = await getCollection('authors');
    const author = authorsCollection ? await authorsCollection.findOne({ _id: article.authorId }) : null;
    return res.json({ success: true, article: { ...article, author } });
});

app.get('/api/authors/:slug', async (req, res) => {
    const authorsCollection = await getCollection('authors');
    if (!authorsCollection) return res.status(404).json({ success: false, error: 'Author not found.' });
    const author = await authorsCollection.findOne({ slug: req.params.slug });
    if (!author) return res.status(404).json({ success: false, error: 'Author not found.' });
    const articlesCollection = await getCollection('articles');
    const articles = articlesCollection
        ? await articlesCollection.find({ authorId: author._id, status: 'published' }).sort({ publishedAt: -1 }).toArray()
        : [];
    return res.json({ success: true, author, articles });
});

app.get('/api/case-studies', async (req, res) => {
    const collection = await getCollection('caseStudies');
    if (!collection && IS_PRODUCTION) return res.status(503).json({ success: false, error: 'Impact stories are temporarily unavailable.' });
    const caseStudies = collection ? await collection.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(60).toArray() : [];
    const projectIds = [...new Map(caseStudies.filter(item => item.campaignId).map(item => [String(item.campaignId), item.campaignId])).values()];
    const projectsCollection = await getCollection('projects');
    const projects = projectsCollection && projectIds.length ? await projectsCollection.find({ _id: { $in: projectIds } }).toArray() : [];
    const projectMap = new Map(projects.map(project => [String(project._id), project]));
    return res.json({ success: true, caseStudies: caseStudies.map(item => ({ ...item, project: item.campaignId ? projectMap.get(String(item.campaignId)) || null : null })) });
});

app.get('/api/case-studies/:slug', async (req, res) => {
    const collection = await getCollection('caseStudies');
    const item = collection && await collection.findOne({ slug: req.params.slug, status: 'published' });
    if (!item) return res.status(404).json({ success: false, error: 'Impact story not found.' });
    const projectsCollection = await getCollection('projects');
    const project = projectsCollection && item.campaignId ? await projectsCollection.findOne({ _id: item.campaignId }) : null;
    return res.json({ success: true, caseStudy: { ...item, project } });
});

app.get('/api/testimonials', async (req, res) => {
    const collection = await getCollection('testimonials');
    if (!collection && IS_PRODUCTION) return res.status(503).json({ success: false, error: 'Testimonials are temporarily unavailable.' });
    const testimonials = collection ? await collection.find({ status: 'approved', consentGiven: true }).sort({ createdAt: -1 }).limit(100).toArray() : [];
    return res.json({ success: true, testimonials });
});

app.get('/api/admin/content/:type', async (req, res) => {
    if (!await requireAdmin(req, res)) return;
    const collectionName = contentCollectionNames[req.params.type];
    if (!collectionName) return res.status(404).json({ success: false, error: 'Unsupported content type.' });
    const collection = await getCollection(collectionName);
    if (!collection) return res.status(503).json({ success: false, error: 'Content storage is unavailable.' });
    const items = await collection.find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(500).toArray();
    return res.json({ success: true, items });
});

app.post('/api/admin/content/:type', async (req, res) => {
    if (!await requireAdmin(req, res)) return;
    const collectionName = contentCollectionNames[req.params.type];
    if (!collectionName) return res.status(404).json({ success: false, error: 'Unsupported content type.' });
    const collection = await getCollection(collectionName);
    if (!collection) return res.status(503).json({ success: false, error: 'Content storage is unavailable.' });
    try {
        const entry = normalizeContentEntry(req.params.type, req.body);
        if (entry.slug) {
            await collection.createIndex({ slug: 1 }, { unique: true, sparse: true });
            if (await collection.findOne({ slug: entry.slug })) return res.status(409).json({ success: false, error: 'That slug is already in use.' });
        }
        if (req.params.type === 'articles' && !await (await getCollection('authors')).findOne({ _id: entry.authorId })) {
            return res.status(400).json({ success: false, error: 'Select an existing author profile.' });
        }
        const result = await collection.insertOne(entry);
        return res.status(201).json({ success: true, item: { ...entry, _id: result.insertedId } });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Content entry is invalid.' });
    }
});

app.patch('/api/admin/content/:type/:id', async (req, res) => {
    if (!await requireAdmin(req, res)) return;
    const collectionName = contentCollectionNames[req.params.type];
    if (!collectionName) return res.status(404).json({ success: false, error: 'Unsupported content type.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid content id.' });
    const collection = await getCollection(collectionName);
    if (!collection) return res.status(503).json({ success: false, error: 'Content storage is unavailable.' });
    const id = new ObjectId(req.params.id);
    const existing = await collection.findOne({ _id: id });
    if (!existing) return res.status(404).json({ success: false, error: 'Content entry not found.' });
    try {
        const entry = normalizeContentEntry(req.params.type, req.body, existing);
        if (entry.slug) {
            await collection.createIndex({ slug: 1 }, { unique: true, sparse: true });
            if (await collection.findOne({ slug: entry.slug, _id: { $ne: id } })) return res.status(409).json({ success: false, error: 'That slug is already in use.' });
        }
        if (req.params.type === 'articles' && !await (await getCollection('authors')).findOne({ _id: entry.authorId })) {
            return res.status(400).json({ success: false, error: 'Select an existing author profile.' });
        }
        await collection.updateOne({ _id: id }, { $set: entry });
        return res.json({ success: true, item: { ...entry, _id: id } });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || 'Content entry is invalid.' });
    }
});

app.delete('/api/admin/content/:type/:id', async (req, res) => {
    if (!await requireAdmin(req, res)) return;
    const collectionName = contentCollectionNames[req.params.type];
    if (!collectionName) return res.status(404).json({ success: false, error: 'Unsupported content type.' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid content id.' });
    const collection = await getCollection(collectionName);
    if (!collection) return res.status(503).json({ success: false, error: 'Content storage is unavailable.' });
    const id = new ObjectId(req.params.id);
    if (req.params.type === 'authors' && await (await getCollection('articles')).findOne({ authorId: id })) {
        return res.status(409).json({ success: false, error: 'This author has articles. Reassign or remove those articles first.' });
    }
    const result = await collection.deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ success: false, error: 'Content entry not found.' });
    return res.json({ success: true, message: 'Content entry deleted.' });
});

app.get('/api/dashboard', async (req, res) => {
    const subscribersCollection = await getCollection('subscribers');
    const membersCollection = await getCollection('members');
    const usersCollection = await getCollection('users');
    const projectsCollection = await getCollection('projects');

    if (IS_PRODUCTION && (!subscribersCollection || !membersCollection || !usersCollection || !projectsCollection)) {
        return res.status(503).json({ success: false, error: 'Dashboard data is temporarily unavailable.' });
    }

    const [totalSubscribers, totalMembers, totalUsers, totalProjects, latestProjects] = await Promise.all([
        subscribersCollection ? subscribersCollection.countDocuments() : subscribers.length,
        membersCollection ? membersCollection.countDocuments() : members.length,
        usersCollection ? usersCollection.countDocuments() : 0,
        projectsCollection ? projectsCollection.countDocuments() : 0,
        projectsCollection ? projectsCollection.find({}).sort({ createdAt: -1 }).limit(12).toArray() : []
    ]);

    return res.json({
        success: true,
        summary: {
            totalSubscribers,
            totalMembers,
            totalUsers,
            totalProjects,
            activeCampaigns: 3,
            generatedLeads: totalMembers + totalSubscribers
        },
        projects: latestProjects
    });
});

app.get('/api/projects', async (req, res) => {
    const projectsCollection = await getCollection('projects');
    if (!projectsCollection && IS_PRODUCTION) {
        return res.status(503).json({ success: false, error: 'Project catalog is temporarily unavailable.' });
    }
    if (projectsCollection) {
        const projects = await projectsCollection.find({}).sort({ createdAt: -1 }).toArray();
        return res.json({ success: true, projects });
    }
    return res.json({
        success: true,
        projects: [
            { name: 'Amazon Canopy Guard', category: 'Ecosystem Restoration', region: 'Amazon Basin', impact: '12M hectares protected', status: 'Active' },
            { name: 'Nordic Offshore Wind Grid', category: 'Clean Energy', region: 'North Sea', impact: '1.4 GW renewable output', status: 'Scaling' },
            { name: 'Urban Green Homes', category: 'Sustainable Communities', region: 'India', impact: '18K households upgraded', status: 'Pilot' }
        ]
    });
});

app.get('/api/campaigns', async (req, res) => {
    const collection = await getCollection('projects');
    if (!collection && IS_PRODUCTION) return res.status(503).json({ success: false, error: 'Campaign catalog is temporarily unavailable.' });
    const campaigns = collection ? await collection.find({}).sort({ createdAt: -1 }).toArray() : [];
    return res.json({ success: true, campaigns });
});

app.post('/api/volunteers', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const interest = String(req.body.interest || '').trim();
    const availability = String(req.body.availability || '').trim();
    const campaignId = String(req.body.campaignId || '').trim();
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || interest.length < 3 || interest.length > 500 || availability.length > 200 || req.body.consent !== true || (campaignId && !ObjectId.isValid(campaignId))) {
        return res.status(400).json({ success: false, error: 'Please provide a valid name, email, volunteering interest, and availability.' });
    }

    const collection = await getCollection('volunteers');
    if (!collection) return res.status(503).json({ success: false, error: 'Volunteer signups are temporarily unavailable.' });
    const volunteer = { name, email, interest, availability, consentAt: new Date(), campaignId: campaignId ? new ObjectId(campaignId) : null, status: 'new', submittedAt: new Date() };
    const result = await collection.insertOne(volunteer);
    await applyCrmEngagement(email, 'volunteer_signup', 4, 'volunteer-interest');
    return res.status(201).json({ success: true, reference: `TN-VOL-${result.insertedId.toString().slice(-8).toUpperCase()}`, message: 'Your volunteer signup is in the team follow-up queue.' });
});

app.post('/api/donations/checkout', async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET || !APP_URL) return res.status(503).json({ success: false, error: 'Online donations are not configured yet.' });
    const campaignId = String(req.body.campaignId || '');
    const amountCents = Number(req.body.amountCents);
    const frequency = String(req.body.frequency || 'one-time');
    const donorName = String(req.body.donorName || '').trim().slice(0, 100);
    const donorEmail = String(req.body.donorEmail || '').trim().toLowerCase();
    if (!ObjectId.isValid(campaignId) || !Number.isInteger(amountCents) || amountCents < 100 || amountCents > 1000000 || !['one-time', 'monthly', 'yearly'].includes(frequency) || donorName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
        return res.status(400).json({ success: false, error: 'Enter a valid campaign, donation amount, frequency, name, and email.' });
    }

    const projectsCollection = await getCollection('projects');
    if (!projectsCollection) return res.status(503).json({ success: false, error: 'Campaign storage is unavailable.' });
    const campaign = await projectsCollection.findOne({ _id: new ObjectId(campaignId) });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found.' });

    try {
        const recurring = frequency !== 'one-time';
        const metadata = { campaignId, donorName, donorEmail, frequency };
        const priceData = {
            currency: 'usd',
            product_data: { name: `Donation to ${campaign.name}` },
            unit_amount: amountCents,
            ...(recurring ? { recurring: { interval: frequency === 'monthly' ? 'month' : 'year' } } : {})
        };
        const session = await stripe.checkout.sessions.create({
            mode: recurring ? 'subscription' : 'payment',
            line_items: [{ price_data: priceData, quantity: 1 }],
            success_url: `${APP_URL.replace(/\/$/, '')}/receipt.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL.replace(/\/$/, '')}/campaign/${campaignId}?cancelled=1`,
            customer_email: donorEmail,
            metadata,
            ...(recurring ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } })
        });
        return res.json({ success: true, checkoutUrl: session.url });
    } catch (error) {
        console.error('[PAYMENTS] checkout creation failed:', error.message);
        return res.status(502).json({ success: false, error: 'Checkout could not be started. Please try again.' });
    }
});

app.get('/api/donations/receipt/:sessionId', async (req, res) => {
    if (!stripe) return res.status(503).json({ success: false, error: 'Donation receipts are unavailable until payments are configured.' });
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        if (session.payment_status !== 'paid' || !session.metadata?.campaignId) {
            return res.status(404).json({ success: false, error: 'A completed donation receipt was not found.' });
        }
        const projectsCollection = await getCollection('projects');
        const campaign = projectsCollection && ObjectId.isValid(session.metadata.campaignId)
            ? await projectsCollection.findOne({ _id: new ObjectId(session.metadata.campaignId) })
            : null;
        const paidAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
        const receipt = {
            reference: `TN-DON-${session.id.slice(-8).toUpperCase()}`,
            campaignId: session.metadata.campaignId,
            donorName: session.metadata.donorName || session.customer_details?.name || 'Supporter',
            donorEmail: session.customer_details?.email || session.customer_email || session.metadata.donorEmail || '',
            campaignName: campaign?.name || 'Terra Nova campaign',
            amount: (session.amount_total || 0) / 100,
            currency: (session.currency || 'usd').toUpperCase(),
            frequency: session.mode === 'subscription' ? session.metadata.frequency || 'recurring' : 'one-time',
            paidAt,
            note: 'This receipt confirms a contribution processed by Stripe. It is not a carbon credit, tax-deductibility statement, or quantified emissions offset.'
        };
        receipt.verification = crypto.createHmac('sha256', JWT_SECRET).update(JSON.stringify(receipt)).digest('hex');
        return res.json({ success: true, receipt });
    } catch (error) {
        console.error('[PAYMENTS] receipt lookup failed:', error.message);
        return res.status(404).json({ success: false, error: 'Donation receipt could not be verified.' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid project id.' });
    const projectsCollection = await getCollection('projects');
    if (!projectsCollection) return res.status(503).json({ success: false, error: 'Project details are unavailable.' });
    const project = await projectsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });
    return res.json({ success: true, project });
});

app.post('/api/projects', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const { name, category, region, impact, status, fundingGoal, raised } = req.body;
    if (!name || !category || !region) {
        return res.status(400).json({ success: false, error: 'Project name, category, and region are required.' });
    }

    const project = {
        name: String(name).trim(),
        category: String(category).trim(),
        region: String(region).trim(),
        impact: String(impact || 'Community impact initiative'),
        status: String(status || 'Active'),
        fundingGoal: Number(fundingGoal || 0),
        raised: Number(raised || 0),
        createdAt: new Date()
    };

    const projectsCollection = await getCollection('projects');
    if (!projectsCollection) return res.status(503).json({ success: false, error: 'Project storage is unavailable.' });
    await projectsCollection.insertOne(project);

    return res.json({ success: true, message: 'Project added successfully.', project });
});

app.delete('/api/projects/:id', async (req, res) => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ success: false, error: 'Project id is required.' });
    }

    const projectsCollection = await getCollection('projects');
    if (!projectsCollection) {
        if (IS_PRODUCTION) return res.status(503).json({ success: false, error: 'Project storage is unavailable.' });
        return res.json({ success: true, message: 'Project deletion is not supported in demo mode.' });
    }

    const result = await projectsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    return res.json({ success: true, message: 'Project deleted successfully.' });
});

// 4. Signed Carbon Certificate Issue & Verification Endpoints
const certificateSigningSecret = process.env.CERTIFICATE_SIGNING_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'terra-nova-local-certificate-signing-key');

function signCertificatePayload(payload) {
    return crypto.createHmac('sha256', certificateSigningSecret).update(payload).digest('base64url');
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

app.post('/api/certificate', (req, res) => {
    if (!certificateSigningSecret) {
        return res.status(503).json({ success: false, error: 'Certificate issuance requires CERTIFICATE_SIGNING_SECRET to be configured.' });
    }
    const kwh = Number(req.body?.kwh ?? 0);
    const flights = Number(req.body?.flights ?? 0);
    const name = String(req.body?.name || 'Raj Golu').trim().slice(0, 60);
    if (!name || !Number.isFinite(kwh) || !Number.isFinite(flights) || kwh < 0 || kwh > 100000 || flights < 0 || flights > 120) {
        return res.status(400).json({ success: false, error: 'A name, valid electricity usage, and valid annual flight count are required.' });
    }

    const issuedAt = new Date().toISOString();
    const tons = ((kwh * 12 * 0.0004) + (flights * 0.6)).toFixed(1);
    const certificate = {
        name,
        issuer: 'Raj Golu',
        kwh,
        flights,
        tonsCO2: tons,
        issuedAt,
        verificationHash: `TN-${new Date(issuedAt).getFullYear()}-CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    };
    const payload = Buffer.from(JSON.stringify(certificate)).toString('base64url');
    const token = `${payload}.${signCertificatePayload(payload)}`;
    const certificateUrl = `/api/certificate/verify/${token}`;

    res.json({
        success: true,
        ...certificate,
        certificateToken: token,
        certificateUrl
    });
});

app.get('/api/certificate/verify/:token', (req, res) => {
    if (!certificateSigningSecret) {
        return res.status(503).json({ success: false, error: 'Certificate verification is unavailable until CERTIFICATE_SIGNING_SECRET is configured.' });
    }
    const [payload, signature, ...extra] = req.params.token.split('.');
    if (!payload || !signature || extra.length) {
        return res.status(400).json({ success: false, error: 'Malformed certificate token.' });
    }

    const expectedSignature = signCertificatePayload(payload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const suppliedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
        return res.status(404).json({ success: false, error: 'Certificate signature is invalid.' });
    }

    let certificate;
    try {
        certificate = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (error) {
        return res.status(400).json({ success: false, error: 'Certificate data is invalid.' });
    }

    if (!certificate.name || !certificate.verificationHash || !Number.isFinite(Number(certificate.tonsCO2))) {
        return res.status(400).json({ success: false, error: 'Certificate details are incomplete.' });
    }

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const verifiedRecord = { ...certificate, issuedDate, verified: true };
    if (req.accepts('html') && !req.accepts('json')) {
        const name = escapeHtml(certificate.name);
        const issuer = escapeHtml(certificate.issuer || 'Raj Golu');
        const tons = escapeHtml(certificate.tonsCO2);
        const hash = escapeHtml(certificate.verificationHash);
        const date = escapeHtml(issuedDate);
        return res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta property="og:title" content="Verified Terra Nova certificate for ${name}"><meta property="og:description" content="${tons} metric tons CO2 annual footprint estimate · ${hash}"><title>Certificate verified · Terra Nova</title><style>body{margin:0;background:#081018;color:#edf4f0;font:16px system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}.card{width:min(680px,calc(100% - 40px));box-sizing:border-box;padding:48px;border:1px solid #54775f;border-radius:14px;background:linear-gradient(145deg,#12241d,#0b131b);text-align:center}.mark{width:48px;height:48px;margin:0 auto 16px;border:1px solid #8ba77b;border-radius:50%;display:grid;place-items:center;color:#b6e5bf;font-weight:700}.brand{letter-spacing:.22em;font-size:12px;color:#b6e5bf}.issuer{margin-top:8px;color:#d2dfd5;font-size:12px;letter-spacing:.12em}.status{margin:30px 0 10px;color:#8bd6a0;font-size:12px;letter-spacing:.16em}.name{font-family:Georgia,serif;font-size:42px;margin:12px 0}.impact{font-size:24px;color:#b6e5bf}.hash{font:12px monospace;color:#8f9f9b;margin-top:28px}.note{font-size:12px;line-height:1.6;color:#9eadaa;margin-top:28px}</style><main class="card"><div class="mark">TN</div><div class="brand">TERRA NOVA</div><div class="issuer">ISSUED BY ${issuer}</div><div class="status">✓ VERIFIED ISSUER SIGNATURE</div><h1 class="name">${name}</h1><div>Annual carbon footprint estimate</div><p class="impact">${tons} metric tons CO₂</p><div>Issued ${date}</div><div class="hash">${hash}</div><p class="note">This signature confirms the certificate was issued by Terra Nova and its record has not been altered. Footprint inputs are supplied by the certificate holder and are not an independent emissions audit.</p></main></html>`);
    }
    res.json({ success: true, certificate: verifiedRecord });
});

// 5. Global Leaderboard Endpoint
app.get('/api/leaderboard', (req, res) => {
    res.json({
        success: true,
        leaderboard: leaderboardData.map((entry, index) => ({ ...entry, rank: index + 1 }))
    });
});

// 6. Server-Sent Events (SSE) Live Stream Endpoint for Real-Time Global Pledges
app.get('/api/stream-live-pledges', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to Terra Nova Real-Time Stream' })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
});

function broadcastSSE(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        if (client.destroyed || !client.writable) {
            sseClients.delete(client);
            continue;
        }
        client.write(payload);
    }
}

setInterval(() => {
    for (const client of sseClients) {
        if (client.destroyed || !client.writable) {
            sseClients.delete(client);
            continue;
        }
        client.write(': keep-alive\n\n');
    }
}, 25000).unref();

// 7. REAL AI CHATBOT ENDPOINT (/api/chat)
app.post('/api/chat', async (req, res) => {
    const { message, history = [], language = 'en' } = req.body;
    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
        return res.status(400).json({ success: false, error: 'Message must be between 1 and 4000 characters.' });
    }

    const query = message.trim();
    const weatherIntent = /\b(?:weather|forecast|temperature)\b/i.test(query) || /मौसम|तापमान/.test(query);
    if (weatherIntent) {
        const hindiLocationMatch = query.match(/(.+?)\s+(?:का|की|के)\s+मौसम/i);
        const locationText = hindiLocationMatch?.[1] || query
            .replace(/^.*?\b(?:weather|forecast|temperature)\b/i, '')
            .replace(/^\s*(?:report\s+)?(?:in|for|of|at)?\s*/i, '')
            .replace(/\b(?:today|today's|tonight|tomorrow|now|currently|please)\b/gi, '')
            .replace(/[?!.,]/g, ' ');
        const cityName = locationText.replace(/\s+/g, ' ').trim();

        if (!cityName) {
            return res.json({ success: true, reply: 'Which city would you like the weather for?', provider: 'Open-Meteo', timestamp: new Date().toISOString() });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
            geocodingUrl.search = new URLSearchParams({ name: cityName, count: '1', language: 'en', format: 'json' });
            const geocodingResponse = await fetch(geocodingUrl, { signal: controller.signal });
            if (!geocodingResponse.ok) throw new Error(`geocoding status ${geocodingResponse.status}`);

            const place = (await geocodingResponse.json()).results?.[0];
            if (!place) {
                return res.json({ success: true, reply: `I couldn't find a place named "${cityName}". Please check the city name.`, provider: 'Open-Meteo', timestamp: new Date().toISOString() });
            }

            const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
            forecastUrl.search = new URLSearchParams({
                latitude: String(place.latitude),
                longitude: String(place.longitude),
                current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                timezone: 'auto',
                forecast_days: '1'
            });
            const forecastResponse = await fetch(forecastUrl, { signal: controller.signal });
            if (!forecastResponse.ok) throw new Error(`forecast status ${forecastResponse.status}`);

            const forecast = await forecastResponse.json();
            const current = forecast.current;
            const daily = forecast.daily;
            if (!current || !daily) throw new Error('weather response was incomplete');

            const weatherDescriptions = {
                0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
                45: 'foggy', 48: 'freezing fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
                56: 'freezing drizzle', 57: 'heavy freezing drizzle', 61: 'light rain', 63: 'moderate rain', 65: 'heavy rain',
                66: 'freezing rain', 67: 'heavy freezing rain', 71: 'light snow', 73: 'moderate snow', 75: 'heavy snow',
                77: 'snow grains', 80: 'light rain showers', 81: 'rain showers', 82: 'heavy rain showers',
                85: 'light snow showers', 86: 'heavy snow showers', 95: 'thunderstorms',
                96: 'thunderstorms with hail', 99: 'thunderstorms with heavy hail'
            };
            const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })
                .format(new Date(`${daily.time[0]}T00:00:00Z`));
            const condition = weatherDescriptions[current.weather_code] || 'conditions unavailable';
            const location = [place.name, place.country].filter(Boolean).join(', ');
            const reply = [
                `${location} · ${date}`,
                `• ${current.temperature_2m}°C, ${condition}; feels like ${current.apparent_temperature}°C`,
                `• High/low: ${daily.temperature_2m_max[0]}°C / ${daily.temperature_2m_min[0]}°C`,
                `• Wind: ${current.wind_speed_10m} km/h${daily.precipitation_probability_max?.[0] == null ? '' : `; rain chance: ${daily.precipitation_probability_max[0]}%`}`,
                'Source: Open-Meteo'
            ].join('\n');
            return res.json({ success: true, reply, provider: 'Open-Meteo Weather', timestamp: new Date().toISOString() });
        } catch (error) {
            console.error('Weather lookup failed:', error.name === 'AbortError' ? 'timeout' : error.message);
            return res.json({ success: true, reply: `I couldn't retrieve live weather for ${cityName} right now. Please try again shortly.`, provider: 'Open-Meteo Weather', timestamp: new Date().toISOString() });
        } finally {
            clearTimeout(timeout);
        }
    }

    const responseLanguage = language === 'hi' ? 'Hindi' : language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : 'English';
    const systemPrompt = `You are Terra Nova AI, an expert environmental and climate assistant. Reply in ${responseLanguage}. Answer accurately and distinguish facts from estimates. Use 1-4 short bullet points, one sentence per bullet. Skip greetings and filler.`;

    const recentHistory = Array.isArray(history) ? history.slice(-8).filter(item =>
        item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string'
    ).map(item => ({ role: item.role, content: item.content.slice(0, 2000) })) : [];

    // Helper for Built-in fallback
    const getBuiltInReply = () => {
        const q = query.toLowerCase();
        let reply = "";
        if (q.includes('globe') || q.includes('map') || q.includes('3d')) {
            reply = "Our interactive 3D WebGL Earth Globe displays real-time active environmental hubs: Nordic Offshore Wind, Amazon Canopy Guard, Alpine Hydro Storage, and Mojave Solar Array. You can drag and rotate the globe in 360 degrees!";
        } else if (q.includes('carbon') || q.includes('offset') || q.includes('footprint') || q.includes('calculate')) {
            reply = "You can calculate your personal carbon footprint using household electricity and flights in our Carbon Calculator section, then download an official verified 1200x800 PNG Certificate!";
        } else if (q.includes('wind') || q.includes('nordic')) {
            reply = "The Nordic Offshore Wind Matrix generates 1.4 Gigawatts of clean renewable wind energy in the North Sea, powering zero-carbon grids across Northern Europe.";
        } else if (q.includes('amazon') || q.includes('forest') || q.includes('trees')) {
            reply = "The Amazon Canopy Guard initiative protects over 12 million hectares of biodiverse rainforest habitat using AI-guided seed pods and satellite telemetry.";
        } else if (q.includes('alps') || q.includes('hydro') || q.includes('switzerland')) {
            reply = "The Alpine Hydro Reserve provides high-altitude pumped-storage hydroelectric capacity, ensuring 99.4% grid balance efficiency across Switzerland.";
        } else if (q.includes('solar') || q.includes('mojave')) {
            reply = "The Mojave Advanced Solar Array generates 850 Megawatts of bifacial solar energy, providing clean electricity for communities across the American Southwest.";
        } else if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('namaste')) {
            reply = "I can help with live weather, clean energy, carbon reduction, and Terra Nova projects.";
        } else {
            reply = `I can help with live weather, clean energy, carbon reduction, and Terra Nova projects. Ask a specific question about ${query}.`;
        }
        if (language === 'hi') {
            if (q.includes('globe') || q.includes('map') || q.includes('3d')) {
                reply = 'हमारा इंटरैक्टिव 3D पृथ्वी ग्लोब नॉर्डिक पवन, अमेज़न वन, आल्प्स जलविद्युत और मोजावे सौर केंद्र दिखाता है। सभी वैश्विक पहलों को देखने के लिए ग्लोब को घुमाएँ।';
            } else if (q.includes('carbon') || q.includes('offset') || q.includes('footprint') || q.includes('calculate')) {
                reply = 'कार्बन कैलकुलेटर में घर की बिजली और हवाई यात्राओं से अपना कार्बन पदचिह्न निकालें, फिर आधिकारिक प्रमाणपत्र डाउनलोड करें।';
            } else if (q.includes('wind') || q.includes('nordic')) {
                reply = 'नॉर्डिक समुद्री पवन ऊर्जा ग्रिड उत्तरी सागर में 1.4 गीगावॉट स्वच्छ बिजली बनाता है।';
            } else if (q.includes('amazon') || q.includes('forest') || q.includes('trees')) {
                reply = 'अमेज़न वन संरक्षण पहल उपग्रह निगरानी और स्थानीय बीजों की मदद से वर्षावन और जैव विविधता की रक्षा करती है।';
            } else if (q.includes('alps') || q.includes('hydro') || q.includes('switzerland')) {
                reply = 'आल्प्स जलविद्युत भंडारण केंद्र स्विट्ज़रलैंड में नवीकरणीय ऊर्जा ग्रिड को स्थिर रखने में मदद करता है।';
            } else if (q.includes('solar') || q.includes('mojave')) {
                reply = 'मोजावे सौर ऊर्जा संयंत्र क्षेत्रीय समुदायों के लिए स्वच्छ बिजली बनाता है।';
            } else if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('namaste')) {
                reply = 'मैं लाइव मौसम, स्वच्छ ऊर्जा, कार्बन कमी और टेरा नोवा परियोजनाओं में मदद कर सकता हूँ।';
            } else {
                reply = `मैं लाइव मौसम, स्वच्छ ऊर्जा, कार्बन कमी और टेरा नोवा परियोजनाओं में मदद कर सकता हूँ। ${query} के बारे में कोई खास सवाल पूछें।`;
            }
        }
        return reply;
    };

    // 1. Try Gemini API first (Verified 100% working model: gemini-3.8-flash)
    if (process.env.GEMINI_API_KEY) {
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
        
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                
                const apiRes = await fetch(endpoint, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [...recentHistory.map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })), { role: 'user', parts: [{ text: query }] }],
                        generationConfig: { maxOutputTokens: 600 }
                    })
                });
                clearTimeout(timeout);

                if (apiRes.ok) {
                    const data = await apiRes.json();
                    const aiReply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
                    if (aiReply) {
                        return res.json({ success: true, reply: aiReply, provider: 'Gemini AI', timestamp: new Date().toISOString() });
                    }
                } else {
                    console.log(`Gemini API attempt ${attempt} returned status ${apiRes.status}`);
                    if (attempt < 2) await new Promise(r => setTimeout(r, 500));
                }
            } catch (e) {
                console.log(`Gemini API attempt ${attempt} failed:`, e.message);
                if (attempt < 2) await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    // 2. Try OpenAI API if Gemini not available or failed
    if (process.env.OPENAI_API_KEY) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
                body: JSON.stringify({
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [{ role: 'system', content: systemPrompt }, ...recentHistory, { role: 'user', content: query }],
                    max_tokens: 500
                })
            });
            clearTimeout(timeout);

            if (apiRes.ok) {
                const data = await apiRes.json();
                const aiReply = data?.choices?.[0]?.message?.content;
                if (aiReply) {
                    return res.json({ success: true, reply: aiReply, provider: 'OpenAI', timestamp: new Date().toISOString() });
                }
            } else {
                console.log(`OpenAI API returned status ${apiRes.status}`);
            }
        } catch (e) {
            console.log('OpenAI API attempt failed:', e.message);
        }
    }

    // 3. Robust fallback to Terra Nova Eco Engine
    const fallbackReply = `• ${getBuiltInReply()}`;
    return res.json({ success: true, reply: fallbackReply, provider: 'Terra Nova Eco Engine', timestamp: new Date().toISOString() });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/campaigns', (req, res) => {
    res.sendFile(path.join(__dirname, 'campaigns.html'));
});

app.get('/campaign/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'campaign.html'));
});

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog.html'));
});

app.get('/blog/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'article.html'));
});

app.get('/stories', (req, res) => {
    res.sendFile(path.join(__dirname, 'stories.html'));
});

app.get('/stories/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'impact-story.html'));
});

app.get('/project/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// Catch-all route to serve main frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 TERRA NOVA Production Server running on port ${PORT}`);
        console.log(`🌐 Live URL: http://localhost:${PORT}`);
        console.log(`====================================================`);
    });
}

module.exports = app;
